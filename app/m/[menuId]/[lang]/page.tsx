import { notFound } from "next/navigation";
import MenuView from "@/src/components/MenuView";
import { isLocale } from "@/src/lib/menu-i18n";

// Localized menu, e.g. /m/<id>/ja. Unknown locales 404. The API serves the stored
// translation for the locale, falling back to English if none exists.
export default async function LocalizedMenuPage({
  params,
}: {
  params: Promise<{ menuId: string; lang: string }>;
}) {
  const { menuId, lang } = await params;
  if (!isLocale(lang)) notFound();
  return <MenuView menuId={menuId} locale={lang} />;
}
