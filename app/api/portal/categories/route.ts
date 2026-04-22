import { NextResponse } from "next/server";
import { db } from "@/src/db";

// GET /api/portal/categories — list all categories
export async function GET() {
  try {
    const rows = await db.query(
      `SELECT id, name FROM categories ORDER BY name ASC`
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error("[GET /api/portal/categories]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/portal/categories — create a new category
export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const row = await db.queryOne(
      `INSERT INTO categories (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name`,
      [name.trim()]
    );

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error("[POST /api/portal/categories]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
