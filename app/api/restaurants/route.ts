import { NextResponse } from "next/server";
import { db } from "@/src/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");

    const rows = await db.query(
      `SELECT
        r.id, r.name_native, r.name_en, r.city, r.address_native,
        r.cuisine_tags, r.tagline_en, r.about_short_en,
        r.geo_lat, r.geo_lng, r.main_menu_id,
        m.url AS cover_photo_url,
        c.name AS category_name
       FROM restaurants r
       JOIN published_menus pm ON pm.restaurant_id = r.id
       LEFT JOIN media m ON m.id = r.cover_media_id
       LEFT JOIN categories c ON c.id = r.category_id
       WHERE r.status = 'active'
         ${city ? "AND LOWER(r.city) = LOWER($1)" : ""}
       ORDER BY r.created_at DESC`,
      city ? [city] : []
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error("[GET /api/restaurants]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
