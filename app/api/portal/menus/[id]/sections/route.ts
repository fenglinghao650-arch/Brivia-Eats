import { NextResponse } from "next/server";
import { db } from "@/src/db";

// PATCH /api/portal/menus/[id]/sections — update sections JSONB (dish_ids arrays after drag-and-drop)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: menuId } = await params;
  try {
    const { sections } = await req.json();
    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: "sections must be an array" }, { status: 400 });
    }

    await db.execute(
      `UPDATE menus SET sections = $1, updated_at = now() WHERE id = $2`,
      [JSON.stringify(sections), menuId]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[PATCH /api/portal/menus/[id]/sections]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
