import { NextResponse } from "next/server";
import { db } from "@/src/db";

// Pre-seeded list of major Chinese cities (English names)
const PRESET_CITIES = [
  "Beijing",
  "Chengdu",
  "Chongqing",
  "Fuzhou",
  "Guangzhou",
  "Guilin",
  "Hangzhou",
  "Kunming",
  "Nanjing",
  "Qingdao",
  "Shanghai",
  "Shenzhen",
  "Suzhou",
  "Tianjin",
  "Wuhan",
  "Xi'an",
  "Xiamen",
  "Yangshuo",
];

// GET /api/portal/cities — merged list of preset cities + any custom ones in the DB
export async function GET() {
  try {
    const rows = await db.query(
      `SELECT DISTINCT city FROM restaurants
       WHERE city IS NOT NULL AND city <> ''`
    );
    const dbCities = rows.map((r) => r.city as string);

    // Merge preset + DB, deduplicate, sort
    const merged = Array.from(new Set([...PRESET_CITIES, ...dbCities])).sort();
    return NextResponse.json(merged);
  } catch (err) {
    console.error("[GET /api/portal/cities]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
