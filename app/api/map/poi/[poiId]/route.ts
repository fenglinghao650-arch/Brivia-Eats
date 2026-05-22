import { NextResponse } from "next/server";
import { CITIES, getCityById } from "@/src/data/cities";
import { poiDetail, AmapWebServiceError } from "@/src/lib/amap-web-service";
import { translateAmapPois } from "@/src/lib/amap-translation";
import {
  amapPoiToMapRestaurant,
  cachedAmapRowToMapRestaurant,
  upsertAmapPois,
} from "@/src/lib/map-restaurants";
import { db } from "@/src/db";

type CachedRow = {
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
  translation_status: string;
};

type Params = { params: Promise<{ poiId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { poiId } = await params;
  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get("cityId") ?? "hangzhou";
  const city = getCityById(cityId) ?? CITIES[0];

  // 1. Return immediately if already translated
  try {
    const existing = await db.queryOne<CachedRow>(
      `SELECT amap_poi_id, city, name_native, name_en, address_native, address_en,
              geo_lat, geo_lng, tel, type, typecode, business_area, rating, cost,
              opentime_today, opentime_week, tag_native, tag_en, photo_url, photos,
              matched_restaurant_id, translation_status
       FROM amap_restaurant_pois
       WHERE amap_poi_id = $1`,
      [poiId]
    );
    if (existing?.translation_status === "translated") {
      return NextResponse.json({ restaurant: cachedAmapRowToMapRestaurant(existing) });
    }
  } catch {
    // DB miss — continue to live fetch
  }

  // 2. Fetch full POI detail from AMap
  let poi;
  try {
    poi = await poiDetail(poiId);
  } catch (err) {
    const msg =
      err instanceof AmapWebServiceError
        ? err.infocode
          ? `AMap failed (${err.infocode}): ${err.message}`
          : err.message
        : err instanceof Error
          ? err.message
          : "AMap request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (!poi) {
    return NextResponse.json({ error: "POI not found" }, { status: 404 });
  }

  // 3. Translate
  const translations = await translateAmapPois([poi]);

  // 4. Save permanently (non-blocking)
  void upsertAmapPois(city.name_en, [poi], translations, new Set()).catch((err) =>
    console.error("[api/map/poi] upsert failed", err)
  );

  // 5. Return enriched restaurant
  const translation = translations[poi.poi_id];
  return NextResponse.json({
    restaurant: amapPoiToMapRestaurant(city.name_en, poi, translation),
  });
}
