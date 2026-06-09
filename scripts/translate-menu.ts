/**
 * Generate-once menu translations and store them permanently.
 *
 *   npx tsx scripts/translate-menu.ts <menuId> [locale ...]      (default: ja ko es)
 *
 * Thin CLI wrapper around src/lib/menu-translate. Translates free-text via OpenAI;
 * allergen/dietary/spice stay as codes (rendered from exact per-locale dictionaries).
 * Re-running overwrites the stored translation. Requires OPENAI_API_KEY + DATABASE_URL.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../src/db/index";
import {
  generateMenuTranslations,
  DEFAULT_TRANSLATION_LOCALES,
} from "../src/lib/menu-translate";

async function main() {
  const [menuId, ...localeArgs] = process.argv.slice(2);
  if (!menuId) {
    console.error("Usage: npx tsx scripts/translate-menu.ts <menuId> [locale ...]");
    process.exit(1);
  }
  const locales = localeArgs.length ? localeArgs : DEFAULT_TRANSLATION_LOCALES;

  console.log(`Translating menu ${menuId} → ${locales.join(", ")}…`);
  const result = await generateMenuTranslations(menuId, locales);
  console.log(`✅ Stored ${result.locales.join(", ")} (${result.dishCount} dishes)`);
  await db.end();
}

main().catch(async (err) => {
  console.error("❌ translate-menu failed:", err);
  await db.end();
  process.exit(1);
});
