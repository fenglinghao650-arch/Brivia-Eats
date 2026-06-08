/**
 * Builds the canonical (English) published-menu payload served at /api/menus/[id].
 * Shared by the API route and scripts/translate-menu.ts so both produce the exact
 * same shape. Translated menus are stored as this same shape with text fields swapped.
 */

import { db, queries } from "@/src/db";

export type MenuPayload = {
  restaurant: {
    id: string;
    name_native: string;
    name_en: string;
    city: string;
    address_native: string;
    cuisine_tags: string[];
    about_short_en: string;
    main_menu_id: string | null;
  };
  menu: {
    id: string;
    title_native: string | null;
    title_en: string;
    currency: string;
  };
  sections: unknown[];
  dishes: Record<string, unknown>[];
};

/** Returns the English menu payload from the published snapshot, or null if unpublished. */
export async function getEnglishMenuPayload(menuId: string): Promise<MenuPayload | null> {
  const snapshot = await db.queryOne(
    `SELECT ms.*
     FROM menu_snapshots ms
     JOIN published_menus pm ON pm.current_snapshot_id = ms.id
     WHERE ms.menu_id = $1`,
    [menuId]
  );
  if (!snapshot) return null;

  const restaurant = await db.queryOne(queries.getRestaurantById, [snapshot.restaurant_id]);
  if (!restaurant) return null;

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

  const currency = (dishes[0]?.currency as string) ?? "CNY";

  return {
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
      id: menuId,
      title_native: snapshot.title_native,
      title_en: snapshot.title_en,
      currency,
    },
    sections: snapshot.sections ?? [],
    dishes: dishesFlat,
  };
}

/** Returns the stored translated payload for a locale, or null if none exists. */
export async function getTranslatedMenuPayload(
  menuId: string,
  locale: string
): Promise<MenuPayload | null> {
  const row = await db.queryOne<{ payload: MenuPayload }>(
    `SELECT payload FROM menu_translations WHERE menu_id = $1 AND locale = $2`,
    [menuId, locale]
  );
  return row?.payload ?? null;
}
