import MenuView from "@/src/components/MenuView";

// Default (English) menu. In-app links point here; the QR language picker lives at
// /m/[menuId]/languages and localized menus at /m/[menuId]/[lang].
export default async function MenuPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { menuId } = await params;
  return <MenuView menuId={menuId} locale="en" />;
}
