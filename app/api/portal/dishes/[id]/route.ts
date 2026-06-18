import { NextResponse } from "next/server";
import { db } from "@/src/db";

// PATCH /api/portal/dishes/[id] — update editable dish fields
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const allowed = [
      "clarity_name_en", "romanized_name", "one_line_story_en",
      "price", "spice_level", "allergens", "allergen_confidence",
      "dietary_flags", "cooking_methods",
    ];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const key of allowed) {
      if (key in body) {
        updates.push(`${key} = $${values.length + 1}`);
        values.push(body[key]);
      }
    }

    // Ingredients live in a separate table — handled as a full replace below.
    const hasIngredients = Array.isArray(body.ingredients);
    if (updates.length === 0 && !hasIngredients) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const ok = await db.transaction(async (tx) => {
      // Confirm the dish exists (and touch updated_at even if only ingredients change)
      const dish = await tx.queryOne(`SELECT id FROM dishes WHERE id = $1`, [id]);
      if (!dish) return false;

      if (updates.length > 0) {
        const updateValues = [...values, id];
        await tx.execute(
          `UPDATE dishes SET ${updates.join(", ")}, updated_at = now()
           WHERE id = $${updateValues.length}`,
          updateValues
        );
      } else {
        await tx.execute(`UPDATE dishes SET updated_at = now() WHERE id = $1`, [id]);
      }

      if (hasIngredients) {
        await tx.execute(`DELETE FROM dish_ingredients WHERE dish_id = $1`, [id]);
        let sort = 0;
        for (const raw of body.ingredients as unknown[]) {
          const name = String(raw ?? "").trim();
          if (!name) continue;
          await tx.execute(
            `INSERT INTO dish_ingredients (dish_id, name_native, name_en, sort_order)
             VALUES ($1, $2, $3, $4)`,
            [id, name, name, sort++]
          );
        }
      }
      return true;
    });

    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[PATCH /api/portal/dishes/[id]]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/portal/dishes/[id] — remove a dish and strip it from menu sections
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await db.transaction(async (tx) => {
      // Find which menu this dish belongs to
      const dish = await tx.queryOne(
        `SELECT menu_id FROM dishes WHERE id = $1`,
        [id]
      );
      if (!dish) throw new Error("Not found");

      // Delete the dish
      await tx.execute(`DELETE FROM dishes WHERE id = $1`, [id]);

      // Remove the dish_id from the menu's sections JSONB
      await tx.execute(
        `UPDATE menus
         SET sections = (
           SELECT jsonb_agg(
             jsonb_set(s, '{dish_ids}', (
               SELECT jsonb_agg(d)
               FROM jsonb_array_elements(s->'dish_ids') AS d
               WHERE d::text != $1
             ))
           )
           FROM jsonb_array_elements(sections) AS s
         )
         WHERE id = $2`,
        [JSON.stringify(id), dish.menu_id]
      );
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[DELETE /api/portal/dishes/[id]]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
