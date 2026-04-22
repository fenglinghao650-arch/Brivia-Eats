import { NextResponse } from "next/server";
import { db } from "@/src/db";

// GET /api/portal/restaurants — all restaurants including unpublished
export async function GET() {
  try {
    const rows = await db.query(`
      SELECT
        r.id, r.name_native, r.name_en, r.city, r.cuisine_tags,
        r.status, r.created_at,
        m.id AS menu_id, m.status AS menu_status, m.review_status AS menu_review_status,
        COUNT(d.id)::int AS total_dishes,
        COUNT(d.id) FILTER (WHERE d.review_status = 'approved')::int AS approved_dishes,
        pm.current_snapshot_id IS NOT NULL AS is_published
      FROM restaurants r
      LEFT JOIN menus m ON m.restaurant_id = r.id AND m.id = r.main_menu_id
      LEFT JOIN dishes d ON d.menu_id = m.id
      LEFT JOIN published_menus pm ON pm.restaurant_id = r.id
      GROUP BY r.id, m.id, pm.current_snapshot_id
      ORDER BY r.created_at DESC
    `);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("[GET /api/portal/restaurants]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
