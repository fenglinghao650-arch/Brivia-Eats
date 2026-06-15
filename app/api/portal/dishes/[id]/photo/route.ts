import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { getStorageClient, BUCKET, dishPhotoPath } from "@/src/lib/supabase-storage";

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

// Resolve which restaurant a dish belongs to (used for the storage path).
async function getOwner(dishId: string) {
  return db.queryOne<{ restaurant_id: string }>(
    `SELECT m.restaurant_id
     FROM dishes d JOIN menus m ON m.id = d.menu_id
     WHERE d.id = $1`,
    [dishId]
  );
}

// Strip the public-bucket prefix off a stored URL → storage path, or null.
function urlToPath(url: string): string | null {
  const prefix = `/storage/v1/object/public/${BUCKET}/`;
  return url.includes(prefix) ? url.split(prefix)[1] : null;
}

// POST /api/portal/dishes/[id]/photo — upload a dish hero photo
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dishId } = await params;
  try {
    const owner = await getOwner(dishId);
    if (!owner) return NextResponse.json({ error: "Dish not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (!(file.type in EXT_MAP)) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPEG, PNG, WebP, or HEIC." },
        { status: 400 }
      );
    }

    const ext = EXT_MAP[file.type];
    const storagePath = dishPhotoPath(owner.restaurant_id, dishId, ext);
    const supabase = getStorageClient();

    // If an existing photo lives at a different extension, remove that file.
    const existing = await db.queryOne<{ id: string; url: string }>(
      `SELECT id, url FROM media
       WHERE owner_type = 'dish' AND owner_id = $1 AND role = 'dish_hero'`,
      [dishId]
    );
    if (existing?.url) {
      const oldPath = urlToPath(existing.url);
      if (oldPath && oldPath !== storagePath) {
        await supabase.storage.from(BUCKET).remove([oldPath]);
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: true });
    if (uploadError) {
      console.error("[dish photo upload] storage error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    // Upsert the media row, then point the dish at it.
    let mediaId: string;
    if (existing) {
      await db.execute(`UPDATE media SET url = $1, mime_type = $2 WHERE id = $3`, [
        publicUrl,
        file.type,
        existing.id,
      ]);
      mediaId = existing.id;
    } else {
      const row = await db.queryOne<{ id: string }>(
        `INSERT INTO media (owner_type, owner_id, url, mime_type, is_primary, role, status)
         VALUES ('dish', $1, $2, $3, true, 'dish_hero', 'ready')
         RETURNING id`,
        [dishId, publicUrl, file.type]
      );
      mediaId = row!.id;
    }

    // Keep dishes.photo_media_ids in sync (dedup, hero first).
    await db.execute(
      `UPDATE dishes
       SET photo_media_ids = (
             SELECT ARRAY(SELECT DISTINCT e FROM unnest(array_append(photo_media_ids, $1::uuid)) AS e)
           ),
           updated_at = now()
       WHERE id = $2`,
      [mediaId, dishId]
    );

    await db.execute(
      `INSERT INTO change_logs (entity_type, entity_id, changed_fields, reason)
       VALUES ('dish', $1, $2, $3)`,
      [dishId, ["photo_media_ids"], "Uploaded dish photo via portal"]
    );

    return NextResponse.json({ ok: true, url: publicUrl, media_id: mediaId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/portal/dishes/[id]/photo]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/portal/dishes/[id]/photo — remove the dish hero photo
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dishId } = await params;
  try {
    const existing = await db.queryOne<{ id: string; url: string }>(
      `SELECT id, url FROM media
       WHERE owner_type = 'dish' AND owner_id = $1 AND role = 'dish_hero'`,
      [dishId]
    );
    if (!existing) return NextResponse.json({ ok: true });

    const oldPath = urlToPath(existing.url);
    if (oldPath) {
      await getStorageClient().storage.from(BUCKET).remove([oldPath]);
    }

    await db.transaction(async (tx) => {
      await tx.execute(`DELETE FROM media WHERE id = $1`, [existing.id]);
      await tx.execute(
        `UPDATE dishes
         SET photo_media_ids = array_remove(photo_media_ids, $1::uuid), updated_at = now()
         WHERE id = $2`,
        [existing.id, dishId]
      );
      await tx.execute(
        `INSERT INTO change_logs (entity_type, entity_id, changed_fields, reason)
         VALUES ('dish', $1, $2, $3)`,
        [dishId, ["photo_media_ids"], "Removed dish photo via portal"]
      );
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[DELETE /api/portal/dishes/[id]/photo]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
