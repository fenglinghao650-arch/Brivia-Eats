import { NextResponse } from "next/server";
import { db } from "@/src/db";

// PATCH /api/portal/restaurants/[id]/city-category — update city and/or category_id
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: restaurantId } = await params;
  try {
    const body = await req.json();
    const { city, category_id } = body as {
      city?: string;
      category_id?: string | null;
    };

    const updates: string[] = [];
    const values: unknown[] = [];

    if (city !== undefined) {
      updates.push(`city = $${values.length + 1}`);
      values.push(city.trim() || null);
    }

    if (category_id !== undefined) {
      updates.push(`category_id = $${values.length + 1}`);
      values.push(category_id || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push(`updated_at = now()`);
    values.push(restaurantId);

    await db.execute(
      `UPDATE restaurants SET ${updates.join(", ")} WHERE id = $${values.length}`,
      values
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/portal/restaurants/[id]/city-category]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
