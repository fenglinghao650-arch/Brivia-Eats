/**
 * Core menu-translation logic, shared by:
 *   - scripts/translate-menu.ts (CLI)
 *   - POST /api/portal/restaurants/[id]/translate (portal button)
 *
 * Translates free-text only; allergen/dietary/spice stay as codes (rendered from
 * exact per-locale dictionaries in the UI). Translates all locales first, then
 * writes — so a transient DB drop never wastes the (paid) OpenAI work.
 */

import OpenAI from "openai";
import { db } from "@/src/db";
import { getEnglishMenuPayload, type MenuPayload } from "@/src/lib/menu-payload";

export const DEFAULT_TRANSLATION_LOCALES = ["ja", "ko", "es"];

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
    ingredients: ((d.ingredients as { name_en?: string; name_native: string }[]) ?? []).map(
      (i) => i.name_en ?? i.name_native
    ),
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

export type TranslateResult = {
  locales: string[];
  dishCount: number;
};

/**
 * Generate and persist translations for a published menu. Returns the locales written.
 * Throws on missing OPENAI_API_KEY, unpublished menu, or persistent failure.
 */
export async function generateMenuTranslations(
  menuId: string,
  locales: string[] = DEFAULT_TRANSLATION_LOCALES
): Promise<TranslateResult> {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

  const payload = await withRetry(() => getEnglishMenuPayload(menuId));
  if (!payload) throw new Error("No published menu found for this restaurant");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const job = buildJob(payload);

  // Phase 1: translate everything (OpenAI only)
  const translated: { locale: string; payload: MenuPayload }[] = [];
  for (const locale of locales) {
    const t = await withRetry(() => translate(client, job, locale));
    translated.push({ locale, payload: merge(payload, t) });
  }

  // Phase 2: persist (fast consecutive writes, retry-safe)
  for (const { locale, payload: tp } of translated) {
    await withRetry(() =>
      db.query(
        `INSERT INTO menu_translations (menu_id, locale, payload, status)
         VALUES ($1, $2, $3, 'approved')
         ON CONFLICT (menu_id, locale)
         DO UPDATE SET payload = $3, status = 'approved', updated_at = now()`,
        [menuId, locale, JSON.stringify(tp)]
      )
    );
  }

  return { locales: translated.map((r) => r.locale), dishCount: payload.dishes.length };
}
