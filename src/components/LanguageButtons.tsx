"use client";

import Link from "next/link";
import { LOCALE_NAMES, type Locale } from "@/src/lib/menu-i18n";
import { track } from "@/src/lib/analytics";

// Picker language buttons. Visually identical to the original server-rendered
// links; the only addition is recording which language the diner chose (fired
// via sendBeacon so it lands even as the page navigates to the menu).
export default function LanguageButtons({
  menuId,
  restaurantId,
  offered,
}: {
  menuId: string;
  restaurantId: string | null;
  offered: Locale[];
}) {
  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      {offered.map((l) => (
        <Link
          key={l}
          href={`/m/${menuId}/${l}`}
          onClick={() =>
            track("language_select", {
              menu_id: menuId,
              restaurant_id: restaurantId,
              locale: l,
              source: "qr_picker",
            })
          }
          className="flex items-center justify-center rounded-2xl border border-[#d9d9d9] bg-white px-6 py-4 text-lg font-semibold transition-colors hover:border-[#d98f11] hover:text-[#d98f11]"
        >
          {LOCALE_NAMES[l]}
        </Link>
      ))}
    </div>
  );
}
