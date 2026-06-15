/**
 * Seasonal drink rotation for 云山竺院 (Yun Shan Zhu Yuan).
 *
 *   npx tsx scripts/rotate-yunshan-drinks.ts winter
 *   npx tsx scripts/rotate-yunshan-drinks.ts summer
 *   npx tsx scripts/rotate-yunshan-drinks.ts ./scripts/seasonal/yunshan-drinks-summer.json
 *
 * Swaps ONLY the drink sections of the live menu to the chosen season's dataset
 * (scripts/seasonal/yunshan-drinks-<season>.json), then republishes a new
 * immutable snapshot. Food sections (Hot Dishes / Staples / Soups / Desserts /
 * Other) are left untouched. The menu ID never changes, so the printed QR code
 * keeps working.
 *
 * Re-runnable: it always deletes the current drink dishes and reinserts the
 * dataset's, so running it twice is harmless. Requires DATABASE_URL.
 *
 * To capture a new season, copy an existing JSON in scripts/seasonal/, edit the
 * drinks, and run this with the new file. Datasets carry full dish data
 * (names, pinyin, story, price, allergens, confidence, ingredients) — no AI/
 * OpenAI needed at rotation time.
 */
import { Pool, PoolClient } from "pg";
import { promises as fs } from "fs";
import path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// Section titles (native) that count as "drinks" and get replaced on rotation.
const DRINK_TITLES = new Set(["饮品", "茶饮", "果茶", "非酒精饮料", "咖啡", "饮料", "酒水"]);

const PROVENANCE = JSON.stringify({
  ingredients_source: "restaurant", allergens_source: "restaurant",
  dietary_source: "restaurant", spice_source: "restaurant",
});

type Drink = {
  native_name: string; romanized_name: string; clarity_name_en: string; one_line_story_en: string;
  price: number; currency?: string; spice_level?: string;
  allergens: string[]; dietary_flags: string[]; cooking_methods: string[];
  allergen_confidence: string; dietary_confidence: string; spice_confidence: string;
  ingredients: { name_native: string; name_en: string | null }[];
};
type Dataset = {
  menuId: string; restaurantId: string; season: string;
  drinkSections: { title_native: string; title_en: string; drinks: Drink[] }[];
};

const J = (v: any, d: any) => { if (v == null) return d; let x = v, n = 0; while (typeof x === "string" && n++ < 5) { try { x = JSON.parse(x); } catch { break; } } return x; };
const arr = (v: any) => (Array.isArray(v) ? v : []);

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
async function connectWithRetry(): Promise<PoolClient> {
  for (let i = 1; i <= 12; i++) {
    try { return await pool.connect(); }
    catch (e: any) { console.error(`  connect retry ${i}: ${e.message}`); await new Promise((r) => setTimeout(r, 2500)); }
  }
  throw new Error("Could not connect to DB");
}

async function resolveDatasetPath(arg: string): Promise<string> {
  if (arg.endsWith(".json")) return arg;
  return path.join("scripts", "seasonal", `yunshan-drinks-${arg}.json`);
}

async function main() {
  const arg = process.argv[2];
  if (!arg) { console.error("Usage: npx tsx scripts/rotate-yunshan-drinks.ts <winter|summer|path.json>"); process.exit(1); }
  const dsPath = await resolveDatasetPath(arg);
  const ds: Dataset = JSON.parse(await fs.readFile(dsPath, "utf-8"));
  const MENU_ID = ds.menuId, RESTAURANT_ID = ds.restaurantId;
  const totalDrinks = ds.drinkSections.reduce((n, s) => n + s.drinks.length, 0);
  console.log(`Rotating to "${ds.season}" (${dsPath}) — ${totalDrinks} drinks in ${ds.drinkSections.length} section(s)`);

  const c = await connectWithRetry();
  try {
    await c.query("BEGIN");
    const sections: any[] = arr(J((await c.query("SELECT sections FROM menus WHERE id=$1 FOR UPDATE", [MENU_ID])).rows[0].sections, []));

    // Remove current drink-section dishes
    const oldDrinkIds = sections.filter((s) => DRINK_TITLES.has(s.title_native)).flatMap((s) => arr(s.dish_ids));
    if (oldDrinkIds.length) {
      await c.query("DELETE FROM dishes WHERE id = ANY($1)", [oldDrinkIds]);
      console.log(`  removed ${oldDrinkIds.length} current drink dishes`);
    }

    // Insert the season's drinks, grouped by dataset section
    const newDrinkSections: any[] = [];
    for (let si = 0; si < ds.drinkSections.length; si++) {
      const sec = ds.drinkSections[si];
      const ids: string[] = [];
      for (const d of sec.drinks) {
        const ins = await c.query(
          `INSERT INTO dishes (menu_id, native_name, romanized_name, clarity_name_en, one_line_story_en,
             price, currency, cooking_methods, spice_level, allergens, dietary_flags,
             status, review_status, ai_status, reviewed_at,
             allergen_confidence, dietary_confidence, spice_confidence, provenance)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'published','approved','approved',now(),$12,$13,$14,$15)
           RETURNING id`,
          [MENU_ID, d.native_name, d.romanized_name, d.clarity_name_en, d.one_line_story_en, d.price,
           d.currency || "CNY", arr(d.cooking_methods), d.spice_level || "not_spicy", arr(d.allergens), arr(d.dietary_flags),
           d.allergen_confidence || "confirmed", d.dietary_confidence || "confirmed", d.spice_confidence || "confirmed", PROVENANCE]
        );
        const id = ins.rows[0].id;
        ids.push(id);
        const ing = arr(d.ingredients);
        for (let i = 0; i < ing.length; i++) {
          await c.query("INSERT INTO dish_ingredients (dish_id, name_native, name_en, sort_order) VALUES ($1,$2,$3,$4)",
            [id, ing[i].name_native, ing[i].name_en, i]);
        }
      }
      newDrinkSections.push({ id: crypto.randomUUID(), title_native: sec.title_native, title_en: sec.title_en, dish_ids: ids, sort_order: si });
    }
    console.log(`  inserted ${totalDrinks} drinks + ingredients`);

    // Rebuild sections: new drink sections first, then food sections renumbered
    const foodSections = sections.filter((s) => !DRINK_TITLES.has(s.title_native)).sort((a, b) => a.sort_order - b.sort_order);
    const finalSections = [...newDrinkSections, ...foodSections.map((s, i) => ({ ...s, sort_order: newDrinkSections.length + i }))];
    await c.query("UPDATE menus SET sections=$1, status='published', review_status='approved', published_at=now(), updated_at=now() WHERE id=$2",
      [JSON.stringify(finalSections), MENU_ID]);
    console.log(`  sections: ${finalSections.map((s) => `${s.title_en}(${s.dish_ids.length})`).join(", ")}`);

    // Re-snapshot + publish
    const restaurant = (await c.query("SELECT * FROM restaurants WHERE id=$1", [RESTAURANT_ID])).rows[0];
    const version = (await c.query("SELECT COALESCE(MAX(version),0)+1 AS v FROM menu_snapshots WHERE menu_id=$1", [MENU_ID])).rows[0].v;
    const menuRow = (await c.query("SELECT * FROM menus WHERE id=$1", [MENU_ID])).rows[0];
    const label = (ds as any).label || (ds.season.charAt(0).toUpperCase() + ds.season.slice(1) + " Menu");
    const snapshotId = (await c.query(
      `INSERT INTO menu_snapshots (menu_id, restaurant_id, version, restaurant_snapshot, title_native, title_en,
         description_native, description_en, sections, checksum, label)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [MENU_ID, RESTAURANT_ID, version, JSON.stringify(restaurant), menuRow.title_native, menuRow.title_en,
       menuRow.description_native, menuRow.description_en, JSON.stringify(finalSections), `${ds.season}-v${version}`, label]
    )).rows[0].id;

    const dishRows = (await c.query(
      `SELECT d.*, COALESCE(json_agg(json_build_object('name_native', di.name_native, 'name_en', di.name_en,
          'is_hidden', di.is_hidden, 'notes_en', di.notes_en) ORDER BY di.sort_order)
          FILTER (WHERE di.id IS NOT NULL), '[]') AS ingredients
       FROM dishes d LEFT JOIN dish_ingredients di ON di.dish_id=d.id WHERE d.menu_id=$1 GROUP BY d.id`, [MENU_ID]
    )).rows;
    const byId = new Map(dishRows.map((r: any) => [r.id, r]));
    const lookup = new Map<string, string>(); const ordered: string[] = [];
    for (const s of finalSections) for (const id of s.dish_ids) { lookup.set(id, s.id); ordered.push(id); }

    let sort = 0;
    for (const id of ordered) {
      const d = byId.get(id); if (!d) continue;
      const cf = JSON.stringify({ allergen_confidence: d.allergen_confidence, dietary_confidence: d.dietary_confidence, spice_confidence: d.spice_confidence });
      await c.query(
        `INSERT INTO dish_snapshots (menu_snapshot_id, dish_id, native_name, romanized_name, clarity_name_en,
           one_line_story_en, price, currency, spice_level, allergens, dietary_flags, cooking_methods,
           flavor_profile_tags, ingredients, hidden_ingredients_notes_en, variations, photo_urls, provenance,
           confidence_flags, section_id, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'{}',$13,$14,'[]','[]',$15,$16,$17,$18)`,
        [snapshotId, d.id, d.native_name, d.romanized_name, d.clarity_name_en, d.one_line_story_en, d.price,
         d.currency, d.spice_level, d.allergens, d.dietary_flags, d.cooking_methods, JSON.stringify(arr(J(d.ingredients, []))),
         d.hidden_ingredients_notes_en, JSON.stringify(J(d.provenance, {})), cf, lookup.get(id) ?? null, sort++]
      );
    }

    await c.query(
      `INSERT INTO published_menus (restaurant_id, current_snapshot_id, published_at) VALUES ($1,$2,now())
       ON CONFLICT (restaurant_id) DO UPDATE SET current_snapshot_id=$2, published_at=now()`,
      [RESTAURANT_ID, snapshotId]
    );
    await c.query(
      `INSERT INTO change_logs (entity_type, entity_id, changed_fields, reason) VALUES ('menu',$1,$2,$3)`,
      [MENU_ID, ["sections", "dishes", "status"], `Seasonal drink rotation → "${ds.season}"; published snapshot v${version}`]
    );

    await c.query("COMMIT");
    console.log(`\n✅ Rotated to "${ds.season}" — published snapshot v${version} (${snapshotId}). Same menu, same QR.`);
    console.log(`   Note: translated (JA/KO/ES) menus, if any, must be regenerated from the portal.`);
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
    await pool.end();
  }
}

main().catch((e) => { console.error("\n❌ FAILED:", e.message); process.exit(1); });
