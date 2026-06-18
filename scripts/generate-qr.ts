/**
 * Generate print-ready menu QR cards for Brivia restaurants.
 *
 *   npx tsx scripts/generate-qr.ts
 *
 * Each card mirrors the Brivience brand: Playfair Display + DM Sans, charcoal
 * text, warm-gold accents, on a cream surface. Restaurant name (Chinese +
 * English) sits above the branded QR (Brivia "B" logo centered). Every card
 * carries a gold language row (English always first; translated menus list
 * their extra locales), which also keeps all cards the same dimensions.
 *
 * Output: qr-codes/<slug>.png
 *
 * QR uses error-correction level H (~30% recoverable) so the centered logo
 * never breaks scanning. Edit BASE_URL / TARGETS below to add restaurants.
 */
import { promises as fs } from "fs";
import path from "path";
import QRCode from "qrcode";
import sharp from "sharp";

const BASE_URL = "https://www.brivia.app";
const LOGO_PATH =
  "/Users/linghaofeng/Brivience-Dev/Brivience website/public/brand/Home/Brand name/Frame 92.png";
const OUT_DIR = path.join(process.cwd(), "qr-codes");
const FONTS = path.join(process.cwd(), "scripts", "fonts");
const PLAYFAIR = path.join(FONTS, "PlayfairDisplay.ttf");
const DMSANS = path.join(FONTS, "DMSans.ttf");

const LOCALE_NAMES: Record<string, string> = {
  ja: "日本語",
  ko: "한국어",
  es: "Español",
  ar: "العربية",
};

const TARGETS = [
  {
    slug: "yunshan-zhuyuan",
    nameNative: "云山竺院",
    nameEn: "Yun Shan Zhu Yuan",
    path: "/m/3e3fee9c-89e4-47ac-921a-3df8162cec89",
    locales: [] as string[],
  },
  {
    slug: "131-cha",
    nameNative: "131茶（梅家坞店）",
    nameEn: "131 Cha",
    path: "/m/32210029-fb15-40bb-80f8-b03428aef835",
    locales: [] as string[],
  },
  {
    slug: "shanghai-jianbing",
    nameNative: "上海早餐煎饼果子",
    nameEn: "Shanghai Breakfast Jianbing",
    path: "/m/7019ea9d-2b7c-487c-99e9-e32c95e8bde7/languages",
    locales: ["ja", "ko", "es"],
  },
  // ── Intake batch (serials 35–40), translated ja/ko/es/ar ──────────────────
  {
    slug: "lao-shanghai-huntun",
    nameNative: "老上海馄饨铺",
    nameEn: "Lao Shang Hai Hun Tun Pu",
    path: "/m/29e019a6-1c5a-4e0f-8621-bdd0419f6594/languages",
    locales: ["ja", "ko", "es", "ar"],
  },
  {
    slug: "fu-a-long",
    nameNative: "富阿龙鲜炒鸡",
    nameEn: "Fu A Long Xian Chao Ji",
    path: "/m/b7828d13-4b5d-451f-a973-fce6fe14a899/languages",
    locales: ["ja", "ko", "es", "ar"],
  },
  {
    slug: "fu-xiao-guan",
    nameNative: "富小馆烧烤（山西南路店）",
    nameEn: "Fu Xiao Guan Shao Kao",
    path: "/m/e7781007-4c77-4792-b3dd-68a5301de08f/languages",
    locales: ["ja", "ko", "es", "ar"],
  },
  {
    slug: "fang-gugu-huangyu",
    nameNative: "芳姑姑沪上黄鱼面",
    nameEn: "Fang Gu Gu Hu Shang Huang Yu Mian",
    path: "/m/a31658f3-e2c9-49ba-bb82-cb8d29b4ff04/languages",
    locales: ["ja", "ko", "es", "ar"],
  },
  {
    slug: "yi-feng-nian",
    nameNative: "奕丰年早餐店",
    nameEn: "Yi Feng Nian Zao Can Dian",
    path: "/m/94662cbc-2e99-4555-b0c1-8ba4434fbf85/languages",
    locales: ["ja", "ko", "es", "ar"],
  },
  {
    slug: "jin-pin-niurou",
    nameNative: "金品牛肉店",
    nameEn: "Jin Pin Niu Rou Dian",
    path: "/m/1c1b58bb-b7c6-4567-a3c4-f2be67b555d9/languages",
    locales: ["ja", "ko", "es", "ar"],
  },
];

// ---- Brand tokens (from the Brivience website) --------------------------
const W = 1200;
const CREAM = "#fbf9f1";
const CHARCOAL = "#1e1e1e";
const INK_SOFT = "#4a4a4a";
const GOLD = "#b8860b";
const PANEL_BORDER = "#ece6d6";

const QR_RENDER = 1200;
const QR_SIZE = 820;
const PANEL_PAD = 36;
const LOGO_FRAC = 0.2;
const LOGO_CARD_PAD = 0.18;

const PANEL = QR_SIZE + PANEL_PAD * 2;
const PANEL_X = Math.round((W - PANEL) / 2);
const QR_LEFT = PANEL_X + PANEL_PAD;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const centerX = (w: number) => Math.round((W - w) / 2);

// Render a single line of text with a specific font file. Returns the raster
// plus its measured size so callers can position it. CJK glyphs missing from a
// Latin font fall back to system fonts automatically.
async function renderLine(
  content: string,
  font: string,
  fontfile: string,
  color: string,
  letterSpacing = 0
): Promise<{ buf: Buffer; w: number; h: number }> {
  const markup = letterSpacing
    ? `<span foreground="${color}" letter_spacing="${letterSpacing}">${esc(content)}</span>`
    : `<span foreground="${color}">${esc(content)}</span>`;
  const buf = await sharp({
    text: { text: markup, font, fontfile, rgba: true, dpi: 220 },
  })
    .png()
    .toBuffer();
  const meta = await sharp(buf).metadata();
  return { buf, w: meta.width ?? 0, h: meta.height ?? 0 };
}

async function buildLogoCard(): Promise<Buffer> {
  const logoSize = Math.round(QR_RENDER * LOGO_FRAC);
  const cardSize = Math.round(logoSize * (1 + LOGO_CARD_PAD * 2));
  const radius = Math.round(cardSize * 0.22);

  const card = await sharp({
    create: { width: cardSize, height: cardSize, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: Buffer.from(`<svg width="${cardSize}" height="${cardSize}"><rect width="${cardSize}" height="${cardSize}" rx="${radius}" ry="${radius}" fill="white"/></svg>`), blend: "dest-in" }])
    .png()
    .toBuffer();

  const logoRadius = Math.round(logoSize * 0.22);
  const logo = await sharp(LOGO_PATH)
    .resize(logoSize, logoSize, { fit: "cover" })
    .composite([{ input: Buffer.from(`<svg width="${logoSize}" height="${logoSize}"><rect width="${logoSize}" height="${logoSize}" rx="${logoRadius}" ry="${logoRadius}" fill="white"/></svg>`), blend: "dest-in" }])
    .png()
    .toBuffer();

  const offset = Math.round((cardSize - logoSize) / 2);
  return sharp(card).composite([{ input: logo, top: offset, left: offset }]).png().toBuffer();
}

async function buildQr(url: string, logoCard: Buffer): Promise<Buffer> {
  const qr = await QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: QR_RENDER,
    color: { dark: CHARCOAL, light: "#ffffff" },
  });
  const cardMeta = await sharp(logoCard).metadata();
  const offset = Math.round((QR_RENDER - (cardMeta.width ?? 0)) / 2);
  return sharp(qr).composite([{ input: logoCard, top: offset, left: offset }]).png().toBuffer();
}

async function buildCard(target: (typeof TARGETS)[number], qr: Buffer): Promise<Buffer> {
  // Text lines (rendered, then stacked).
  const nameCn = await renderLine(target.nameNative, "Songti SC Bold 30", PLAYFAIR, CHARCOAL);
  const nameEn = await renderLine(target.nameEn.toUpperCase(), "Playfair Display Medium 15", PLAYFAIR, INK_SOFT, 3000);
  // Every card shows the language row (English first) so all cards share the
  // same dimensions; translated menus also list their extra locales.
  const langText = ["English", ...target.locales.map((l) => LOCALE_NAMES[l] ?? l)].join("    ·    ");
  const lang = await renderLine(langText, "DM Sans 13", DMSANS, GOLD, 1000);

  // Fixed vertical slots → every card is exactly the same height, regardless
  // of glyphs. Each text line is centered within its slot to absorb the
  // few-pixel height variance between scripts.
  const RULE_W = 64;
  const RULE_H = 3;
  const CN_SLOT = 92;
  const EN_SLOT = 38;
  const LANG_SLOT = 44;

  const cnSlotTop = 80;
  const ruleY = cnSlotTop + CN_SLOT + 20;
  const enSlotTop = ruleY + RULE_H + 22;
  const panelY = enSlotTop + EN_SLOT + 46;
  const panelBottom = panelY + PANEL;
  const langSlotTop = panelBottom + 50;
  const H = langSlotTop + LANG_SLOT + 70;

  const slot = (top: number, slotH: number, lineH: number) =>
    top + Math.round((slotH - lineH) / 2);
  const nameCnY = slot(cnSlotTop, CN_SLOT, nameCn.h);
  const nameEnY = slot(enSlotTop, EN_SLOT, nameEn.h);
  const langY = slot(langSlotTop, LANG_SLOT, lang.h);

  // Background: cream + white QR panel + gold accent rule.
  const bg = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="${CREAM}"/>
      <rect x="${centerX(RULE_W)}" y="${ruleY}" width="${RULE_W}" height="${RULE_H}" rx="1.5" fill="${GOLD}"/>
      <rect x="${PANEL_X}" y="${panelY}" width="${PANEL}" height="${PANEL}" rx="44" ry="44"
            fill="#ffffff" stroke="${PANEL_BORDER}" stroke-width="2"/>
    </svg>`
  );

  const qrResized = await sharp(qr).resize(QR_SIZE, QR_SIZE).png().toBuffer();

  const layers: sharp.OverlayOptions[] = [
    { input: qrResized, top: panelY + PANEL_PAD, left: QR_LEFT },
    { input: nameCn.buf, top: nameCnY, left: centerX(nameCn.w) },
    { input: nameEn.buf, top: nameEnY, left: centerX(nameEn.w) },
    { input: lang.buf, top: langY, left: centerX(lang.w) },
  ];

  return sharp(bg).composite(layers).png().toBuffer();
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const logoCard = await buildLogoCard();

  for (const t of TARGETS) {
    const url = `${BASE_URL}${t.path}`;
    const qr = await buildQr(url, logoCard);
    const card = await buildCard(t, qr);
    const out = path.join(OUT_DIR, `${t.slug}.png`);
    await fs.writeFile(out, card);
    console.log(`✓ ${t.nameNative} ${t.nameEn}\n  → ${url}\n  → ${out}\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
