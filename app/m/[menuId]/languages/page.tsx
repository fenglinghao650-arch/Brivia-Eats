/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { LOCALES, LOCALE_NAMES, PICKER_HEADING } from "@/src/lib/menu-i18n";

// Full-page language picker — the QR code points here.
// Diner scans → picks a language → lands on /m/[menuId]/[lang].
export default async function LanguagePicker({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { menuId } = await params;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-[#fbf9f1] px-6 py-16 text-[#1e1e1e]">
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
        {LOCALES.map((l) => (
          <p key={l} className="text-sm text-zinc-500">
            {PICKER_HEADING[l]}
          </p>
        ))}
      </div>

      {/* Language buttons, each shown in its own script */}
      <div className="flex w-full max-w-xs flex-col gap-3">
        {LOCALES.map((l) => (
          <Link
            key={l}
            href={`/m/${menuId}/${l}`}
            className="flex items-center justify-center rounded-2xl border border-[#d9d9d9] bg-white px-6 py-4 text-lg font-semibold transition-colors hover:border-[#d98f11] hover:text-[#d98f11]"
          >
            {LOCALE_NAMES[l]}
          </Link>
        ))}
      </div>
    </div>
  );
}
