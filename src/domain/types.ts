export type Timestamp = string;

// Canonical allergen tags from schema v1.1.1
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

// Canonical dietary tags from schema v1.1.1
export type DietaryTag =
  | "vegetarian"
  | "vegan"
  | "halal"
  | "contains_pork"
  | "contains_beef"
  | "contains_lamb"
  | "contains_poultry"
  | "contains_seafood"
  | "contains_alcohol";

// Spice levels from schema v1.1.1
export type SpiceLevel = "not_spicy" | "mild" | "medium" | "spicy";

// Confidence levels for safety-critical data
export type ConfidenceLevel = "confirmed" | "unknown";

export type GeoProvider = "manual" | "gaode" | "google";
export type RestaurantStatus = "active" | "inactive";
export type MenuStatus = "draft" | "pending_review" | "published" | "archived";
export type ReviewStatus = "draft" | "pending_review" | "approved";
export type DishStatus = "draft" | "pending_review" | "published" | "archived";
export type AvailabilityStatus = "available" | "sold_out";
export type AIStatus = "not_started" | "drafted" | "approved";
export type MediaOwnerType = "restaurant" | "dish";
export type MediaRole = "logo" | "cover" | "gallery" | "dish_hero" | "dish_gallery";
export type MediaStatus = "pending" | "ready";
export type ChangeLogEntityType = "restaurant" | "menu" | "dish" | "media";

// Variation types aligned with schema v1.1.1
export type VariationKind = "stock" | "custom";
export type StockVariationType = "spice_level" | "quantity" | "protein" | "add_on";
export type VariationSelectionMode = "single" | "multiple";

export type MenuSection = {
  id: string;
  title_native: string;    // Chinese section name (e.g., "冷菜")
  title_en: string;        // English section name (e.g., "Cold Dishes")
  description_native?: string;
  description_en?: string;
  dish_ids: string[];
  sort_order: number;
};

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
  selection_mode: VariationSelectionMode;
  is_required: boolean;
  apply_default_if_unselected: boolean;
  options: VariationOption[];
};

export type IngredientRef = {
  name_native: string;
  name_en?: string;
  is_hidden: boolean;
  notes_en?: string;
};

export type Restaurant = {
  id: string;
  name_native: string;     // Restaurant name in Chinese (from intake)
  name_en?: string;        // Restaurant name in English (added by Brivia)
  city: string;
  area?: string;
  address_native: string;
  address_en?: string;
  phone?: string;
  hours_text?: string;
  logo_media_id?: string;
  cover_media_id?: string;
  gallery_media_ids: string[];
  about_short_en: string;
  about_long_en?: string;
  tagline_en?: string;     // Short tagline for display
  cuisine_tags: string[];
  geo_lat?: number;
  geo_lng?: number;
  geo_provider?: GeoProvider;
  poi_external_ids?: Record<string, unknown>;
  main_menu_id: string;
  badge_text: string;
  rating_avg?: number;
  rating_count?: number;
  status: RestaurantStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type Menu = {
  id: string;
  restaurant_id: string;
  title_native?: string;    // Menu title in Chinese (from intake)
  title_en: string;         // Menu title in English (added by Brivia)
  description_native?: string;
  description_en?: string;
  sections: MenuSection[];  // Bilingual sections
  status: MenuStatus;
  review_status: ReviewStatus;
  reviewed_by?: string;
  reviewed_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
  published_at?: Timestamp;
  published_by?: string;
};

export type Provenance = {
  ingredients_source?: "restaurant" | "brivia_verified";
  allergens_source?: "restaurant" | "brivia_verified";
  dietary_source?: "restaurant" | "brivia_verified";
  spice_source?: "restaurant" | "brivia_verified";
  last_confirmed_at?: Timestamp;
};

export type Dish = {
  id: string;
  menu_id: string;
  native_name: string;
  romanized_name: string;
  clarity_name_en: string;
  one_line_story_en: string;
  price?: number;
  currency?: string;
  availability?: AvailabilityStatus;
  photo_media_ids: string[];
  core_ingredients: IngredientRef[];
  hidden_ingredients_notes_en?: string;
  cooking_methods: string[];
  spice_level: SpiceLevel;
  allergens: AllergenTag[];
  dietary_flags: DietaryTag[];
  flavor_profile_tags: string[];
  variations?: VariationGroup[];
  status: DishStatus;
  review_status: ReviewStatus;
  reviewed_by?: string;
  reviewed_at?: Timestamp;
  ai_status: AIStatus;
  rating_avg?: number;
  rating_count?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  allergen_confidence: ConfidenceLevel;
  dietary_confidence: ConfidenceLevel;
  spice_confidence: ConfidenceLevel;
  provenance: Provenance;
};

export type Media = {
  id: string;
  owner_type: MediaOwnerType;
  owner_id: string;
  url: string;
  mime_type: string;
  width?: number;
  height?: number;
  size_bytes?: number;
  caption_en?: string;
  is_primary: boolean;
  sort_order?: number;
  uploaded_by: string;
  created_at: Timestamp;
  role: MediaRole;
  status: MediaStatus;
};

export type QRCode = {
  id: string;
  restaurant_id: string;
  short_code: string;
  short_url: string;
  created_at: Timestamp;
};

export type ChangeLog = {
  id: string;
  entity_type: ChangeLogEntityType;
  entity_id: string;
  changed_by: string;
  changed_at: Timestamp;
  changed_fields: string[];
  before_snapshot?: Record<string, unknown>;
  after_snapshot?: Record<string, unknown>;
  reason?: string;
};
