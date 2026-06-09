import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { generateMenuTranslations } from "@/src/lib/menu-translate";

// Translating several locales via OpenAI can take a while.
export const maxDuration = 60;

// POST /api/portal/restaurants/[id]/translate
// Regenerates JA/KO/ES versions of the restaurant's published menu.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const restaurant = await db.queryOne<{ main_menu_id: string | null }>(
      `SELECT main_menu_id FROM restaurants WHERE id = $1`,
      [id]
    );
    if (!restaurant?.main_menu_id) {
      return NextResponse.json({ error: "Restaurant has no menu" }, { status: 400 });
    }

    // Translations are built from the published snapshot — require a publish first.
    const published = await db.queryOne(
      `SELECT 1 FROM published_menus WHERE restaurant_id = $1`,
      [id]
    );
    if (!published) {
      return NextResponse.json(
        { error: "Publish the menu before generating translations" },
        { status: 400 }
      );
    }

    const result = await generateMenuTranslations(restaurant.main_menu_id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Translation failed";
    console.error("[POST /api/portal/restaurants/[id]/translate]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
