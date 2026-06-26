/* eslint-disable @next/next/no-img-element */
import { db } from "@/src/db";
import { LOCALES, PICKER_HEADING, type Locale } from "@/src/lib/menu-i18n";
import TrackEvent from "@/src/components/TrackEvent";
import LanguageButtons from "@/src/components/LanguageButtons";

// Full-page language picker — the QR code points here.
// Diner scans → picks a language → lands on /m/[menuId]/[lang].
export default async function LanguagePicker({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { menuId } = await params;

  // English is always offered; other languages only when a translation exists.
  const rows = await db.query<{ locale: string }>(
    `SELECT locale FROM menu_translations WHERE menu_id = $1`,
    [menuId]
  );
  const available = new Set(rows.map((r) => r.locale));
  const offered: Locale[] = LOCALES.filter((l) => l === "en" || available.has(l));

  // Restaurant id enriches the qr_scan event so the dashboard can attribute the
  // scan even before a language (and thus the menu) is opened.
  const menuRow = await db.queryOne<{ restaurant_id: string }>(
    `SELECT restaurant_id FROM menus WHERE id = $1`,
    [menuId]
  );
  const restaurantId = menuRow?.restaurant_id ?? null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-[#fbf9f1] px-6 py-16 text-[#1e1e1e]">
      {/* QR scanned → picker shown. Fires once on load. */}
      <TrackEvent
        event="qr_scan"
        payload={{ menu_id: menuId, restaurant_id: restaurantId, source: "qr_picker" }}
      />

      {/* Brand mark */}
      <div className="flex items-center gap-px">
        <img src="/icons/logo-b.svg" alt="" className="h-5 w-[14px]" />
        <span
          className="text-lg font-bold"
          style={{ fontFamily: "var(--font-playfair-display-sc)" }}
        >
          rivia Eats
        </span>
      </div>

      {/* "Choose your language" in every offered language */}
      <div className="space-y-0.5 text-center">
        {offered.map((l) => (
          <p key={l} className="text-sm text-zinc-500">
            {PICKER_HEADING[l]}
          </p>
        ))}
      </div>

      {/* Language buttons, each shown in its own script */}
      <LanguageButtons menuId={menuId} restaurantId={restaurantId} offered={offered} />
    </div>
  );
}
