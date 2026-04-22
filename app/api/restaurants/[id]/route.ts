import { NextResponse } from "next/server";
import { db } from "@/src/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const row = await db.queryOne(`
      SELECT
        r.id, r.name_native, r.name_en, r.city,
        r.address_native, r.address_en,
        r.cuisine_tags, r.tagline_en, r.about_short_en,
        r.hours_text,
        r.geo_lat, r.geo_lng, r.main_menu_id,
        r.poi_external_ids,
        m.url AS cover_photo_url
      FROM restaurants r
      LEFT JOIN media m ON m.id = r.cover_media_id
      WHERE r.id = $1
    `, [id]);

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Hoist crop_position out of poi_external_ids
    const poi = (row.poi_external_ids as Record<string, string>) ?? {};
    row.crop_position = poi.crop_position ?? "50";

    return NextResponse.json(row);
  } catch (err) {
    console.error("[GET /api/restaurants/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
