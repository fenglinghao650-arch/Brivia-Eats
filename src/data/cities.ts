export type City = {
  id: string;
  name_en: string;
  name_zh: string;
  center: [number, number]; // [lng, lat]
  food_intro: string;
};

export const CITIES: City[] = [
  {
    id: "hangzhou",
    name_en: "Hangzhou",
    name_zh: "杭州",
    center: [120.155, 30.255],
    food_intro:
      "Hangzhou's culinary philosophy, Hangbang Cai (杭帮菜), is defined by lightness, mildness, and the pursuit of freshness. Rooted in the city's heritage as a scholar's retreat, the cuisine splits between \"Lake Cuisine\" — freshwater fish and aquatic plants — and \"City Cuisine\" centered on domestic poultry and meat, with every dish carrying a story.",
  },
  {
    id: "shanghai",
    name_en: "Shanghai",
    name_zh: "上海",
    center: [121.473, 31.23],
    food_intro:
      "Shanghai's culinary identity, historically defined as Benbang (local) cuisine, reflects rapid urban evolution and cosmopolitan synthesis. Originally part of the Jiangnan culinary tradition, it became distinct in the late 19th century as Shanghai's status as a treaty port drew migrants from Jiangsu and Zhejiang. The resulting flavor profile—known as \"thick oil and red sauce\" (nongyou chi jiang)—balances deep soy savoriness with high sugar content, enhancing the natural umami of freshwater seafood and fatty pork.\n\nToday, Shanghai is experienced as a \"Dining Metropolis,\" where Michelin-starred restaurants coexist with historic street vendors. At its core, Benbang cuisine remains the foundation of the city's food culture. These restaurants are not just places to eat, but cultural repositories of mid-20th-century Shanghai aesthetics and social rituals. This category represents the transition from rural Jiangnan flavors to a refined urban banquet culture. Here, sugar is not merely additive—it historically functioned as both preservative and a marker of wealth and taste in a mercantile society.\n\nXiaolongbao is Shanghai's most iconic export, representing the pinnacle of Jiangnan \"dim sum\" engineering. Its craftsmanship—especially the balance of filling and the precision of its folds—is a benchmark of technical skill. It is a dish meant to be eaten immediately, straight from the steamer.\n\nShengjianbao, by contrast, is its more robust, street-level counterpart, with a crispy bottom and yeasted, bread-like skin. It embodies Shanghai's \"industrial rhythm,\" serving as a quick, high-calorie breakfast for over a century. The debate between full-leavened and half-leavened dough remains a key part of local culinary identity.",
  },
  {
    id: "beijing",
    name_en: "Beijing",
    name_zh: "北京",
    center: [116.397, 39.908],
    food_intro:
      "Beijing cuisine carries centuries of imperial influence — roast duck, lamb hotpot, hand-pulled noodles, and hearty northern flavors. Street food culture thrives alongside imperial banquet traditions.",
  },
  {
    id: "guangzhou",
    name_en: "Guangzhou",
    name_zh: "广州",
    center: [113.264, 23.129],
    food_intro:
      "The birthplace of Cantonese cooking. Guangzhou lives and breathes dim sum, roast meats, wonton noodles, and fresh seafood. Morning tea culture here is a way of life.",
  },
  {
    id: "chengdu",
    name_en: "Chengdu",
    name_zh: "成都",
    center: [104.066, 30.573],
    food_intro:
      "Chengdu is a UNESCO City of Gastronomy and the capital of Sichuan cuisine. Expect bold ma-la (numbing-spicy) flavors, hotpot, dan dan noodles, and vibrant street food at every corner.",
  },
  {
    id: "chongqing",
    name_en: "Chongqing",
    name_zh: "重庆",
    center: [106.551, 29.563],
    food_intro:
      "Chongqing is fiery hotpot country — bubbling red oil, river fish, and bold Sichuan-adjacent flavors shaped by its mountain geography and river culture. Not for the faint of palate.",
  },
];

export const DEFAULT_CITY_ID = "hangzhou";

export function getCityById(id: string): City | undefined {
  return CITIES.find((c) => c.id === id);
}
