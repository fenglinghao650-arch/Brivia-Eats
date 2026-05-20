import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { poiSearch, poiDetail, AmapWebServiceError } from "@/src/lib/amap-web-service";
import { CITIES } from "@/src/data/cities";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/portal/restaurants/[id]/amap-enrich
 *
 * Two modes:
 *   { mode: "search" }
 *     Searches AMap using the restaurant's name_native + city.
 *     Returns up to 10 POI candidates. No DB write.
 *
 *   { mode: "apply", poi_id: "<amap-poi-id>" }
 *     Fetches full POI detail and writes enrichment to the restaurant:
 *       - geo_lat, geo_lng, geo_provider = 'gaode'
 *       - poi_external_ids.gaode (rating, cost, opentime, tag, photos, enriched_at)
 *       - hours_text (only if currently empty)
 *     Writes a change_logs entry.
 */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  const restaurant = await db.queryOne<{
    id: string;
    name_native: string;
    city: string;
    hours_text: string | null;
    phone: string | null;
    poi_external_ids: Record<string, unknown>;
    geo_lat: number | null;
    geo_lng: number | null;
  }>(
    `SELECT id, name_native, city, hours_text, phone, poi_external_ids, geo_lat, geo_lng
     FROM restaurants WHERE id = $1`,
    [id]
  );
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode = body.mode as string;

  // ── Search mode ────────────────────────────────────────────────────────────
  if (mode === "search") {
    try {
      const city = CITIES.find(
        (item) =>
          item.name_en.toLowerCase() === restaurant.city.toLowerCase() ||
          item.name_zh === restaurant.city
      );
      const candidates = await poiSearch(restaurant.name_native, city?.name_zh ?? restaurant.city);
      return NextResponse.json({ candidates });
    } catch (err) {
      console.error("[amap-enrich search]", err);
      return NextResponse.json({ error: formatAmapError(err) }, { status: 502 });
    }
  }

  // ── Apply mode ─────────────────────────────────────────────────────────────
  if (mode === "apply") {
    const poiId = body.poi_id as string | undefined;
    if (!poiId) {
      return NextResponse.json({ error: "poi_id is required for apply mode" }, { status: 400 });
    }

    let poi;
    try {
      poi = await poiDetail(poiId);
    } catch (err) {
      console.error("[amap-enrich apply]", err);
      return NextResponse.json({ error: formatAmapError(err) }, { status: 502 });
    }
    if (!poi) {
      return NextResponse.json({ error: "POI not found on AMap" }, { status: 404 });
    }
    if (!poi.typecode.startsWith("05")) {
      return NextResponse.json(
        { error: "Selected AMap POI is not a dining POI" },
        { status: 400 }
      );
    }
    if (poi.geo_lat == null || poi.geo_lng == null) {
      return NextResponse.json(
        { error: "Selected AMap POI does not include coordinates" },
        { status: 400 }
      );
    }

    const beforeSnapshot = {
      geo_lat: restaurant.geo_lat,
      geo_lng: restaurant.geo_lng,
      phone: restaurant.phone,
      hours_text: restaurant.hours_text,
      poi_external_ids: restaurant.poi_external_ids,
    };

    const gaodeData = {
      poi_id: poi.poi_id,
      name: poi.name,
      address: poi.address,
      tel: poi.tel ?? null,
      type: poi.type,
      typecode: poi.typecode,
      adcode: poi.adcode ?? null,
      rating: poi.rating ?? null,
      cost: poi.cost ?? null,
      opentime_today: poi.opentime_today ?? null,
      opentime_week: poi.opentime_week ?? null,
      business_area: poi.business_area ?? null,
      tag: poi.tag ?? null,
      photos: poi.photos ?? [],
      enriched_at: new Date().toISOString(),
    };

    const updatedPoiIds = {
      ...(restaurant.poi_external_ids ?? {}),
      gaode: gaodeData,
    };

    // Only overwrite hours_text if the restaurant has none
    const newHoursText =
      !restaurant.hours_text && poi.opentime_week
        ? poi.opentime_week
        : restaurant.hours_text;
    const newPhone = !restaurant.phone && poi.tel ? poi.tel : restaurant.phone;

    await db.transaction(async (tx) => {
      await tx.execute(
        `UPDATE restaurants
         SET geo_lat = $1,
             geo_lng = $2,
             geo_provider = 'gaode',
             poi_external_ids = $3,
             hours_text = $4,
             phone = $5,
             updated_at = now()
         WHERE id = $6`,
        [poi.geo_lat, poi.geo_lng, JSON.stringify(updatedPoiIds), newHoursText, newPhone, id]
      );

      await tx.execute(
        `INSERT INTO change_logs
           (entity_type, entity_id, changed_by, changed_fields, before_snapshot, after_snapshot, reason)
         VALUES ('restaurant', $1, NULL, $2, $3, $4, $5)`,
        [
          id,
          ["geo_lat", "geo_lng", "geo_provider", "poi_external_ids", "hours_text", "phone"],
          JSON.stringify(beforeSnapshot),
          JSON.stringify({
            geo_lat: poi.geo_lat,
            geo_lng: poi.geo_lng,
            geo_provider: "gaode",
            poi_external_ids: updatedPoiIds,
            hours_text: newHoursText,
            phone: newPhone,
          }),
          `AMap POI enrichment applied: ${poi.poi_id}`,
        ]
      );
    });

    return NextResponse.json({ ok: true, poi });
  }

  return NextResponse.json({ error: "mode must be 'search' or 'apply'" }, { status: 400 });
}

function formatAmapError(err: unknown): string {
  if (err instanceof AmapWebServiceError) {
    return err.infocode ? `AMap failed (${err.infocode}): ${err.message}` : err.message;
  }
  return err instanceof Error ? err.message : "AMap request failed";
}
