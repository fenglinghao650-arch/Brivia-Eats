/**
 * Lou Wai Lou Restaurant Mock Data
 * Hangzhou Zhejiang cuisine restaurant near West Lake
 */

import type {
  Dish,
  Menu,
  MenuSection,
  Restaurant,
} from "./types.mock";

// ============================================================================
// Restaurant
// ============================================================================

export const restaurant: Restaurant = {
  id: "rest_louwailou",
  name_zh: "楼外楼饭店",
  name_en: "Lou Wai Lou Restaurant",
  location_display: "West Lake (Xihu), Hangzhou",
  cuisine_display: "Zhejiang / Hangzhou Cuisine",
  tagline: "Historic lakeside dining since 1848",
  description:
    "A renowned Hangzhou institution overlooking West Lake, serving classic Zhejiang dishes for over 170 years.",
};

// ============================================================================
// Menu
// ============================================================================

export const menu: Menu = {
  id: "menu_louwailou_main",
  restaurant_id: "rest_louwailou",
  name: "Main Menu",
  currency: "CNY",
  status: "published",
};

// ============================================================================
// Sections
// ============================================================================

export const sections: MenuSection[] = [
  {
    id: "sec_cold",
    menu_id: "menu_louwailou_main",
    name_zh: "冷菜",
    name_en: "Cold Dishes",
    sort_order: 1,
  },
  {
    id: "sec_hot",
    menu_id: "menu_louwailou_main",
    name_zh: "热菜",
    name_en: "Hot Dishes",
    sort_order: 2,
  },
  {
    id: "sec_dim_sum",
    menu_id: "menu_louwailou_main",
    name_zh: "点心",
    name_en: "Dim Sum",
    sort_order: 3,
  },
  {
    id: "sec_drink",
    menu_id: "menu_louwailou_main",
    name_zh: "饮品",
    name_en: "Drinks",
    sort_order: 4,
  },
  {
    id: "sec_fruit",
    menu_id: "menu_louwailou_main",
    name_zh: "水果",
    name_en: "Fruit",
    sort_order: 5,
  },
];

// ============================================================================
// Dishes
// ============================================================================

export const dishes: Dish[] = [
  // ---------------------------------------------------------------------------
  // Cold Dishes (sec_cold)
  // ---------------------------------------------------------------------------
  {
    id: "dish_xihuxunyu",
    section_id: "sec_cold",
    native_name_zh: "西湖熏鱼",
    romanized: "Xi Hu Xun Yu",
    price_display: "¥28 / plate",
    layer2_clarity: "Smoked West Lake–Style Fish with Sweet Soy Glaze",
    layer3_story:
      "Lightly smoked and glazed freshwater fish, known for its glossy finish and balanced sweet-savory flavor typical of Hangzhou cuisine.",
    image_url: "/images/xihuxunyu.jpg",
    core_ingredients: [
      { name_native: "鱼", name_en: "Freshwater fish", is_hidden: false },
      { name_native: "酱油", name_en: "Soy sauce", is_hidden: false },
      { name_native: "糖", name_en: "Sugar", is_hidden: false },
      { name_native: "料酒", name_en: "Rice wine", is_hidden: false },
      { name_native: "姜", name_en: "Ginger", is_hidden: false },
    ],
    spice_level: "not_spicy",
    allergens: ["fish", "soy"],
    allergen_confidence: "confirmed",
    dietary_flags: ["contains_seafood", "contains_alcohol"],
    review_status: "approved",
  },
  {
    id: "dish_shuangkoubancai",
    section_id: "sec_cold",
    native_name_zh: "爽口拌菜",
    romanized: "Shuang Kou Ban Cai",
    price_display: "¥25 / plate",
    layer2_clarity: "Chilled Mixed Vegetables in Light Vinegar Dressing",
    layer3_story:
      "A refreshing cold dish featuring crisp seasonal vegetables, lightly dressed to awaken the palate.",
    image_url: "/images/shuangkoubancai.jpg",
    core_ingredients: [
      { name_native: "时蔬", name_en: "Mixed fresh vegetables", is_hidden: false },
      { name_native: "醋", name_en: "Light vinegar dressing", is_hidden: false },
      { name_native: "蒜", name_en: "Garlic", is_hidden: false },
    ],
    spice_level: "not_spicy",
    allergens: ["soy"],
    allergen_confidence: "unknown",
    dietary_flags: ["vegetarian", "vegan"],
    review_status: "needs_review",
  },

  // ---------------------------------------------------------------------------
  // Hot Dishes (sec_hot)
  // ---------------------------------------------------------------------------
  {
    id: "dish_bingtangjiayu",
    section_id: "sec_hot",
    native_name_zh: "冰糖甲鱼",
    romanized: "Bing Tang Jia Yu",
    price_display: "¥300 / serving",
    layer2_clarity: "Soft-Simmered Softshell Turtle with Rock Sugar & Soy Sauce",
    layer3_story:
      "A traditional Jiangnan delicacy slowly braised for richness, prized for its deep flavor and nourishing qualities.",
    image_url: "/images/bingtangjiayu.jpg",
    core_ingredients: [
      { name_native: "甲鱼", name_en: "Softshell turtle", is_hidden: false },
      { name_native: "冰糖", name_en: "Rock sugar", is_hidden: false },
      { name_native: "酱油", name_en: "Soy sauce", is_hidden: false },
      { name_native: "姜", name_en: "Ginger", is_hidden: false },
      { name_native: "绍兴酒", name_en: "Shaoxing wine", is_hidden: false },
    ],
    spice_level: "not_spicy",
    allergens: ["soy"],
    allergen_confidence: "confirmed",
    dietary_flags: ["contains_alcohol"],
    review_status: "needs_review",
  },
  {
    id: "dish_xiangsuyazi",
    section_id: "sec_hot",
    native_name_zh: "香酥鸭子",
    romanized: "Xiang Su Ya Zi",
    price_display: "¥98 / serving",
    layer2_clarity: "Crispy Aromatic Fried Duck",
    layer3_story:
      "Duck marinated and fried until the skin turns golden and fragrant, offering a crisp exterior and tender meat.",
    image_url: "/images/xiangsuyazi.jpg",
    core_ingredients: [
      { name_native: "鸭", name_en: "Duck", is_hidden: false },
      { name_native: "淀粉", name_en: "Flour or starch coating", is_hidden: false },
      { name_native: "香料", name_en: "Aromatic spices", is_hidden: false },
    ],
    spice_level: "not_spicy",
    allergens: ["gluten_wheat"],
    allergen_confidence: "unknown",
    dietary_flags: ["contains_poultry"],
    review_status: "approved",
  },
  {
    id: "dish_tangculiji",
    section_id: "sec_hot",
    native_name_zh: "糖醋里脊",
    romanized: "Tang Cu Li Ji",
    price_display: "¥48 / serving",
    layer2_clarity: "Sweet-and-Sour Pork Tenderloin",
    layer3_story:
      "Crispy pork strips coated in a bright sweet-and-sour sauce, a comforting classic loved for its balance of flavors.",
    image_url: "/images/tangculiji.jpg",
    core_ingredients: [
      { name_native: "猪里脊", name_en: "Pork tenderloin", is_hidden: false },
      { name_native: "糖", name_en: "Sugar", is_hidden: false },
      { name_native: "醋", name_en: "Vinegar", is_hidden: false },
      { name_native: "番茄酱", name_en: "Tomato-based sauce", is_hidden: false },
    ],
    spice_level: "not_spicy",
    allergens: ["gluten_wheat", "soy"],
    allergen_confidence: "confirmed",
    dietary_flags: ["contains_pork"],
    review_status: "approved",
  },
  {
    id: "dish_youmenchunsun",
    section_id: "sec_hot",
    native_name_zh: "油焖春笋",
    romanized: "You Men Chun Sun",
    price_display: "Market price",
    layer2_clarity: "Oil-Braised Spring Bamboo Shoots",
    layer3_story:
      "Young bamboo shoots gently braised to highlight their natural sweetness and tender texture, a seasonal Hangzhou specialty.",
    image_url: "/images/youmenchunsun.jpg",
    core_ingredients: [
      { name_native: "春笋", name_en: "Fresh spring bamboo shoots", is_hidden: false },
      { name_native: "酱油", name_en: "Soy sauce", is_hidden: false },
      { name_native: "糖", name_en: "Sugar", is_hidden: false },
    ],
    spice_level: "not_spicy",
    allergens: ["soy"],
    allergen_confidence: "confirmed",
    dietary_flags: ["vegetarian", "vegan"],
    review_status: "needs_review",
  },
  {
    id: "dish_yangshengshanyao",
    section_id: "sec_hot",
    native_name_zh: "养生山药",
    romanized: "Yang Sheng Shan Yao",
    price_display: "¥42 / serving",
    layer2_clarity: "Stir-Fried Chinese Yam for Wellness",
    layer3_story:
      "Lightly cooked Chinese yam valued in traditional cuisine for its mild sweetness and nourishing properties.",
    image_url: "/images/yangshengshanyao.jpg",
    core_ingredients: [
      { name_native: "山药", name_en: "Chinese yam", is_hidden: false },
      { name_native: "油", name_en: "Light oil", is_hidden: false },
    ],
    spice_level: "not_spicy",
    allergens: [],
    allergen_confidence: "confirmed",
    dietary_flags: ["vegetarian", "vegan"],
    review_status: "approved",
  },

  // ---------------------------------------------------------------------------
  // Dim Sum (sec_dim_sum)
  // ---------------------------------------------------------------------------
  {
    id: "dish_xianrouxiaolong",
    section_id: "sec_dim_sum",
    native_name_zh: "鲜肉小笼",
    romanized: "Xian Rou Xiao Long",
    price_display: "¥30 / serving",
    layer2_clarity: "Steamed Soup Dumplings with Fresh Pork",
    layer3_story:
      "Delicate dumplings filled with seasoned pork and savory broth, steamed and served piping hot.",
    image_url: "/images/xianrouxiaolong.jpg",
    core_ingredients: [
      { name_native: "猪肉", name_en: "Pork", is_hidden: false },
      { name_native: "面粉皮", name_en: "Wheat flour wrapper", is_hidden: false },
      { name_native: "肉汤", name_en: "Pork-based broth", is_hidden: false },
      { name_native: "姜", name_en: "Ginger", is_hidden: false },
    ],
    spice_level: "not_spicy",
    allergens: ["gluten_wheat"],
    allergen_confidence: "confirmed",
    dietary_flags: ["contains_pork"],
    variations: [
      {
        id: "var_xiaolong_qty",
        kind: "stock",
        stock_type: "quantity",
        label_en: "Quantity",
        selection_mode: "single",
        is_required: true,
        apply_default_if_unselected: true,
        options: [
          { id: "qty_6", name_native: "6个", name_en: "6 pieces", is_default: false },
          { id: "qty_8", name_native: "8个", name_en: "8 pieces", is_default: false },
          { id: "qty_10", name_native: "10个", name_en: "10 pieces", is_default: true },
        ],
      },
    ],
    review_status: "approved",
  },

  // ---------------------------------------------------------------------------
  // Drinks (sec_drink)
  // ---------------------------------------------------------------------------
  {
    id: "dish_zishuxingrenlu",
    section_id: "sec_drink",
    native_name_zh: "紫薯杏仁露｜现磨热饮",
    romanized: "Zi Shu Xing Ren Lu",
    price_display: "Market price",
    layer2_clarity: "Hot Fresh-Pressed Purple Sweet Potato & Almond Drink",
    layer3_story:
      "A warm, freshly blended drink with a smooth texture and gentle nutty sweetness, comforting and naturally fragrant.",
    image_url: "/images/zishuxingrenlu.jpg",
    core_ingredients: [
      { name_native: "紫薯", name_en: "Purple sweet potato", is_hidden: false },
      { name_native: "杏仁", name_en: "Almonds", is_hidden: false },
      { name_native: "水/牛奶", name_en: "Water or milk", is_hidden: false },
    ],
    spice_level: "not_spicy",
    allergens: ["tree_nuts", "dairy"],
    allergen_confidence: "unknown",
    dietary_flags: ["vegetarian"],
    review_status: "needs_review",
  },

  // ---------------------------------------------------------------------------
  // Fruit (sec_fruit)
  // ---------------------------------------------------------------------------
  {
    id: "dish_shuiguopinpan",
    section_id: "sec_fruit",
    native_name_zh: "水果拼盘",
    romanized: "Shui Guo Pin Pan",
    price_display: "¥28 / serving",
    layer2_clarity: "Seasonal Fresh Fruit Platter",
    layer3_story:
      "An assortment of fresh seasonal fruits, simply prepared to finish the meal on a light and refreshing note.",
    image_url: "/images/shuiguopinpan.jpg",
    core_ingredients: [
      { name_native: "时令水果", name_en: "Assorted seasonal fruits", is_hidden: false },
    ],
    spice_level: "not_spicy",
    allergens: [],
    allergen_confidence: "confirmed",
    dietary_flags: ["vegetarian", "vegan"],
    review_status: "approved",
  },
];

// ============================================================================
// Convenience Selectors (Pure Functions)
// ============================================================================

/**
 * Get all dishes belonging to a specific section.
 */
export function getDishesBySection(sectionId: string): Dish[] {
  return dishes.filter((dish) => dish.section_id === sectionId);
}

/**
 * Get menu overview including restaurant, menu, and sections.
 */
export function getMenuOverview(): {
  restaurant: Restaurant;
  menu: Menu;
  sections: MenuSection[];
} {
  return { restaurant, menu, sections };
}

/**
 * Get a dish by its ID.
 */
export function getDishById(dishId: string): Dish | undefined {
  return dishes.find((dish) => dish.id === dishId);
}
