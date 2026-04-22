import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { getStorageClient, BUCKET, restaurantCoverPath } from "@/src/lib/supabase-storage";

// POST /api/portal/restaurants/[id]/cover — upload cover photo to Supabase Storage
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: restaurantId } = await params;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const cropPosition = formData.get("crop_position") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPEG, PNG, WebP, or HEIC." },
        { status: 400 }
      );
    }

    // Get file extension
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/heic": "heic",
    };
    const ext = extMap[file.type] ?? "jpg";
    const storagePath = restaurantCoverPath(restaurantId, ext);

    // Delete old file if it exists at a different path (e.g. jpg → png)
    const supabase = getStorageClient();
    const existing = await db.queryOne(
      `SELECT url FROM media WHERE owner_type = 'restaurant' AND owner_id = $1 AND role = 'cover'`,
      [restaurantId]
    );
    if (existing?.url) {
      const oldUrl = existing.url as string;
      const bucketPrefix = `/storage/v1/object/public/${BUCKET}/`;
      const oldPath = oldUrl.includes(bucketPrefix)
        ? oldUrl.split(bucketPrefix)[1]
        : null;
      if (oldPath && oldPath !== storagePath) {
        await supabase.storage.from(BUCKET).remove([oldPath]);
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true, // replace existing cover
      });

    if (uploadError) {
      console.error("[cover upload] storage error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    // Upsert media row
    const existingMedia = await db.queryOne(
      `SELECT id FROM media WHERE owner_type = 'restaurant' AND owner_id = $1 AND role = 'cover'`,
      [restaurantId]
    );

    let mediaId: string;
    if (existingMedia) {
      await db.execute(
        `UPDATE media SET url = $1, mime_type = $2 WHERE id = $3`,
        [publicUrl, file.type, existingMedia.id]
      );
      mediaId = existingMedia.id as string;
    } else {
      const row = await db.queryOne(
        `INSERT INTO media (owner_type, owner_id, url, mime_type, is_primary, role, status)
         VALUES ('restaurant', $1, $2, $3, true, 'cover', 'ready')
         RETURNING id`,
        [restaurantId, publicUrl, file.type]
      );
      mediaId = row!.id as string;
    }

    // Update restaurant cover_media_id and crop position
    const updates: string[] = [`cover_media_id = $1`];
    const values: unknown[] = [mediaId];

    if (cropPosition !== null) {
      updates.push(`poi_external_ids = jsonb_set(COALESCE(poi_external_ids, '{}'), '{crop_position}', $${values.length + 1})`);
      values.push(`"${cropPosition}"`);
    }

    values.push(restaurantId);
    await db.execute(
      `UPDATE restaurants SET ${updates.join(", ")}, updated_at = now() WHERE id = $${values.length}`,
      values
    );

    return NextResponse.json({ ok: true, url: publicUrl, media_id: mediaId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/portal/restaurants/[id]/cover]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/portal/restaurants/[id]/cover — update crop position only
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: restaurantId } = await params;
  try {
    const { crop_position } = await req.json();
    if (crop_position === undefined) {
      return NextResponse.json({ error: "crop_position required" }, { status: 400 });
    }

    await db.execute(
      `UPDATE restaurants
       SET poi_external_ids = jsonb_set(COALESCE(poi_external_ids, '{}'), '{crop_position}', $1),
           updated_at = now()
       WHERE id = $2`,
      [`"${crop_position}"`, restaurantId]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/portal/restaurants/[id]/cover]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
