/**
 * Locale support for the diner-facing menu.
 *
 * Dynamic content (dish names, stories, section titles) is translated once and stored
 * in menu_translations. The fields below are NOT machine-translated per render — they are
 * exact, curated dictionaries:
 *   - allergen / dietary / spice labels (safety-critical — must be precise, never guessed)
 *   - static UI chrome ("Add to cart", "Allergens", etc.)
 */

import type { AllergenTag, DietaryTag, SpiceLevel } from "@/src/mock";

export type Locale = "en" | "ja" | "ko" | "es" | "ar";

export const LOCALES: Locale[] = ["en", "ja", "ko", "es", "ar"];

/** Each language shown in its own script (for the picker). */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
  ko: "한국어",
  es: "Español",
  ar: "العربية",
};

/** Locales that render right-to-left. */
export const RTL_LOCALES: Locale[] = ["ar"];

export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}

// ── Allergen labels ──────────────────────────────────────────────────────────
export const ALLERGEN_LABELS_I18N: Record<Locale, Record<AllergenTag, string>> = {
  en: {
    gluten_wheat: "Gluten (wheat)", soy: "Soy", peanuts: "Peanuts", tree_nuts: "Tree nuts",
    dairy: "Dairy", egg: "Egg", fish: "Fish", shellfish: "Shellfish", sesame: "Sesame",
  },
  ja: {
    gluten_wheat: "小麦（グルテン）", soy: "大豆", peanuts: "落花生", tree_nuts: "木の実",
    dairy: "乳", egg: "卵", fish: "魚", shellfish: "甲殻類", sesame: "ごま",
  },
  ko: {
    gluten_wheat: "글루텐(밀)", soy: "대두", peanuts: "땅콩", tree_nuts: "견과류",
    dairy: "유제품", egg: "계란", fish: "생선", shellfish: "갑각류", sesame: "참깨",
  },
  es: {
    gluten_wheat: "Gluten (trigo)", soy: "Soja", peanuts: "Cacahuetes", tree_nuts: "Frutos secos",
    dairy: "Lácteos", egg: "Huevo", fish: "Pescado", shellfish: "Marisco", sesame: "Sésamo",
  },
  ar: {
    gluten_wheat: "الغلوتين (القمح)", soy: "الصويا", peanuts: "الفول السوداني", tree_nuts: "المكسرات",
    dairy: "منتجات الألبان", egg: "البيض", fish: "الأسماك", shellfish: "المحار", sesame: "السمسم",
  },
};

// ── Dietary labels ───────────────────────────────────────────────────────────
export const DIETARY_LABELS_I18N: Record<Locale, Record<DietaryTag, string>> = {
  en: {
    vegetarian: "Vegetarian", vegan: "Vegan", halal: "Halal",
    contains_pork: "Contains pork", contains_beef: "Contains beef", contains_lamb: "Contains lamb",
    contains_poultry: "Contains poultry", contains_seafood: "Contains seafood", contains_alcohol: "Contains alcohol",
  },
  ja: {
    vegetarian: "ベジタリアン", vegan: "ヴィーガン", halal: "ハラル",
    contains_pork: "豚肉を含む", contains_beef: "牛肉を含む", contains_lamb: "ラム肉を含む",
    contains_poultry: "鶏肉を含む", contains_seafood: "魚介類を含む", contains_alcohol: "アルコールを含む",
  },
  ko: {
    vegetarian: "채식", vegan: "비건", halal: "할랄",
    contains_pork: "돼지고기 포함", contains_beef: "소고기 포함", contains_lamb: "양고기 포함",
    contains_poultry: "가금류 포함", contains_seafood: "해산물 포함", contains_alcohol: "알코올 포함",
  },
  es: {
    vegetarian: "Vegetariano", vegan: "Vegano", halal: "Halal",
    contains_pork: "Contiene cerdo", contains_beef: "Contiene ternera", contains_lamb: "Contiene cordero",
    contains_poultry: "Contiene aves", contains_seafood: "Contiene marisco", contains_alcohol: "Contiene alcohol",
  },
  ar: {
    vegetarian: "نباتي", vegan: "نباتي صرف", halal: "حلال",
    contains_pork: "يحتوي على لحم الخنزير", contains_beef: "يحتوي على لحم البقر", contains_lamb: "يحتوي على لحم الضأن",
    contains_poultry: "يحتوي على الدواجن", contains_seafood: "يحتوي على المأكولات البحرية", contains_alcohol: "يحتوي على الكحول",
  },
};

// ── Spice labels ─────────────────────────────────────────────────────────────
export const SPICE_LABELS_I18N: Record<Locale, Record<SpiceLevel, string>> = {
  en: { not_spicy: "Not spicy", mild: "Mild", medium: "Medium", spicy: "Spicy" },
  ja: { not_spicy: "辛くない", mild: "ピリ辛", medium: "中辛", spicy: "辛い" },
  ko: { not_spicy: "안 매움", mild: "약간 매움", medium: "보통", spicy: "매움" },
  es: { not_spicy: "No picante", mild: "Suave", medium: "Medio", spicy: "Picante" },
  ar: { not_spicy: "غير حار", mild: "حار خفيف", medium: "حار متوسط", spicy: "حار" },
};

// ── Static UI chrome ─────────────────────────────────────────────────────────
export type MenuUIStrings = {
  back: string;
  cart: string;
  menuKicker: string;
  menuHeadline: string;
  menuSub: string;
  addToCart: string;
  keyIngredients: string;
  spiceLevel: string;
  allergens: string;
  notConfirmed: string;
  noneListed: string;
  dietary: string;
  noFlags: string;
  required: string;
  marketPrice: string;
  loading: string;
  notFound: string;
  goBack: string;
};

export const MENU_UI: Record<Locale, MenuUIStrings> = {
  en: {
    back: "Back", cart: "Cart", menuKicker: "Menu", menuHeadline: "Ordering confidence first",
    menuSub: "Tap a dish to expand details. Add to cart stays visible.",
    addToCart: "Add to cart", keyIngredients: "Key Ingredients", spiceLevel: "Spice Level",
    allergens: "Allergens", notConfirmed: "Not fully confirmed", noneListed: "None listed",
    dietary: "Dietary", noFlags: "No specific flags", required: "Required", marketPrice: "市价",
    loading: "Loading…", notFound: "Menu not found.", goBack: "Go back",
  },
  ja: {
    back: "戻る", cart: "カート", menuKicker: "メニュー", menuHeadline: "安心してご注文を",
    menuSub: "料理をタップすると詳細が開きます。",
    addToCart: "カートに追加", keyIngredients: "主な食材", spiceLevel: "辛さ",
    allergens: "アレルゲン", notConfirmed: "未確認", noneListed: "なし",
    dietary: "食事制限", noFlags: "特になし", required: "必須", marketPrice: "時価",
    loading: "読み込み中…", notFound: "メニューが見つかりません。", goBack: "戻る",
  },
  ko: {
    back: "뒤로", cart: "장바구니", menuKicker: "메뉴", menuHeadline: "안심하고 주문하세요",
    menuSub: "요리를 탭하면 상세 정보가 열립니다.",
    addToCart: "장바구니에 담기", keyIngredients: "주요 재료", spiceLevel: "맵기",
    allergens: "알레르기 유발 성분", notConfirmed: "미확인", noneListed: "없음",
    dietary: "식이 정보", noFlags: "해당 없음", required: "필수", marketPrice: "시가",
    loading: "불러오는 중…", notFound: "메뉴를 찾을 수 없습니다.", goBack: "뒤로 가기",
  },
  es: {
    back: "Atrás", cart: "Carrito", menuKicker: "Menú", menuHeadline: "Pide con confianza",
    menuSub: "Toca un plato para ver los detalles.",
    addToCart: "Añadir al carrito", keyIngredients: "Ingredientes principales", spiceLevel: "Nivel de picante",
    allergens: "Alérgenos", notConfirmed: "Sin confirmar", noneListed: "Ninguno",
    dietary: "Dietético", noFlags: "Sin indicaciones", required: "Obligatorio", marketPrice: "Precio de mercado",
    loading: "Cargando…", notFound: "Menú no encontrado.", goBack: "Volver",
  },
  ar: {
    back: "رجوع", cart: "السلة", menuKicker: "القائمة", menuHeadline: "اطلب بثقة",
    menuSub: "اضغط على أي طبق لعرض التفاصيل.",
    addToCart: "أضف إلى السلة", keyIngredients: "المكونات الرئيسية", spiceLevel: "مستوى الحرارة",
    allergens: "مسببات الحساسية", notConfirmed: "غير مؤكد", noneListed: "لا يوجد",
    dietary: "النظام الغذائي", noFlags: "لا توجد ملاحظات", required: "مطلوب", marketPrice: "سعر السوق",
    loading: "جارٍ التحميل…", notFound: "القائمة غير موجودة.", goBack: "العودة",
  },
};

/** "Choose your language" heading, shown in each language on the picker. */
export const PICKER_HEADING: Record<Locale, string> = {
  en: "Choose your language",
  ja: "言語を選択",
  ko: "언어 선택",
  es: "Elige tu idioma",
  ar: "اختر لغتك",
};
