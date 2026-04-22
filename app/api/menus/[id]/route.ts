import { NextResponse } from "next/server";
import { db, queries } from "@/src/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Find the currently published snapshot for this menu (working table ID)
    const snapshot = await db.queryOne(`
      SELECT ms.*
      FROM menu_snapshots ms
      JOIN published_menus pm ON pm.current_snapshot_id = ms.id
      WHERE ms.menu_id = $1
    `, [id]);

    if (!snapshot) {
      return NextResponse.json({ error: "Menu not found or not published" }, { status: 404 });
    }

    // Get the restaurant from the working table
    const restaurant = await db.queryOne(queries.getRestaurantById, [snapshot.restaurant_id]);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Get all dish snapshots for this published version
    const dishes = await db.query(queries.getPublishedDishes, [snapshot.id]);

    // Hoist confidence_flags from nested JSONB to top-level fields
    const dishesFlat = dishes.map((d) => {
      const cf = (d.confidence_flags ?? {}) as Record<string, string>;
      return {
        ...d,
        allergen_confidence: cf.allergen_confidence ?? "unknown",
        dietary_confidence: cf.dietary_confidence ?? "unknown",
        spice_confidence: cf.spice_confidence ?? "unknown",
      };
    });

    // Derive currency from first dish (all dishes share the same currency)
    const currency = dishes[0]?.currency ?? "CNY";

    return NextResponse.json({
      restaurant: {
        id: restaurant.id,
        name_native: restaurant.name_native,
        name_en: restaurant.name_en,
        city: restaurant.city,
        address_native: restaurant.address_native,
        cuisine_tags: restaurant.cuisine_tags ?? [],
        about_short_en: restaurant.about_short_en,
        main_menu_id: restaurant.main_menu_id,
      },
      menu: {
        id,
        title_native: snapshot.title_native,
        title_en: snapshot.title_en,
        currency,
      },
      sections: snapshot.sections ?? [],
      dishes: dishesFlat,
    });
  } catch (err) {
    console.error("[GET /api/menus/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
