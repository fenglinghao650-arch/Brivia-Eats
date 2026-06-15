import { NextResponse } from "next/server";
import { db } from "@/src/db";

// GET /api/portal/restaurants/[id]/versions
// List all saved menu versions (snapshots) for the restaurant, newest first,
// flagging which one is currently live.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const versions = await db.query(
      `SELECT ms.id, ms.version, ms.label, ms.published_at,
              (pm.current_snapshot_id = ms.id) AS is_current,
              (SELECT COUNT(*) FROM dish_snapshots ds WHERE ds.menu_snapshot_id = ms.id)::int AS dish_count
       FROM menu_snapshots ms
       LEFT JOIN published_menus pm ON pm.restaurant_id = ms.restaurant_id
       WHERE ms.restaurant_id = $1
       ORDER BY ms.version DESC`,
      [id]
    );
    return NextResponse.json({ versions });
  } catch (err) {
    console.error("[GET /api/portal/restaurants/[id]/versions]", err);
    return NextResponse.json({ error: "Failed to load versions" }, { status: 500 });
  }
}

// POST /api/portal/restaurants/[id]/versions  { snapshotId }
// Switch the live menu to a saved version (pointer switch — instant, no data
// change). The QR / menu URL stays the same.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { snapshotId } = await req.json();
    if (!snapshotId) {
      return NextResponse.json({ error: "snapshotId is required" }, { status: 400 });
    }
    const snap = await db.queryOne<{ id: string; menu_id: string; version: number }>(
      `SELECT id, menu_id, version FROM menu_snapshots WHERE id = $1 AND restaurant_id = $2`,
      [snapshotId, id]
    );
    if (!snap) {
      return NextResponse.json({ error: "Version not found for this restaurant" }, { status: 404 });
    }
    await db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO published_menus (restaurant_id, current_snapshot_id, published_at)
         VALUES ($1, $2, now())
         ON CONFLICT (restaurant_id) DO UPDATE
           SET current_snapshot_id = $2, published_at = now()`,
        [id, snapshotId]
      );
      await tx.execute(
        `INSERT INTO change_logs (entity_type, entity_id, changed_fields, reason)
         VALUES ('menu', $1, $2, $3)`,
        [snap.menu_id, ["current_snapshot_id"], `Switched live menu to version ${snap.version} via portal`]
      );
    });
    return NextResponse.json({ ok: true, version: snap.version });
  } catch (err) {
    console.error("[POST /api/portal/restaurants/[id]/versions]", err);
    return NextResponse.json({ error: "Failed to switch version" }, { status: 500 });
  }
}

// PATCH /api/portal/restaurants/[id]/versions  { snapshotId, label }
// Rename a saved version.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { snapshotId, label } = await req.json();
    if (!snapshotId) {
      return NextResponse.json({ error: "snapshotId is required" }, { status: 400 });
    }
    const clean = typeof label === "string" && label.trim() ? label.trim() : null;
    const updated = await db.query(
      `UPDATE menu_snapshots SET label = $1 WHERE id = $2 AND restaurant_id = $3 RETURNING id`,
      [clean, snapshotId, id]
    );
    if (!updated.length) {
      return NextResponse.json({ error: "Version not found for this restaurant" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/portal/restaurants/[id]/versions]", err);
    return NextResponse.json({ error: "Failed to rename version" }, { status: 500 });
  }
}
