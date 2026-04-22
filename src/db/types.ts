/**
 * Database Types for Brivia Eats
 * Aligned with: db/migrations/001_initial_schema.sql
 * 
 * These types represent the exact database row shapes.
 * Use domain types (src/domain/types.ts) for application logic.
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

export type UUID = string;
export type Timestamp = string; // ISO 8601 format

// =============================================================================
// ENUM TYPES (aligned with CHECK constraints)
// =============================================================================

// Canonical allergen tags from schema v1.1.1
export type AllergenTag =
  | 'gluten_wheat'
  | 'soy'
  | 'peanuts'
  | 'tree_nuts'
  | 'dairy'
  | 'egg'
  | 'fish'
  | 'shellfish'
  | 'sesame';

// Canonical dietary tags from schema v1.1.1
export type DietaryTag =
  | 'vegetarian'
  | 'vegan'
  | 'halal'
  | 'contains_pork'
  | 'contains_beef'
  | 'contains_lamb'
  | 'contains_poultry'
  | 'contains_seafood'
  | 'contains_alcohol';

// Spice levels
export type SpiceLevel = 'not_spicy' | 'mild' | 'medium' | 'spicy';

// Confidence levels for safety-critical data
export type ConfidenceLevel = 'confirmed' | 'unknown';

// Geo providers
export type GeoProvider = 'manual' | 'gaode' | 'google';

// Status enums
export type RestaurantStatus = 'active' | 'inactive';
export type MenuStatus = 'draft' | 'pending_review' | 'published' | 'archived';
export type DishStatus = 'draft' | 'pending_review' | 'published' | 'archived';
export type ReviewStatusType = 'draft' | 'pending_review' | 'approved';
export type AvailabilityStatus = 'available' | 'sold_out';
export type AIStatus = 'not_started' | 'drafted' | 'approved';

// Media enums
export type MediaOwnerType = 'restaurant' | 'dish';
export type MediaRole = 'logo' | 'cover' | 'gallery' | 'dish_hero' | 'dish_gallery';
export type MediaStatus = 'pending' | 'ready';

// ChangeLog entity types
export type ChangeLogEntityType = 'restaurant' | 'menu' | 'dish' | 'media';

// Review target types
export type ReviewTargetType = 'restaurant' | 'dish';
export type ReviewStatusEnum = 'visible' | 'hidden' | 'flagged';

// Raw submission status
export type RawSubmissionStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'skipped';

// AI job types and status
export type AIJobType = 'interpret_dish' | 'draft_story' | 'infer_clarity_name';
export type AIJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type AIResultReviewStatus = 'pending' | 'approved' | 'rejected' | 'revised';

// Variation types (aligned with schema v1.1.1)
export type VariationKind = 'stock' | 'custom';
export type StockVariationType = 'spice_level' | 'quantity' | 'protein' | 'add_on';
export type VariationSelectionMode = 'single' | 'multiple';

// =============================================================================
// JSONB TYPES (nested structures)
// =============================================================================

export interface VariationOption {
  id: string;
  name_native: string;
  name_en?: string;
  is_default: boolean;
  price_delta?: number;
  notes_en?: string;
}

export interface VariationGroup {
  id: string;
  kind: VariationKind;
  stock_type?: StockVariationType;
  custom_key?: string;
  label_en: string;
  selection_mode: VariationSelectionMode;
  is_required: boolean;
  apply_default_if_unselected: boolean;
  options: VariationOption[];
}

export interface IngredientRef {
  name_native: string;
  name_en?: string;
  is_hidden: boolean;
  notes_en?: string;
}

export interface MenuSection {
  id: string;
  title_native: string;    // Chinese section name (e.g., "冷菜")
  title_en: string;        // English section name (e.g., "Cold Dishes")
  description_native?: string;
  description_en?: string;
  dish_ids: string[];
  sort_order: number;
}

export interface Provenance {
  ingredients_source?: 'restaurant' | 'brivia_verified';
  allergens_source?: 'restaurant' | 'brivia_verified';
  dietary_source?: 'restaurant' | 'brivia_verified';
  spice_source?: 'restaurant' | 'brivia_verified';
  last_confirmed_at?: Timestamp;
}

export interface ConfidenceFlags {
  allergen_confidence: ConfidenceLevel;
  dietary_confidence: ConfidenceLevel;
  spice_confidence: ConfidenceLevel;
}

export interface PhotoUrl {
  url: string;
  role: MediaRole;
  is_primary: boolean;
}

// =============================================================================
// LAYER A: WORKING TABLES (Database Row Types)
// =============================================================================

export interface DbRestaurant {
  id: UUID;
  name_native: string;     // Restaurant name in Chinese (from intake)
  name_en: string | null;  // Restaurant name in English (added by Brivia)
  city: string;
  area: string | null;
  address_native: string;
  address_en: string | null;
  phone: string | null;
  hours_text: string | null;
  cover_media_id: UUID | null;
  gallery_media_ids: UUID[];
  about_short_en: string;
  about_long_en: string | null;
  tagline_en: string | null;  // Short tagline for display
  cuisine_tags: string[];
  geo_lat: number | null;
  geo_lng: number | null;
  geo_provider: GeoProvider | null;
  poi_external_ids: Record<string, unknown>;
  main_menu_id: UUID | null;
  badge_text: string;
  rating_avg: number | null;
  rating_count: number;
  status: RestaurantStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface DbMenu {
  id: UUID;
  restaurant_id: UUID;
  title_native: string | null;  // Menu title in Chinese (from intake)
  title_en: string;             // Menu title in English (added by Brivia)
  description_native: string | null;
  description_en: string | null;
  sections: MenuSection[];      // Bilingual sections
  status: MenuStatus;
  review_status: ReviewStatusType;
  reviewed_by: UUID | null;
  reviewed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  published_at: Timestamp | null;
  published_by: UUID | null;
}

export interface DbDish {
  id: UUID;
  menu_id: UUID;
  native_name: string;
  romanized_name: string;
  clarity_name_en: string;
  one_line_story_en: string;
  price: number | null;
  currency: string;
  availability: AvailabilityStatus;
  photo_media_ids: UUID[];
  hidden_ingredients_notes_en: string | null;
  cooking_methods: string[];
  spice_level: SpiceLevel;
  flavor_profile_tags: string[];
  allergens: AllergenTag[];
  dietary_flags: DietaryTag[];
  variations: VariationGroup[];
  status: DishStatus;
  review_status: ReviewStatusType;
  reviewed_by: UUID | null;
  reviewed_at: Timestamp | null;
  ai_status: AIStatus;
  rating_avg: number | null;
  rating_count: number;
  allergen_confidence: ConfidenceLevel;
  dietary_confidence: ConfidenceLevel;
  spice_confidence: ConfidenceLevel;
  provenance: Provenance;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface DbDishIngredient {
  id: UUID;
  dish_id: UUID;
  name_native: string;
  name_en: string | null;
  is_hidden: boolean;
  notes_en: string | null;
  sort_order: number;
}

export interface DbMedia {
  id: UUID;
  owner_type: MediaOwnerType;
  owner_id: UUID;
  url: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  caption_en: string | null;
  is_primary: boolean;
  sort_order: number;
  role: MediaRole;
  status: MediaStatus;
  uploaded_by: UUID | null;
  created_at: Timestamp;
}

export interface DbQRCode {
  id: UUID;
  restaurant_id: UUID;
  short_code: string;
  short_url: string;
  created_at: Timestamp;
}

export interface DbChangeLog {
  id: UUID;
  entity_type: ChangeLogEntityType;
  entity_id: UUID;
  changed_by: UUID | null;
  changed_at: Timestamp;
  changed_fields: string[];
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  reason: string | null;
}

export interface DbReview {
  id: UUID;
  target_type: ReviewTargetType;
  target_id: UUID;
  author_id: UUID | null;
  rating: number | null;
  text: string | null;
  language: string;
  status: ReviewStatusEnum;
  created_at: Timestamp;
}

// =============================================================================
// LAYER B: SNAPSHOT TABLES (Immutable)
// =============================================================================

export interface DbMenuSnapshot {
  id: UUID;
  menu_id: UUID;
  restaurant_id: UUID;
  version: number;
  restaurant_snapshot: Record<string, unknown>;  // Frozen restaurant data (bilingual)
  title_native: string | null;   // Frozen menu title in Chinese
  title_en: string;              // Frozen menu title in English
  description_native: string | null;
  description_en: string | null;
  sections: MenuSection[];       // Frozen bilingual sections
  published_at: Timestamp;
  published_by: UUID | null;
  checksum: string;
}

export interface DbDishSnapshot {
  id: UUID;
  menu_snapshot_id: UUID;
  dish_id: UUID;
  native_name: string;
  romanized_name: string;
  clarity_name_en: string;
  one_line_story_en: string;
  price: number | null;
  currency: string | null;
  spice_level: SpiceLevel;
  allergens: AllergenTag[];
  dietary_flags: DietaryTag[];
  cooking_methods: string[];
  flavor_profile_tags: string[];
  ingredients: IngredientRef[];
  hidden_ingredients_notes_en: string | null;
  variations: VariationGroup[];
  photo_urls: PhotoUrl[];
  provenance: Provenance;
  confidence_flags: ConfidenceFlags;
  section_id: string | null;
  sort_order: number;
}

export interface DbSnapshotMedia {
  id: UUID;
  menu_snapshot_id: UUID;
  original_media_id: UUID;
  url: string;
  role: MediaRole;
  owner_type: MediaOwnerType;
  owner_id: UUID;
  sort_order: number;
}

export interface DbPublishedMenu {
  restaurant_id: UUID;
  current_snapshot_id: UUID;
  published_at: Timestamp;
  published_by: UUID | null;
}

// =============================================================================
// LAYER C: RAW INTAKE ARCHIVE
// =============================================================================

export interface DbRawSubmission {
  id: UUID;
  source: string;
  external_id: string | null;
  restaurant_id: UUID | null;
  payload: Record<string, unknown>;
  status: RawSubmissionStatus;
  processed_at: Timestamp | null;
  error_message: string | null;
  created_entities: Record<string, UUID[]>;
  received_at: Timestamp;
}

export interface DbRawSubmissionFile {
  id: UUID;
  submission_id: UUID;
  original_filename: string;
  storage_key: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: Timestamp;
}

// =============================================================================
// LAYER D: AI JOB QUEUE
// =============================================================================

export interface DbAIJob {
  id: UUID;
  job_type: AIJobType;
  target_type: string;
  target_id: UUID;
  priority: number;
  status: AIJobStatus;
  input_payload: Record<string, unknown>;
  created_at: Timestamp;
  started_at: Timestamp | null;
  completed_at: Timestamp | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
}

export interface DbAIJobResult {
  id: UUID;
  job_id: UUID;
  output_payload: Record<string, unknown>;
  model_version: string | null;
  confidence_score: number | null;
  review_status: AIResultReviewStatus;
  reviewed_by: UUID | null;
  reviewed_at: Timestamp | null;
  created_at: Timestamp;
}

// =============================================================================
// INSERT TYPES (for creating new records)
// =============================================================================

export type InsertRestaurant = Omit<DbRestaurant, 'id' | 'created_at' | 'updated_at'> & {
  id?: UUID;
};

export type InsertMenu = Omit<DbMenu, 'id' | 'created_at' | 'updated_at'> & {
  id?: UUID;
};

export type InsertDish = Omit<DbDish, 'id' | 'created_at' | 'updated_at'> & {
  id?: UUID;
};

export type InsertDishIngredient = Omit<DbDishIngredient, 'id'> & {
  id?: UUID;
};

export type InsertMedia = Omit<DbMedia, 'id' | 'created_at'> & {
  id?: UUID;
};

export type InsertMenuSnapshot = Omit<DbMenuSnapshot, 'id' | 'published_at'> & {
  id?: UUID;
};

export type InsertDishSnapshot = Omit<DbDishSnapshot, 'id'> & {
  id?: UUID;
};

export type InsertRawSubmission = Omit<DbRawSubmission, 'id' | 'received_at'> & {
  id?: UUID;
};

export type InsertAIJob = Omit<DbAIJob, 'id' | 'created_at'> & {
  id?: UUID;
};

// =============================================================================
// UPDATE TYPES (for partial updates)
// =============================================================================

export type UpdateRestaurant = Partial<Omit<DbRestaurant, 'id' | 'created_at' | 'updated_at'>>;
export type UpdateMenu = Partial<Omit<DbMenu, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>>;
export type UpdateDish = Partial<Omit<DbDish, 'id' | 'menu_id' | 'created_at' | 'updated_at'>>;
export type UpdateMedia = Partial<Omit<DbMedia, 'id' | 'owner_type' | 'owner_id' | 'created_at'>>;

// =============================================================================
// QUERY RESULT TYPES (with joins)
// =============================================================================

export interface DishWithIngredients extends DbDish {
  ingredients: DbDishIngredient[];
}

export interface MenuWithDishes extends DbMenu {
  dishes: DishWithIngredients[];
}

export interface RestaurantWithMenu extends DbRestaurant {
  menu: MenuWithDishes | null;
}

export interface PublishedMenuView {
  restaurant: DbRestaurant;
  snapshot: DbMenuSnapshot;
  dishes: DbDishSnapshot[];
}
