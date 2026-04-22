import { NextResponse } from "next/server";
import { db } from "@/src/db";

// GET /api/portal/restaurants/[id] — restaurant + all dishes grouped by section
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const restaurant = await db.queryOne(
      `SELECT r.id, r.name_native, r.name_en, r.city, r.area,
              r.address_native, r.address_en,
              r.phone, r.hours_text, r.tagline_en,
              r.cuisine_tags, r.about_short_en,
              r.geo_lat, r.geo_lng,
              r.main_menu_id, r.status,
              r.poi_external_ids,
              r.category_id,
              m.url AS cover_photo_url
       FROM restaurants r
       LEFT JOIN media m ON m.id = r.cover_media_id
       WHERE r.id = $1`,
      [id]
    );
    if (restaurant) {
      // Hoist crop_position out of poi_external_ids JSONB
      const poi = (restaurant.poi_external_ids as Record<string, string>) ?? {};
      restaurant.crop_position = poi.crop_position ?? null;
    }
    if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const menu = await db.queryOne(
      `SELECT id, title_native, title_en, sections, status, review_status
       FROM menus WHERE id = $1`,
      [restaurant.main_menu_id]
    );

    const dishes = await db.query(
      `SELECT id, native_name, romanized_name, clarity_name_en, one_line_story_en,
              price, currency, spice_level, allergens, dietary_flags, cooking_methods,
              status, review_status, ai_status, allergen_confidence, dietary_confidence
       FROM dishes WHERE menu_id = $1
       ORDER BY created_at`,
      [menu?.id]
    );

    return NextResponse.json({ restaurant, menu, dishes });
  } catch (err) {
    console.error("[GET /api/portal/restaurants/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/portal/restaurants/[id] — update editable restaurant fields
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const allowed = [
      "name_native", "name_en", "address_en", "tagline_en", "about_short_en",
      "cuisine_tags", "phone", "hours_text", "geo_lat", "geo_lng",
    ];
    const numericFields = new Set(["geo_lat", "geo_lng"]);
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const key of allowed) {
      if (key in body) {
        updates.push(`${key} = $${values.length + 1}`);
        // Empty strings must become null for numeric columns
        const val = body[key];
        values.push(numericFields.has(key) && val === "" ? null : val);
      }
    }
    if (updates.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    values.push(id);
    const row = await db.queryOne(
      `UPDATE restaurants SET ${updates.join(", ")}, updated_at = now()
       WHERE id = $${values.length} RETURNING id`,
      values
    );
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/portal/restaurants/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
