/**
 * Generate-once menu translations and store them permanently.
 *
 *   npx tsx scripts/translate-menu.ts <menuId> [locale ...]      (default: ja ko es)
 *
 * Fetches the published English menu payload, translates the FREE-TEXT fields via
 * OpenAI, and upserts the result into menu_translations. Allergen/dietary/spice
 * stay as codes — they're rendered from exact per-locale dictionaries in the UI,
 * never machine-translated. Re-running overwrites the stored translation.
 *
 * Requires OPENAI_API_KEY + DATABASE_URL. Model: OPENAI_TRANSLATION_MODEL (default gpt-4.1-mini).
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { writeFileSync } from "fs";
import OpenAI from "openai";
import { db } from "../src/db/index";
import { getEnglishMenuPayload, type MenuPayload } from "../src/lib/menu-payload";

const LANGUAGE_NAMES: Record<string, string> = {
  ja: "Japanese",
  ko: "Korean",
  es: "Spanish",
};

type TranslateJob = {
  restaurant_name: string;
  restaurant_about: string;
  menu_title: string;
  sections: { id: string; title: string }[];
  dishes: { id: string; name: string; story: string; ingredients: string[] }[];
};

function extractJsonObject(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error("No JSON object found in model output");
  }
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.log(`  …retry ${i + 1}/${attempts}: ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw lastErr;
}

function buildJob(payload: MenuPayload): TranslateJob {
  const sections = (payload.sections as { id: string; title_en: string }[]).map((s) => ({
    id: s.id,
    title: s.title_en,
  }));
  const dishes = payload.dishes.map((d) => ({
    id: d.id as string,
    name: (d.clarity_name_en as string) ?? "",
    story: (d.one_line_story_en as string) ?? "",
    ingredients: (((d.ingredients as { name_en?: string; name_native: string }[]) ?? []).map(
      (i) => i.name_en ?? i.name_native
    )),
  }));
  return {
    restaurant_name: payload.restaurant.name_en,
    restaurant_about: payload.restaurant.about_short_en,
    menu_title: payload.menu.title_en,
    sections,
    dishes,
  };
}

async function translate(
  client: OpenAI,
  job: TranslateJob,
  locale: string
): Promise<TranslateJob> {
  const language = LANGUAGE_NAMES[locale] ?? locale;
  const response = await client.responses.create({
    model: process.env.OPENAI_TRANSLATION_MODEL || "gpt-4.1-mini",
    input: [
      `Translate the English values in this restaurant-menu JSON into ${language}.`,
      "Keep dish names natural and appetizing for diners; keep the structure and every id unchanged.",
      "Translate only the string values (restaurant_name, restaurant_about, menu_title, section titles, dish name/story/ingredients).",
      "Do not add, remove, or reorder array items. Do not invent ingredients, allergens, or facts.",
      "Return ONLY JSON with this exact shape:",
      '{"restaurant_name":"...","restaurant_about":"...","menu_title":"...","sections":[{"id":"...","title":"..."}],"dishes":[{"id":"...","name":"...","story":"...","ingredients":["..."]}]}',
      `Input: ${JSON.stringify(job)}`,
    ].join("\n"),
  });
  return extractJsonObject(response.output_text) as TranslateJob;
}

function merge(payload: MenuPayload, t: TranslateJob): MenuPayload {
  const secTitle = new Map(t.sections?.map((s) => [s.id, s.title]) ?? []);
  const dishMap = new Map(t.dishes?.map((d) => [d.id, d]) ?? []);

  return {
    restaurant: {
      ...payload.restaurant,
      name_en: t.restaurant_name || payload.restaurant.name_en,
      about_short_en: t.restaurant_about || payload.restaurant.about_short_en,
    },
    menu: { ...payload.menu, title_en: t.menu_title || payload.menu.title_en },
    sections: (payload.sections as { id: string; title_en: string }[]).map((s) => ({
      ...s,
      title_en: secTitle.get(s.id) || s.title_en,
    })),
    dishes: payload.dishes.map((d) => {
      const td = dishMap.get(d.id as string);
      if (!td) return d;
      const origIng = (d.ingredients as { name_en?: string; name_native: string }[]) ?? [];
      const ingredients = origIng.map((ing, idx) => ({
        ...ing,
        name_en: td.ingredients?.[idx] ?? ing.name_en,
      }));
      return {
        ...d,
        clarity_name_en: td.name || d.clarity_name_en,
        one_line_story_en: td.story || d.one_line_story_en,
        ingredients,
      };
    }),
  };
}

async function main() {
  const [menuId, ...localeArgs] = process.argv.slice(2);
  if (!menuId) {
    console.error("Usage: npx tsx scripts/translate-menu.ts <menuId> [locale ...]");
    process.exit(1);
  }
  const locales = localeArgs.length ? localeArgs : ["ja", "ko", "es"];

  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY");
    process.exit(1);
  }

  const payload = await withRetry(() => getEnglishMenuPayload(menuId));
  if (!payload) {
    console.error(`No published menu found for ${menuId}`);
    process.exit(1);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const job = buildJob(payload);
  console.log(`Translating "${payload.menu.title_en}" (${payload.dishes.length} dishes) → ${locales.join(", ")}`);

  // Phase 1: translate everything first (OpenAI only — no DB held open across slow calls)
  const results: { locale: string; payload: MenuPayload }[] = [];
  for (const locale of locales) {
    console.log(`\n[${locale}] translating…`);
    const t = await withRetry(() => translate(client, job, locale));
    const translated = merge(payload, t);
    results.push({ locale, payload: translated });
    const sample = translated.dishes.slice(0, 3).map((d) => d.clarity_name_en).join(" · ");
    console.log(`[${locale}] translated ✓  sample: ${sample}`);
  }

  // Backup to disk so a DB hiccup never wastes the (paid) LLM work
  const backupPath = `scripts/_translations_${menuId}.json`;
  writeFileSync(backupPath, JSON.stringify({ menuId, results }, null, 2));
  console.log(`\nBackup written: ${backupPath}`);

  // Phase 2: persist (fast consecutive writes — survives transient pooler drops)
  for (const { locale, payload: tp } of results) {
    await withRetry(() =>
      db.query(
        `INSERT INTO menu_translations (menu_id, locale, payload, status)
         VALUES ($1, $2, $3, 'approved')
         ON CONFLICT (menu_id, locale)
         DO UPDATE SET payload = $3, status = 'approved', updated_at = now()`,
        [menuId, locale, JSON.stringify(tp)]
      )
    );
    console.log(`[${locale}] stored ✓`);
  }

  await db.end();
  console.log("\n✅ Done.");
}

main().catch(async (err) => {
  console.error("❌ translate-menu failed:", err);
  await db.end();
  process.exit(1);
});
