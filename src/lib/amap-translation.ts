import OpenAI from "openai";
import type { AmapPoi } from "@/src/lib/amap-web-service";

export type AmapPoiTranslation = {
  name_en: string;
  address_en: string;
  tag_en: string;
};

function fallbackTranslation(poi: AmapPoi): AmapPoiTranslation {
  return {
    name_en: poi.name,
    address_en: poi.address,
    tag_en: poi.tag ?? "",
  };
}

function extractJsonObject(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("No JSON object found");
  }
}

export async function translateAmapPois(
  pois: AmapPoi[]
): Promise<Record<string, AmapPoiTranslation>> {
  const fallback = Object.fromEntries(
    pois.map((poi) => [poi.poi_id, fallbackTranslation(poi)])
  );

  if (!process.env.OPENAI_API_KEY || pois.length === 0) {
    return fallback;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const input = pois.map((poi) => ({
    id: poi.poi_id,
    name_native: poi.name,
    address_native: poi.address,
    business_area: poi.business_area ?? "",
    type: poi.type,
    tag_native: poi.tag ?? "",
  }));

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_TRANSLATION_MODEL || "gpt-4.1-mini",
      input: [
        "Translate Chinese AMap restaurant POI fields into clear English for a travel dining app.",
        "Return only JSON shaped as:",
        "{\"items\":[{\"id\":\"...\",\"name_en\":\"...\",\"address_en\":\"...\",\"tag_en\":\"...\"}]}",
        "Keep restaurant brand names recognizable. Do not invent hours, ratings, menus, allergens, or facts.",
        `Input: ${JSON.stringify({ items: input })}`,
      ].join("\n"),
    });

    const parsed = extractJsonObject(response.output_text) as {
      items?: Array<Partial<AmapPoiTranslation> & { id?: string }>;
    };

    const translated = { ...fallback };
    for (const item of parsed.items ?? []) {
      if (!item.id || !translated[item.id]) continue;
      translated[item.id] = {
        name_en: item.name_en || translated[item.id].name_en,
        address_en: item.address_en || translated[item.id].address_en,
        tag_en: item.tag_en || translated[item.id].tag_en,
      };
    }
    return translated;
  } catch (err) {
    console.error("[translateAmapPois]", err);
    return fallback;
  }
}
