/**
 * Mock data types for Brivia Eats frontend development.
 * Aligned with brivia_schema_v1_1.json
 */

// =============================================================================
// Enums (from schema)
// =============================================================================

export type SpiceLevel = "not_spicy" | "mild" | "medium" | "spicy";

export type AllergenTag =
  | "gluten_wheat"
  | "soy"
  | "peanuts"
  | "tree_nuts"
  | "dairy"
  | "egg"
  | "fish"
  | "shellfish"
  | "sesame";

export type DietaryTag =
  | "vegetarian"
  | "vegan"
  | "halal"
  | "contains_pork"
  | "contains_beef"
  | "contains_poultry"
  | "contains_seafood"
  | "contains_alcohol";

export type AllergenConfidence = "confirmed" | "unknown";

export type ReviewStatus = "approved" | "needs_review";

export type VariationKind = "stock" | "custom";
export type StockVariationType = "spice_level" | "quantity" | "protein" | "add_on";
export type SelectionMode = "single" | "multiple";

// =============================================================================
// Variation Types (from schema)
// =============================================================================

export type VariationOption = {
  id: string;
  name_native: string;
  name_en?: string;
  is_default: boolean;
  price_delta?: number;
  notes_en?: string;
};

export type VariationGroup = {
  id: string;
  kind: VariationKind;
  stock_type?: StockVariationType;
  custom_key?: string;
  label_en: string;
  selection_mode: SelectionMode;
  is_required: boolean;
  apply_default_if_unselected: boolean;
  options: VariationOption[];
};

// =============================================================================
// Ingredient Reference (from schema)
// =============================================================================

export type IngredientRef = {
  name_native: string;
  name_en?: string;
  is_hidden: boolean;
  notes_en?: string;
};

// =============================================================================
// Core Entities
// =============================================================================

export type Restaurant = {
  id: string;
  name_zh: string;
  name_en: string;
  location_display: string;
  cuisine_display: string;
  tagline: string;
  description: string;
};

export type Menu = {
  id: string;
  restaurant_id: string;
  name: string;
  currency: string;
  status: "draft" | "pending_review" | "published" | "archived";
};

export type MenuSection = {
  id: string;
  menu_id: string;
  name_zh: string;
  name_en: string;
  sort_order: number;
};

/**
 * Dish entity aligned with brivia_schema_v1_1.json
 * Inline expand displays (in order):
 * 1. Key Ingredients
 * 2. Spice Level
 * 3. Allergens (with confidence)
 * 4. Dietary Flags
 * 5. Variations
 */
export type Dish = {
  id: string;
  section_id: string;

  // Layer 1: Cultural Anchor
  native_name_zh: string;
  romanized: string;

  // Layer 2: Ordering Clarity
  layer2_clarity: string;

  // Layer 3: Cultural/Sensory Story
  layer3_story?: string;

  // Price
  price_display: string;

  // Image (optional - URL to dish photo)
  image_url?: string;

  // Inline Expand Fields (display order locked)
  core_ingredients: IngredientRef[];
  spice_level: SpiceLevel;
  allergens: AllergenTag[];
  allergen_confidence: AllergenConfidence;
  dietary_flags: DietaryTag[];
  variations?: VariationGroup[];

  // Review status
  review_status: ReviewStatus;
};

// =============================================================================
// Display Helpers
// =============================================================================

/** Human-readable allergen labels */
export const ALLERGEN_LABELS: Record<AllergenTag, string> = {
  gluten_wheat: "Gluten (wheat)",
  soy: "Soy",
  peanuts: "Peanuts",
  tree_nuts: "Tree nuts",
  dairy: "Dairy",
  egg: "Egg",
  fish: "Fish",
  shellfish: "Shellfish",
  sesame: "Sesame",
};

/** Human-readable dietary flag labels */
export const DIETARY_LABELS: Record<DietaryTag, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  halal: "Halal",
  contains_pork: "Contains pork",
  contains_beef: "Contains beef",
  contains_poultry: "Contains poultry",
  contains_seafood: "Contains seafood",
  contains_alcohol: "Contains alcohol",
};

/** Human-readable spice level labels */
export const SPICE_LABELS: Record<SpiceLevel, string> = {
  not_spicy: "Not spicy",
  mild: "Mild",
  medium: "Medium",
  spicy: "Spicy",
};
