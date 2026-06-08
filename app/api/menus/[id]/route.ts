import { NextResponse } from "next/server";
import { getEnglishMenuPayload, getTranslatedMenuPayload } from "@/src/lib/menu-payload";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lang = new URL(req.url).searchParams.get("lang");
  try {
    // Non-English request: serve the stored translation if one exists.
    // Falls through to English when there's no translation for this locale.
    if (lang && lang !== "en") {
      const translated = await getTranslatedMenuPayload(id, lang);
      if (translated) return NextResponse.json(translated);
    }

    const payload = await getEnglishMenuPayload(id);
    if (!payload) {
      return NextResponse.json({ error: "Menu not found or not published" }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[GET /api/menus/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
