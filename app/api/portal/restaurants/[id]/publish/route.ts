import { NextResponse } from "next/server";
import { db } from "@/src/db";
import crypto from "crypto";

// POST /api/portal/restaurants/[id]/publish — approve all dishes + create snapshot
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: restaurantId } = await params;
  try {
    await db.transaction(async (tx) => {
      // 1. Get restaurant + menu
      const restaurant = await tx.queryOne(
        `SELECT id, name_native, name_en, city, address_native, address_en,
                cuisine_tags, about_short_en, tagline_en, main_menu_id
         FROM restaurants WHERE id = $1`,
        [restaurantId]
      );
      if (!restaurant) throw new Error("Restaurant not found");

      const menu = await tx.queryOne(
        `SELECT id, title_native, title_en, description_native, description_en, sections
         FROM menus WHERE id = $1`,
        [restaurant.main_menu_id]
      );
      if (!menu) throw new Error("Menu not found");

      // 2. Approve all draft dishes
      await tx.execute(
        `UPDATE dishes SET status = 'published', review_status = 'approved',
                           reviewed_at = now(), updated_at = now()
         WHERE menu_id = $1`,
        [menu.id]
      );

      // 3. Approve menu
      await tx.execute(
        `UPDATE menus SET status = 'published', review_status = 'approved',
                          reviewed_at = now(), updated_at = now()
         WHERE id = $1`,
        [menu.id]
      );

      // 4. Get current snapshot version
      const versionRow = await tx.queryOne(
        `SELECT COALESCE(MAX(version), 0) AS max_version FROM menu_snapshots WHERE menu_id = $1`,
        [menu.id]
      );
      const version = ((versionRow?.max_version as number) ?? 0) + 1;

      // 5. Fetch approved dishes
      const dishes = await tx.query(
        `SELECT * FROM dishes WHERE menu_id = $1 ORDER BY created_at`,
        [menu.id]
      );

      // 6. Build restaurant snapshot
      const restaurantSnapshot = {
        id: restaurant.id,
        name_native: restaurant.name_native,
        name_en: restaurant.name_en,
        city: restaurant.city,
        address_native: restaurant.address_native,
        address_en: restaurant.address_en,
        cuisine_tags: restaurant.cuisine_tags,
        about_short_en: restaurant.about_short_en,
        tagline_en: restaurant.tagline_en,
      };

      // 7. Create menu snapshot
      const checksum = crypto
        .createHash("sha256")
        .update(JSON.stringify(dishes))
        .digest("hex")
        .slice(0, 16);

      const snapshotRows = await tx.query(
        `INSERT INTO menu_snapshots (
           menu_id, restaurant_id, version, restaurant_snapshot,
           title_native, title_en, description_native, description_en,
           sections, published_at, checksum
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10)
         RETURNING id`,
        [
          menu.id, restaurantId, version,
          JSON.stringify(restaurantSnapshot),
          menu.title_native, menu.title_en,
          menu.description_native, menu.description_en,
          JSON.stringify(menu.sections),
          checksum,
        ]
      );
      const snapshotId = snapshotRows[0].id as string;

      // 8. Build dish → section lookup from menu.sections JSONB
      type Section = { id: string; dish_ids: string[]; sort_order: number };
      const sections: Section[] = Array.isArray(menu.sections)
        ? menu.sections
        : (JSON.parse(menu.sections as string) as Section[]);

      const dishSectionMap = new Map<string, { sectionId: string; sortOrder: number }>();
      for (const section of sections) {
        (section.dish_ids ?? []).forEach((dishId: string, idx: number) => {
          dishSectionMap.set(dishId, { sectionId: section.id, sortOrder: idx });
        });
      }

      // 8. Create dish snapshots
      for (const dish of dishes) {
        const sectionInfo = dishSectionMap.get(dish.id as string);
        await tx.execute(
          `INSERT INTO dish_snapshots (
             menu_snapshot_id, dish_id, native_name, romanized_name,
             clarity_name_en, one_line_story_en, price, currency,
             spice_level, allergens, dietary_flags, cooking_methods,
             flavor_profile_tags, ingredients, hidden_ingredients_notes_en,
             variations, photo_urls, provenance, confidence_flags,
             section_id, sort_order
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8,
             $9, $10, $11, $12,
             $13, $14, $15,
             $16, $17, $18, $19,
             $20, $21
           )`,
          [
            snapshotId, dish.id, dish.native_name, dish.romanized_name,
            dish.clarity_name_en, dish.one_line_story_en, dish.price, dish.currency ?? "CNY",
            dish.spice_level, dish.allergens, dish.dietary_flags, dish.cooking_methods,
            dish.flavor_profile_tags ?? [], dish.ingredients ?? [], dish.hidden_ingredients_notes_en ?? null,
            JSON.stringify(dish.variations ?? []), JSON.stringify(dish.photo_urls ?? []),
            JSON.stringify(dish.provenance ?? {}),
            JSON.stringify({
              allergen_confidence: dish.allergen_confidence,
              dietary_confidence: dish.dietary_confidence,
              spice_confidence: dish.spice_confidence ?? "confirmed",
            }),
            sectionInfo?.sectionId ?? null, sectionInfo?.sortOrder ?? 0,
          ]
        );
      }

      // 9. Upsert published_menus pointer
      await tx.execute(
        `INSERT INTO published_menus (restaurant_id, current_snapshot_id, published_at)
         VALUES ($1, $2, now())
         ON CONFLICT (restaurant_id) DO UPDATE
           SET current_snapshot_id = $2, published_at = now()`,
        [restaurantId, snapshotId]
      );

      // 10. Mark menu published_at
      await tx.execute(
        `UPDATE menus SET published_at = now() WHERE id = $1`,
        [menu.id]
      );

      // 11. Change log
      await tx.execute(
        `INSERT INTO change_logs (entity_type, entity_id, changed_fields, reason)
         VALUES ('menu', $1, $2, $3)`,
        [menu.id, ["status", "review_status"], `Published v${version} via portal`]
      );
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/portal/restaurants/[id]/publish]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
