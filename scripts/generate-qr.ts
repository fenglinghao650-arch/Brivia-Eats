/**
 * Generate branded QR codes (Brivia "B" logo centered) for restaurant menus.
 *
 *   npx tsx scripts/generate-qr.ts
 *
 * Output: qr-codes/<slug>.png  (1200×1200, charcoal-on-white, logo in center)
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
  "/Users/linghaofeng/Desktop/Brivia/logo&designs/Home/Brand name/Frame 92.png";
const OUT_DIR = path.join(process.cwd(), "qr-codes");

// path = what gets appended to BASE_URL.
const TARGETS = [
  {
    slug: "yunshan-zhuyuan",
    label: "云山竺院 · Yun Shan Zhu Yuan",
    path: "/m/3e3fee9c-89e4-47ac-921a-3df8162cec89",
  },
  {
    slug: "131-cha",
    label: "131茶（梅家坞店）· 131 Cha",
    path: "/m/32210029-fb15-40bb-80f8-b03428aef835",
  },
  {
    // Has ja/ko/es translations → land on the language picker.
    slug: "shanghai-jianbing",
    label: "上海早餐煎饼果子 · Shanghai Breakfast Jianbing",
    path: "/m/7019ea9d-2b7c-487c-99e9-e32c95e8bde7/languages",
  },
];

const SIZE = 1200; // px, final QR canvas
const DARK = "#1e1e1e"; // Brivia charcoal
const LIGHT = "#ffffff";
const LOGO_FRAC = 0.2; // logo ~20% of QR width
const PAD = 0.18; // white card padding around logo, as fraction of logo size

async function buildLogoCard(): Promise<Buffer> {
  const logoSize = Math.round(SIZE * LOGO_FRAC);
  const cardSize = Math.round(logoSize * (1 + PAD * 2));
  const radius = Math.round(cardSize * 0.22);

  // White rounded card so the logo sits cleanly over the QR modules.
  const card = await sharp({
    create: {
      width: cardSize,
      height: cardSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${cardSize}" height="${cardSize}"><rect width="${cardSize}" height="${cardSize}" rx="${radius}" ry="${radius}" fill="white"/></svg>`
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  // Round the logo's own corners to match the card.
  const logoRadius = Math.round(logoSize * 0.22);
  const logo = await sharp(LOGO_PATH)
    .resize(logoSize, logoSize, { fit: "cover" })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${logoSize}" height="${logoSize}"><rect width="${logoSize}" height="${logoSize}" rx="${logoRadius}" ry="${logoRadius}" fill="white"/></svg>`
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const offset = Math.round((cardSize - logoSize) / 2);
  return sharp(card)
    .composite([{ input: logo, top: offset, left: offset }])
    .png()
    .toBuffer();
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const logoCard = await buildLogoCard();
  const cardMeta = await sharp(logoCard).metadata();
  const cardSize = cardMeta.width!;

  for (const t of TARGETS) {
    const url = `${BASE_URL}${t.path}`;
    const qrBuffer = await QRCode.toBuffer(url, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: SIZE,
      color: { dark: DARK, light: LIGHT },
    });

    const offset = Math.round((SIZE - cardSize) / 2);
    const out = path.join(OUT_DIR, `${t.slug}.png`);
    await sharp(qrBuffer)
      .composite([{ input: logoCard, top: offset, left: offset }])
      .png()
      .toFile(out);

    console.log(`✓ ${t.label}\n  → ${url}\n  → ${out}\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
