export type Timestamp = string;

export type AllergenTag = string;
export type DietaryTag = string;

export type GeoProvider = "manual" | "gaode" | "google";
export type RestaurantStatus = "active" | "inactive";
export type MenuStatus = "draft" | "pending_review" | "published" | "archived";
export type ReviewStatus = "draft" | "pending_review" | "approved";
export type DishStatus = "draft" | "pending_review" | "published" | "archived";
export type AvailabilityStatus = "available" | "sold_out";
export type MediaOwnerType = "restaurant" | "dish";
export type MediaRole = "logo" | "cover" | "gallery" | "dish_hero" | "dish_gallery";
export type MediaStatus = "pending" | "ready";
export type ChangeLogEntityType = "restaurant" | "menu" | "dish" | "media";
export type VariationGroupType = "spice" | "add_on" | "size" | "preparation";
export type VariationSelectionMode = "single" | "multiple";

export type MenuSection = Record<string, unknown>;

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
  type: VariationGroupType;
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
  name: string;
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
  title_en: string;
  description_en?: string;
  sections: MenuSection[];
  status: MenuStatus;
  review_status: ReviewStatus;
  reviewed_by?: string;
  reviewed_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
  published_at?: Timestamp;
  published_by?: string;
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
  allergens: AllergenTag[];
  dietary_flags: DietaryTag[];
  flavor_profile_tags: string[];
  variations?: VariationGroup[];
  status: DishStatus;
  review_status: ReviewStatus;
  reviewed_by?: string;
  reviewed_at?: Timestamp;
  rating_avg?: number;
  rating_count?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  allergen_confidence: "confirmed" | "unknown";
  dietary_confidence: "confirmed" | "unknown";
  provenance: {
    ingredients_source: "restaurant" | "brivia_verified";
    allergens_source: "restaurant" | "brivia_verified";
    dietary_source: "restaurant" | "brivia_verified";
    last_confirmed_at?: Timestamp;
  };
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
