/**
 * One-off seed: creates the "上海早餐煎饼果子" (Shanghai Breakfast Jianbing) restaurant
 * + its menu as a DRAFT in the working tables, so it can be reviewed / edited /
 * published from the portal at /portal/<restaurantId>.
 *
 * Run: npx tsx scripts/seed-jianbing.ts
 * Requires DATABASE_URL (.env.local preferred, falls back to .env).
 *
 * Safe to re-run: deletes any prior restaurant with the same native name first.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config(); // fall back to .env without overriding

import { randomUUID } from "crypto";
import { db } from "../src/db/index";

type Conf = "confirmed" | "unknown";

interface SeedDish {
  id: string;
  native_name: string;
  romanized_name: string;
  clarity_name_en: string;
  one_line_story_en: string;
  price: number | null;
  spice_level: "not_spicy" | "mild" | "medium" | "spicy";
  allergens: string[];
  dietary_flags: string[];
  allergen_confidence: Conf;
  dietary_confidence: Conf;
  spice_confidence: Conf;
  /** combo components shown in the "Key Ingredients" field (set meals) */
  ingredients?: { name_native: string; name_en: string }[];
}

const ADDON_STORY = "An add-on topping for your jianbing.";

// ── Section 1: Pancakes ──────────────────────────────────────────────
const pancakes: SeedDish[] = [
  {
    id: randomUUID(),
    native_name: "煎饼",
    romanized_name: "Jianbing",
    clarity_name_en: "Pancake (base)",
    one_line_story_en:
      "The classic Shanghai breakfast crepe — thin batter griddled with egg and folded around a crispy cracker.",
    price: 7,
    spice_level: "not_spicy",
    allergens: ["gluten_wheat", "egg"],
    dietary_flags: [],
    allergen_confidence: "confirmed",
    dietary_confidence: "unknown",
    spice_confidence: "confirmed",
  },
];

// ── Section 2: Add-ons ───────────────────────────────────────────────
const addons: SeedDish[] = [
  { id: randomUUID(), native_name: "香肠", romanized_name: "Xiangchang", clarity_name_en: "Sausage", one_line_story_en: ADDON_STORY, price: 4, spice_level: "not_spicy", allergens: [], dietary_flags: ["contains_pork"], allergen_confidence: "unknown", dietary_confidence: "confirmed", spice_confidence: "unknown" },
  { id: randomUUID(), native_name: "里脊", romanized_name: "Liji", clarity_name_en: "Tenderloin", one_line_story_en: ADDON_STORY, price: 3, spice_level: "not_spicy", allergens: [], dietary_flags: ["contains_pork"], allergen_confidence: "unknown", dietary_confidence: "confirmed", spice_confidence: "unknown" },
  { id: randomUUID(), native_name: "牛肉", romanized_name: "Niurou", clarity_name_en: "Beef", one_line_story_en: ADDON_STORY, price: 4, spice_level: "not_spicy", allergens: [], dietary_flags: ["contains_beef"], allergen_confidence: "unknown", dietary_confidence: "confirmed", spice_confidence: "unknown" },
  { id: randomUUID(), native_name: "培根", romanized_name: "Peigen", clarity_name_en: "Bacon", one_line_story_en: ADDON_STORY, price: 3, spice_level: "not_spicy", allergens: [], dietary_flags: ["contains_pork"], allergen_confidence: "unknown", dietary_confidence: "confirmed", spice_confidence: "unknown" },
  { id: randomUUID(), native_name: "芝士", romanized_name: "Zhishi", clarity_name_en: "Cheese", one_line_story_en: ADDON_STORY, price: 4, spice_level: "not_spicy", allergens: ["dairy"], dietary_flags: [], allergen_confidence: "confirmed", dietary_confidence: "unknown", spice_confidence: "unknown" },
  { id: randomUUID(), native_name: "肉松", romanized_name: "Rousong", clarity_name_en: "Dried Meat Floss", one_line_story_en: ADDON_STORY, price: 4, spice_level: "not_spicy", allergens: [], dietary_flags: [], allergen_confidence: "unknown", dietary_confidence: "unknown", spice_confidence: "unknown" },
  { id: randomUUID(), native_name: "土豆丝", romanized_name: "Tudousi", clarity_name_en: "Shredded Potato", one_line_story_en: ADDON_STORY, price: 2, spice_level: "not_spicy", allergens: [], dietary_flags: [], allergen_confidence: "unknown", dietary_confidence: "unknown", spice_confidence: "unknown" },
  { id: randomUUID(), native_name: "海带丝", romanized_name: "Haidaisi", clarity_name_en: "Kelp", one_line_story_en: ADDON_STORY, price: 1.5, spice_level: "not_spicy", allergens: [], dietary_flags: [], allergen_confidence: "unknown", dietary_confidence: "unknown", spice_confidence: "unknown" },
  { id: randomUUID(), native_name: "辣条", romanized_name: "Latiao", clarity_name_en: "Spicy Gluten Strips", one_line_story_en: ADDON_STORY, price: 3, spice_level: "spicy", allergens: ["gluten_wheat"], dietary_flags: [], allergen_confidence: "confirmed", dietary_confidence: "unknown", spice_confidence: "confirmed" },
  { id: randomUUID(), native_name: "生菜", romanized_name: "Shengcai", clarity_name_en: "Romaine Lettuce", one_line_story_en: ADDON_STORY, price: 1, spice_level: "not_spicy", allergens: [], dietary_flags: [], allergen_confidence: "unknown", dietary_confidence: "unknown", spice_confidence: "unknown" },
  { id: randomUUID(), native_name: "鸡蛋", romanized_name: "Jidan", clarity_name_en: "Egg", one_line_story_en: ADDON_STORY, price: 2, spice_level: "not_spicy", allergens: ["egg"], dietary_flags: [], allergen_confidence: "confirmed", dietary_confidence: "unknown", spice_confidence: "unknown" },
  { id: randomUUID(), native_name: "腐竹", romanized_name: "Fuzhu", clarity_name_en: "Dried Tofu Sticks (Yuba)", one_line_story_en: ADDON_STORY + " (price unconfirmed — verify in portal)", price: 3, spice_level: "not_spicy", allergens: ["soy"], dietary_flags: [], allergen_confidence: "confirmed", dietary_confidence: "unknown", spice_confidence: "unknown" },
];

// ── Section 3: Set Meals (pancake + fixed combo, components in ingredients) ──
const PANCAKE_ING = { name_native: "煎饼", name_en: "Pancake" };
const setMeals: SeedDish[] = [
  {
    id: randomUUID(),
    native_name: "套餐（牛肉·培根·里脊·芝士·生菜）",
    romanized_name: "Taocan - Deluxe",
    clarity_name_en: "Deluxe Meat Set",
    one_line_story_en: "Pancake loaded with beef, bacon, tenderloin, cheese and lettuce.",
    price: 21,
    spice_level: "not_spicy",
    allergens: ["gluten_wheat", "egg", "dairy"],
    dietary_flags: ["contains_beef", "contains_pork"],
    allergen_confidence: "confirmed",
    dietary_confidence: "confirmed",
    spice_confidence: "confirmed",
    ingredients: [PANCAKE_ING, { name_native: "牛肉", name_en: "Beef" }, { name_native: "培根", name_en: "Bacon" }, { name_native: "里脊", name_en: "Tenderloin" }, { name_native: "芝士", name_en: "Cheese" }, { name_native: "生菜", name_en: "Romaine Lettuce" }],
  },
  {
    id: randomUUID(),
    native_name: "套餐（牛肉·培根·芝士·生菜）",
    romanized_name: "Taocan - Beef & Bacon",
    clarity_name_en: "Beef & Bacon Set",
    one_line_story_en: "Pancake with beef, bacon, cheese and lettuce.",
    price: 17,
    spice_level: "not_spicy",
    allergens: ["gluten_wheat", "egg", "dairy"],
    dietary_flags: ["contains_beef", "contains_pork"],
    allergen_confidence: "confirmed",
    dietary_confidence: "confirmed",
    spice_confidence: "confirmed",
    ingredients: [PANCAKE_ING, { name_native: "牛肉", name_en: "Beef" }, { name_native: "培根", name_en: "Bacon" }, { name_native: "芝士", name_en: "Cheese" }, { name_native: "生菜", name_en: "Romaine Lettuce" }],
  },
  {
    id: randomUUID(),
    native_name: "套餐（里脊·生菜·鸡蛋）",
    romanized_name: "Taocan - Tenderloin",
    clarity_name_en: "Tenderloin Set",
    one_line_story_en: "Pancake with tenderloin, lettuce and extra egg.",
    price: 11,
    spice_level: "not_spicy",
    allergens: ["gluten_wheat", "egg"],
    dietary_flags: ["contains_pork"],
    allergen_confidence: "confirmed",
    dietary_confidence: "confirmed",
    spice_confidence: "confirmed",
    ingredients: [PANCAKE_ING, { name_native: "里脊", name_en: "Tenderloin" }, { name_native: "生菜", name_en: "Romaine Lettuce" }, { name_native: "鸡蛋", name_en: "Egg" }],
  },
  {
    id: randomUUID(),
    native_name: "套餐（香肠·鸡蛋·生菜）",
    romanized_name: "Taocan - Sausage",
    clarity_name_en: "Sausage Set",
    one_line_story_en: "Pancake with sausage, extra egg and lettuce.",
    price: 11,
    spice_level: "not_spicy",
    allergens: ["gluten_wheat", "egg"],
    dietary_flags: ["contains_pork"],
    allergen_confidence: "confirmed",
    dietary_confidence: "confirmed",
    spice_confidence: "confirmed",
    ingredients: [PANCAKE_ING, { name_native: "香肠", name_en: "Sausage" }, { name_native: "鸡蛋", name_en: "Egg" }, { name_native: "生菜", name_en: "Romaine Lettuce" }],
  },
];

async function main() {
  const restaurantId = randomUUID();
  const menuId = randomUUID();

  const sections = [
    { id: randomUUID(), title_native: "煎饼", title_en: "Pancakes", dish_ids: pancakes.map((d) => d.id), sort_order: 0 },
    { id: randomUUID(), title_native: "加料", title_en: "Add-ons", dish_ids: addons.map((d) => d.id), sort_order: 1 },
    { id: randomUUID(), title_native: "套餐", title_en: "Set Meals", dish_ids: setMeals.map((d) => d.id), sort_order: 2 },
  ];

  const allDishes = [...pancakes, ...addons, ...setMeals];

  await db.transaction(async (tx) => {
    // Clean re-run: drop any prior copy (cascades to menus/dishes/ingredients)
    await tx.execute(`DELETE FROM restaurants WHERE name_native = $1`, ["上海早餐煎饼果子"]);

    // 1. Restaurant (main_menu_id set after the menu exists — FK ordering)
    await tx.execute(
      `INSERT INTO restaurants
        (id, name_native, name_en, city, area, address_native, address_en,
         about_short_en, cuisine_tags, status, badge_text)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active','')`,
      [
        restaurantId,
        "上海早餐煎饼果子",
        "Shanghai Breakfast Jianbing",
        "Shanghai", // must match cities.ts name_en (home page matches LOWER(city))
        "黄浦区",
        "上海市黄浦区（地址待补充）",
        "Huangpu District, Shanghai (address TBD)",
        "A Shanghai street stall serving made-to-order jianbing — savory Chinese breakfast crepes with your choice of fillings.",
        ["Street Food", "Breakfast", "Jianbing"],
      ]
    );

    // 2. Menu (draft)
    await tx.execute(
      `INSERT INTO menus
        (id, restaurant_id, title_native, title_en, sections, status, review_status)
       VALUES ($1,$2,$3,$4,$5,'draft','draft')`,
      [menuId, restaurantId, "菜单", "Menu", JSON.stringify(sections)]
    );

    // 3. Dishes (draft) + ingredients
    for (const d of allDishes) {
      await tx.execute(
        `INSERT INTO dishes
          (id, menu_id, native_name, romanized_name, clarity_name_en, one_line_story_en,
           price, currency, spice_level, allergens, dietary_flags,
           status, review_status, ai_status,
           allergen_confidence, dietary_confidence, spice_confidence)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'CNY',$8,$9,$10,'draft','draft','not_started',$11,$12,$13)`,
        [
          d.id, menuId, d.native_name, d.romanized_name, d.clarity_name_en, d.one_line_story_en,
          d.price, d.spice_level, d.allergens, d.dietary_flags,
          d.allergen_confidence, d.dietary_confidence, d.spice_confidence,
        ]
      );

      if (d.ingredients?.length) {
        let sort = 0;
        for (const ing of d.ingredients) {
          await tx.execute(
            `INSERT INTO dish_ingredients (dish_id, name_native, name_en, sort_order)
             VALUES ($1,$2,$3,$4)`,
            [d.id, ing.name_native, ing.name_en, sort++]
          );
        }
      }
    }

    // 4. Wire main_menu_id now that the menu row exists
    await tx.execute(`UPDATE restaurants SET main_menu_id = $1 WHERE id = $2`, [menuId, restaurantId]);
  });

  console.log("✅ Seeded draft restaurant + menu");
  console.log(`   restaurant_id : ${restaurantId}`);
  console.log(`   menu_id       : ${menuId}`);
  console.log(`   dishes        : ${allDishes.length} (1 pancake, ${addons.length} add-ons, ${setMeals.length} set meals)`);
  console.log(`   portal        : /portal/${restaurantId}`);
  await db.end();
}

main().catch(async (err) => {
  console.error("❌ Seed failed:", err);
  await db.end();
  process.exit(1);
});
