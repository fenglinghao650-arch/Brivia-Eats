import { NextResponse } from "next/server";
import { CITIES, getCityById } from "@/src/data/cities";
import { restaurantPoiSearchByCity, restaurantPoiSearchByBounds, AmapWebServiceError } from "@/src/lib/amap-web-service";
import { translateAmapPois } from "@/src/lib/amap-translation";
import {
  amapPoiToMapRestaurant,
  filterAmapOnlyPois,
  getFreshCachedAmapPois,
  getPublishedBriviaMapRestaurants,
  sortAmapPoisForDiscovery,
  upsertAmapPois,
} from "@/src/lib/map-restaurants";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get("cityId") ?? "hangzhou";
  const refresh = searchParams.get("refresh") === "1";
  const city = getCityById(cityId) ?? CITIES[0];
  const pageSize = Math.min(Math.max(Number(searchParams.get("limit") ?? 25), 1), 25);
  const pages = Math.min(Math.max(Number(searchParams.get("pages") ?? 1), 1), 3);
  const minAmapResults = Math.min(Math.max(Number(searchParams.get("minAmap") ?? 48), 0), 80);
  const maxAmapResults = Math.min(Math.max(Number(searchParams.get("maxAmap") ?? 60), 1), 120);
  const translateLimit = Math.min(Math.max(Number(searchParams.get("translateLimit") ?? 0), 0), 30);
  const keywordDepth = Math.min(Math.max(Number(searchParams.get("keywordDepth") ?? 3), 1), 6);

  // Viewport bounds — when present, fetch POIs for the visible area only
  const swLat = Number(searchParams.get("swLat"));
  const swLng = Number(searchParams.get("swLng"));
  const neLat = Number(searchParams.get("neLat"));
  const neLng = Number(searchParams.get("neLng"));
  const hasBounds =
    Number.isFinite(swLat) && Number.isFinite(swLng) &&
    Number.isFinite(neLat) && Number.isFinite(neLng) &&
    searchParams.has("swLat");

  try {
    const briviaRestaurants = await withRetry(() =>
      getPublishedBriviaMapRestaurants(city.name_en)
    );
    const warnings: string[] = [];
    let amapRestaurants: ReturnType<typeof amapPoiToMapRestaurant>[] = [];

    if (hasBounds) {
      // Viewport-based fetch — fetch 2 pages in parallel for better coverage
      try {
        const [page1, page2] = await Promise.all([
          restaurantPoiSearchByBounds(swLng, swLat, neLng, neLat, pageSize, 1),
          restaurantPoiSearchByBounds(swLng, swLat, neLng, neLat, pageSize, 2),
        ]);
        const deduped = dedupeByPoiId([...page1, ...page2]);
        const amapOnlyPois = sortAmapPoisForDiscovery(
          filterAmapOnlyPois(deduped, briviaRestaurants)
        );
        amapRestaurants = amapOnlyPois.map((poi) =>
          amapPoiToMapRestaurant(city.name_en, poi, undefined)
        );
      } catch (err) {
        if (err instanceof AmapWebServiceError) {
          warnings.push(
            err.infocode
              ? `AMap request failed (${err.infocode}): ${err.message}`
              : `AMap request failed: ${err.message}`
          );
        } else if (err instanceof Error) {
          warnings.push(err.message);
        }
      }
    } else {
      // City-level discovery — uses cache + keyword loop
      const cachedRestaurants = refresh
        ? []
        : (await getFreshCachedAmapPois(city.name_en)).slice(0, maxAmapResults);

      if (cachedRestaurants.length >= minAmapResults) {
        amapRestaurants = cachedRestaurants;
      } else {
        try {
          const keywords = getRestaurantDiscoveryKeywords(city.id).slice(0, keywordDepth);
          const { pois, warnings: discoveryWarnings } = await fetchDiscoveryPois({
            cityNameZh: city.name_zh,
            keywords,
            pages,
            pageSize,
          });
          warnings.push(...discoveryWarnings);
          const amapOnlyPois = sortAmapPoisForDiscovery(
            filterAmapOnlyPois(pois, briviaRestaurants)
          ).slice(0, maxAmapResults);
          const poisToTranslate = amapOnlyPois.slice(0, translateLimit);
          const translations = await translateAmapPois(poisToTranslate);
          amapRestaurants = amapOnlyPois.map((poi) =>
            amapPoiToMapRestaurant(city.name_en, poi, translations[poi.poi_id])
          );
          const matchedIds = new Set(
            briviaRestaurants
              .map((restaurant) => restaurant.amap_poi_id)
              .filter((id): id is string => Boolean(id))
          );
          void upsertAmapPois(city.name_en, amapOnlyPois, translations, matchedIds).catch(
            (cacheErr) => {
              console.error("[api/map/restaurants] AMap cache write failed", cacheErr);
            }
          );
        } catch (err) {
          if (err instanceof AmapWebServiceError) {
            warnings.push(
              err.infocode
                ? `AMap request failed (${err.infocode}): ${err.message}`
                : `AMap request failed: ${err.message}`
            );
          } else if (err instanceof Error) {
            warnings.push(err.message);
          } else {
            warnings.push("AMap request failed");
          }
        }
      }
    }

    return NextResponse.json({
      city,
      restaurants: [...briviaRestaurants, ...amapRestaurants],
      warnings,
    });
  } catch (err) {
    console.error("[GET /api/map/restaurants]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) await delay(600);
    }
  }
  throw lastErr;
}

async function fetchDiscoveryPois({
  cityNameZh,
  keywords,
  pages,
  pageSize,
}: {
  cityNameZh: string;
  keywords: string[];
  pages: number;
  pageSize: number;
}): Promise<{ pois: Awaited<ReturnType<typeof restaurantPoiSearchByCity>>; warnings: string[] }> {
  const pois: Awaited<ReturnType<typeof restaurantPoiSearchByCity>> = [];
  const warnings: string[] = [];

  for (const keyword of keywords) {
    for (let page = 1; page <= pages; page += 1) {
      try {
        pois.push(...(await fetchDiscoveryPage(cityNameZh, pageSize, page, keyword)));
      } catch (err) {
        warnings.push(formatAmapDiscoveryWarning(keyword, err));
      }
      await delay(300);
    }
  }

  return { pois: dedupePois(pois), warnings };
}

async function fetchDiscoveryPage(
  cityNameZh: string,
  pageSize: number,
  page: number,
  keyword: string
): Promise<Awaited<ReturnType<typeof restaurantPoiSearchByCity>>> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await restaurantPoiSearchByCity(cityNameZh, pageSize, page, keyword);
    } catch (err) {
      lastErr = err;
      if (attempt < 2) {
        const retryDelay =
          err instanceof AmapWebServiceError && err.infocode === "10021" ? 900 : 700;
        await delay(retryDelay);
      }
    }
  }
  throw lastErr;
}

function formatAmapDiscoveryWarning(keyword: string, err: unknown): string {
  if (err instanceof AmapWebServiceError) {
    return err.infocode
      ? `AMap "${keyword}" failed (${err.infocode}): ${err.message}`
      : `AMap "${keyword}" failed: ${err.message}`;
  }
  return err instanceof Error
    ? `AMap "${keyword}" failed: ${err.message}`
    : `AMap "${keyword}" failed`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRestaurantDiscoveryKeywords(cityId: string): string[] {
  const byCity: Record<string, string[]> = {
    hangzhou: ["杭帮菜", "杭州菜", "餐厅"],
    shanghai: ["本帮菜", "上海菜", "小笼包"],
    beijing: ["北京菜", "烤鸭", "餐厅"],
    guangzhou: ["粤菜", "早茶", "茶餐厅"],
    chengdu: ["川菜", "火锅", "小吃"],
    chongqing: ["重庆火锅", "小面", "川菜"],
  };
  return byCity[cityId] ?? ["餐厅", "饭店", "小吃"];
}

function dedupePois<T extends { poi_id: string }>(pois: T[]): T[] {
  const seen = new Set<string>();
  return pois.filter((poi) => {
    if (seen.has(poi.poi_id)) return false;
    seen.add(poi.poi_id);
    return true;
  });
}

const dedupeByPoiId = dedupePois;
