import { db } from "@/src/db";
import {
  isAmapRestaurantPrimaryType,
  type AmapPoi,
} from "@/src/lib/amap-web-service";
import type { AmapPoiTranslation } from "@/src/lib/amap-translation";

export type MapRestaurant = {
  source: "brivia" | "amap";
  id: string;
  amap_poi_id?: string;
  name_native: string;
  name_en: string;
  address_native: string;
  address_en: string;
  city: string;
  cuisine_tags: string[];
  category_name: string | null;
  tagline_en: string;
  about_short_en: string;
  geo_lat: number | null;
  geo_lng: number | null;
  phone: string | null;
  opening_hours: string | null;
  rating: string | null;
  cost: string | null;
  business_area: string | null;
  tags_native: string[];
  tags_en: string[];
  cover_photo_url: string | null;
  photo_urls: string[];
  main_menu_id: string | null;
  has_menu: boolean;
};

type BriviaRestaurantRow = {
  id: string;
  name_native: string;
  name_en: string | null;
  city: string;
  address_native: string;
  address_en: string | null;
  cuisine_tags: string[];
  tagline_en: string | null;
  about_short_en: string;
  geo_lat: string | number | null;
  geo_lng: string | number | null;
  phone: string | null;
  hours_text: string | null;
  main_menu_id: string | null;
  cover_photo_url: string | null;
  category_name: string | null;
  poi_external_ids: Record<string, unknown> | null;
};

type CachedAmapPoiRow = {
  amap_poi_id: string;
  city: string;
  name_native: string;
  name_en: string | null;
  address_native: string | null;
  address_en: string | null;
  geo_lat: string | number | null;
  geo_lng: string | number | null;
  tel: string | null;
  type: string | null;
  typecode: string | null;
  business_area: string | null;
  rating: string | null;
  cost: string | null;
  opentime_today: string | null;
  opentime_week: string | null;
  tag_native: string | null;
  tag_en: string | null;
  photo_url: string | null;
  photos: { title?: string; url?: string }[] | null;
  matched_restaurant_id: string | null;
};

export async function getPublishedBriviaMapRestaurants(city: string): Promise<MapRestaurant[]> {
  const rows = await db.query<BriviaRestaurantRow>(
    `SELECT
      r.id, r.name_native, r.name_en, r.city, r.address_native, r.address_en,
      r.cuisine_tags, r.tagline_en, r.about_short_en, r.geo_lat, r.geo_lng,
      r.phone, r.hours_text, r.main_menu_id, r.poi_external_ids,
      m.url AS cover_photo_url,
      c.name AS category_name
     FROM restaurants r
     JOIN published_menus pm ON pm.restaurant_id = r.id
     LEFT JOIN media m ON m.id = r.cover_media_id
     LEFT JOIN categories c ON c.id = r.category_id
     WHERE r.status = 'active'
       AND LOWER(r.city) = LOWER($1)
     ORDER BY r.created_at DESC`,
    [city]
  );

  return rows.map((row) => ({
    source: "brivia",
    id: row.id,
    amap_poi_id: readGaodePoiId(row.poi_external_ids),
    name_native: row.name_native,
    name_en: row.name_en ?? row.name_native,
    address_native: row.address_native,
    address_en: row.address_en ?? row.address_native,
    city: row.city,
    cuisine_tags: row.cuisine_tags ?? [],
    category_name: row.category_name,
    tagline_en: row.tagline_en ?? "",
    about_short_en: row.about_short_en,
    geo_lat: numberOrNull(row.geo_lat),
    geo_lng: numberOrNull(row.geo_lng),
    phone: row.phone,
    opening_hours: row.hours_text,
    rating: null,
    cost: null,
    business_area: null,
    tags_native: [],
    tags_en: [],
    cover_photo_url: row.cover_photo_url,
    photo_urls: row.cover_photo_url ? [row.cover_photo_url] : [],
    main_menu_id: row.main_menu_id,
    has_menu: Boolean(row.main_menu_id),
  }));
}

export async function getFreshCachedAmapPois(
  city: string,
  maxAgeHours = 24
): Promise<MapRestaurant[]> {
  try {
    const rows = await db.query<CachedAmapPoiRow>(
      `SELECT amap_poi_id, city, name_native, name_en, address_native, address_en,
              geo_lat, geo_lng, tel, type, typecode, business_area, rating, cost,
              opentime_today, opentime_week, tag_native, tag_en, photo_url, photos,
              matched_restaurant_id
       FROM amap_restaurant_pois
       WHERE LOWER(city) = LOWER($1)
         AND fetched_at > now() - ($2::text || ' hours')::interval
       ORDER BY rating DESC NULLS LAST, fetched_at DESC
       LIMIT 120`,
      [city, String(maxAgeHours)]
    );
    return rows.filter(isLikelyRestaurantPoi).map(cachedAmapRowToMapRestaurant);
  } catch (err) {
    if (isMissingAmapCacheTable(err)) return [];
    throw err;
  }
}

export async function upsertAmapPois(
  city: string,
  pois: AmapPoi[],
  translations: Record<string, AmapPoiTranslation>,
  matchedPoiIds: Set<string>
): Promise<void> {
  try {
    for (const poi of pois) {
      const translation = translations[poi.poi_id];
      const photoUrl = poi.photos?.find((photo) => photo.url)?.url ?? null;
      await db.execute(
        `INSERT INTO amap_restaurant_pois
          (amap_poi_id, city, adcode, name_native, name_en, address_native, address_en,
           geo_lat, geo_lng, tel, type, typecode, business_area, rating, cost,
           opentime_today, opentime_week, tag_native, tag_en, photo_url, photos,
           raw_payload, translation_status, fetched_at, translated_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7,
           $8, $9, $10, $11, $12, $13, $14, $15,
           $16, $17, $18, $19, $20, $21,
           $22, $23, now(), now(), now())
         ON CONFLICT (amap_poi_id) DO UPDATE SET
           city = EXCLUDED.city,
           adcode = EXCLUDED.adcode,
           name_native = EXCLUDED.name_native,
           name_en = EXCLUDED.name_en,
           address_native = EXCLUDED.address_native,
           address_en = EXCLUDED.address_en,
           geo_lat = EXCLUDED.geo_lat,
           geo_lng = EXCLUDED.geo_lng,
           tel = EXCLUDED.tel,
           type = EXCLUDED.type,
           typecode = EXCLUDED.typecode,
           business_area = EXCLUDED.business_area,
           rating = EXCLUDED.rating,
           cost = EXCLUDED.cost,
           opentime_today = EXCLUDED.opentime_today,
           opentime_week = EXCLUDED.opentime_week,
           tag_native = EXCLUDED.tag_native,
           tag_en = EXCLUDED.tag_en,
           photo_url = EXCLUDED.photo_url,
           photos = EXCLUDED.photos,
           raw_payload = EXCLUDED.raw_payload,
           translation_status = EXCLUDED.translation_status,
           fetched_at = now(),
           translated_at = EXCLUDED.translated_at,
           updated_at = now()`,
        [
          poi.poi_id,
          city,
          poi.adcode ?? null,
          poi.name,
          translation?.name_en ?? poi.name,
          poi.address,
          translation?.address_en ?? poi.address,
          poi.geo_lat,
          poi.geo_lng,
          poi.tel ?? null,
          poi.type,
          poi.typecode,
          poi.business_area ?? null,
          poi.rating ?? null,
          poi.cost ?? null,
          poi.opentime_today ?? null,
          poi.opentime_week ?? null,
          poi.tag ?? null,
          translation?.tag_en ?? poi.tag ?? null,
          photoUrl,
          JSON.stringify(poi.photos ?? []),
          JSON.stringify(poi.raw ?? {}),
          translation ? "translated" : "skipped",
        ]
      );
    }

    if (matchedPoiIds.size > 0) {
      await db.execute(
        `UPDATE amap_restaurant_pois
         SET matched_restaurant_id = r.id,
             updated_at = now()
         FROM restaurants r
         WHERE amap_restaurant_pois.amap_poi_id = ANY($1::text[])
           AND (r.poi_external_ids #>> '{gaode,poi_id}') = amap_restaurant_pois.amap_poi_id`,
        [Array.from(matchedPoiIds)]
      );
    }
  } catch (err) {
    if (isMissingAmapCacheTable(err)) return;
    throw err;
  }
}

export function filterAmapOnlyPois(
  pois: AmapPoi[],
  briviaRestaurants: MapRestaurant[]
): AmapPoi[] {
  const briviaPoiIds = new Set(
    briviaRestaurants
      .map((restaurant) => restaurant.amap_poi_id)
      .filter((id): id is string => Boolean(id))
  );
  return pois.filter((poi) => !briviaPoiIds.has(poi.poi_id) && isLikelyRestaurantPoi(poi));
}

export function sortAmapPoisForDiscovery(pois: AmapPoi[]): AmapPoi[] {
  return [...pois].sort((a, b) => scoreAmapPoi(b) - scoreAmapPoi(a));
}

export function isLikelyRestaurantPoi(
  poi: Pick<AmapPoi, "name" | "type" | "typecode" | "geo_lat" | "geo_lng"> |
    Pick<CachedAmapPoiRow, "name_native" | "type" | "typecode" | "geo_lat" | "geo_lng">
): boolean {
  const typecode = poi.typecode ?? "";

  if (numberOrNull(poi.geo_lat) == null || numberOrNull(poi.geo_lng) == null) {
    return false;
  }

  return isAmapRestaurantPrimaryType(typecode);
}

export function amapPoiToMapRestaurant(
  city: string,
  poi: AmapPoi,
  translation?: AmapPoiTranslation
): MapRestaurant {
  const photoUrls = (poi.photos ?? [])
    .map((photo) => photo.url)
    .filter(Boolean);
  const tagNative = splitTags(poi.tag ?? null);
  const tagEn = splitTags(translation?.tag_en ?? poi.tag ?? null);

  return {
    source: "amap",
    id: `amap:${poi.poi_id}`,
    amap_poi_id: poi.poi_id,
    name_native: poi.name,
    name_en: translation?.name_en || poi.name,
    address_native: poi.address,
    address_en: translation?.address_en || poi.address,
    city,
    cuisine_tags: tagEn.length ? tagEn : tagNative,
    category_name: "AMap restaurant",
    tagline_en: tagEn.length ? tagEn.slice(0, 3).join(" · ") : "Restaurant information from AMap",
    about_short_en: "Menu details are not available in Brivia yet.",
    geo_lat: poi.geo_lat,
    geo_lng: poi.geo_lng,
    phone: poi.tel ?? null,
    opening_hours: poi.opentime_today || poi.opentime_week || null,
    rating: poi.rating ?? null,
    cost: poi.cost ?? null,
    business_area: poi.business_area ?? null,
    tags_native: tagNative,
    tags_en: tagEn,
    cover_photo_url: photoUrls[0] ?? null,
    photo_urls: Array.from(new Set(photoUrls)),
    main_menu_id: null,
    has_menu: false,
  };
}

export function cachedAmapRowToMapRestaurant(row: CachedAmapPoiRow): MapRestaurant {
  const photoUrls = [
    row.photo_url,
    ...(row.photos ?? []).map((photo) => photo.url),
  ].filter((url): url is string => Boolean(url));
  const tagNative = splitTags(row.tag_native);
  const tagEn = splitTags(row.tag_en);

  return {
    source: "amap",
    id: `amap:${row.amap_poi_id}`,
    amap_poi_id: row.amap_poi_id,
    name_native: row.name_native,
    name_en: row.name_en || row.name_native,
    address_native: row.address_native ?? "",
    address_en: row.address_en || row.address_native || "",
    city: row.city,
    cuisine_tags: tagEn.length ? tagEn : tagNative,
    category_name: "AMap restaurant",
    tagline_en: tagEn.length ? tagEn.slice(0, 3).join(" · ") : "Restaurant information from AMap",
    about_short_en: "Menu details are not available in Brivia yet.",
    geo_lat: numberOrNull(row.geo_lat),
    geo_lng: numberOrNull(row.geo_lng),
    phone: row.tel,
    opening_hours: row.opentime_today || row.opentime_week,
    rating: row.rating,
    cost: row.cost,
    business_area: row.business_area,
    tags_native: tagNative,
    tags_en: tagEn,
    cover_photo_url: photoUrls[0] ?? null,
    photo_urls: Array.from(new Set(photoUrls)),
    main_menu_id: null,
    has_menu: false,
  };
}

function readGaodePoiId(value: Record<string, unknown> | null): string | undefined {
  const gaode = value?.gaode;
  if (!gaode || typeof gaode !== "object") return undefined;
  const poiId = (gaode as Record<string, unknown>).poi_id;
  return typeof poiId === "string" ? poiId : undefined;
}

function numberOrNull(value: string | number | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function splitTags(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function scoreAmapPoi(poi: AmapPoi): number {
  let score = 0;
  if (poi.rating) score += Number(poi.rating) * 10 || 0;
  if (poi.cost) score += 8;
  if (poi.tel) score += 6;
  if (poi.opentime_today || poi.opentime_week) score += 6;
  if (poi.photos?.length) score += 4;
  if (poi.tag) score += 3;
  return score;
}

function isMissingAmapCacheTable(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "42P01"
  );
}
