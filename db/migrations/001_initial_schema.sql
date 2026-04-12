-- ============================================================================
-- Brivia Eats Database Schema v1.0
-- Migration: 001_initial_schema.sql
-- Aligned with: brivia_schema_v1_1.json (canonical schema v1.1.1)
-- 
-- Layers:
--   A. Working Tables (editable, canonical entities)
--   B. Snapshot Tables (immutable, published versions)
--   C. Raw Intake Archive (original submissions)
--   D. AI Job Queue (async processing)
-- ============================================================================

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- LAYER A: WORKING TABLES (Canonical Entities)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- MEDIA (created first to allow FKs from other tables)
-- Stores all uploaded assets with semantic roles
-- -----------------------------------------------------------------------------
CREATE TABLE media (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type      TEXT NOT NULL CHECK (owner_type IN ('restaurant', 'dish')),
    owner_id        UUID NOT NULL,
    url             TEXT NOT NULL,
    mime_type       TEXT NOT NULL,
    width           INTEGER,
    height          INTEGER,
    size_bytes      BIGINT,
    caption_en      TEXT,
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      INTEGER DEFAULT 0,
    role            TEXT NOT NULL CHECK (role IN ('logo', 'cover', 'gallery', 'dish_hero', 'dish_gallery')),
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready')),
    uploaded_by     UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE media IS 'All uploaded media assets with semantic roles';
COMMENT ON COLUMN media.owner_type IS 'Polymorphic owner: restaurant or dish';
COMMENT ON COLUMN media.role IS 'Semantic role: logo, cover, gallery, dish_hero, dish_gallery';

-- -----------------------------------------------------------------------------
-- RESTAURANTS
-- Restaurant master records (bilingual: name_native from intake, name_en from Brivia)
-- -----------------------------------------------------------------------------
CREATE TABLE restaurants (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_native         TEXT NOT NULL,      -- Restaurant name in Chinese (from intake)
    name_en             TEXT,               -- Restaurant name in English (added by Brivia)
    city                TEXT NOT NULL,
    area                TEXT,
    address_native      TEXT NOT NULL,
    address_en          TEXT,
    phone               TEXT,
    hours_text          TEXT,
    cover_media_id      UUID REFERENCES media(id) ON DELETE SET NULL,
    gallery_media_ids   UUID[] DEFAULT '{}',
    about_short_en      TEXT NOT NULL,
    about_long_en       TEXT,
    tagline_en          TEXT,               -- Short tagline for display
    cuisine_tags        TEXT[] DEFAULT '{}',
    geo_lat             NUMERIC(10, 7),
    geo_lng             NUMERIC(10, 7),
    geo_provider        TEXT CHECK (geo_provider IN ('manual', 'gaode', 'google')),
    poi_external_ids    JSONB DEFAULT '{}',
    main_menu_id        UUID,  -- FK added after menus table created
    badge_text          TEXT NOT NULL DEFAULT '',
    rating_avg          NUMERIC(2, 1),
    rating_count        INTEGER DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE restaurants IS 'Restaurant master records. name_native from intake, name_en added by Brivia.';
COMMENT ON COLUMN restaurants.name_native IS 'Restaurant name in native script (Chinese)';
COMMENT ON COLUMN restaurants.name_en IS 'Restaurant name in English (interpreted by Brivia)';
COMMENT ON COLUMN restaurants.tagline_en IS 'Short tagline for display';
COMMENT ON COLUMN restaurants.main_menu_id IS 'Primary menu for this restaurant';
COMMENT ON COLUMN restaurants.cuisine_tags IS 'Array of cuisine type tags';

-- -----------------------------------------------------------------------------
-- MENUS
-- Menu containers with sections (JSONB) - bilingual
-- -----------------------------------------------------------------------------
CREATE TABLE menus (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    title_native    TEXT,               -- Menu title in Chinese (from intake)
    title_en        TEXT NOT NULL,      -- Menu title in English (added by Brivia)
    description_native TEXT,
    description_en  TEXT,
    sections        JSONB NOT NULL DEFAULT '[]',  -- MenuSection[] bilingual
    status          TEXT NOT NULL DEFAULT 'draft' 
                    CHECK (status IN ('draft', 'pending_review', 'published', 'archived')),
    review_status   TEXT NOT NULL DEFAULT 'draft'
                    CHECK (review_status IN ('draft', 'pending_review', 'approved')),
    reviewed_by     UUID,
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at    TIMESTAMPTZ,
    published_by    UUID
);

COMMENT ON TABLE menus IS 'Menu containers. title_native from intake, title_en added by Brivia.';
COMMENT ON COLUMN menus.title_native IS 'Menu title in native script (Chinese)';
COMMENT ON COLUMN menus.sections IS 'JSONB array of MenuSection: {id, title_native, title_en, dish_ids, sort_order}';

-- Add FK from restaurants.main_menu_id -> menus.id
ALTER TABLE restaurants 
    ADD CONSTRAINT fk_restaurants_main_menu 
    FOREIGN KEY (main_menu_id) REFERENCES menus(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- DISHES
-- Individual dish records with 3-layer naming, safety info, variations
-- -----------------------------------------------------------------------------
CREATE TABLE dishes (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id                     UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    
    -- 3-Layer Naming System
    native_name                 TEXT NOT NULL,      -- Layer 1: Original script
    romanized_name              TEXT NOT NULL,      -- Layer 1: Romanized
    clarity_name_en             TEXT NOT NULL,      -- Layer 2: Plain English description
    one_line_story_en           TEXT NOT NULL,      -- Layer 3: Cultural story
    
    -- Pricing
    price                       NUMERIC(10, 2),
    currency                    TEXT DEFAULT 'CNY',
    availability                TEXT DEFAULT 'available' 
                                CHECK (availability IN ('available', 'sold_out')),
    
    -- Media references (array of UUIDs)
    photo_media_ids             UUID[] DEFAULT '{}',
    
    -- Ingredients (normalized in dish_ingredients table)
    hidden_ingredients_notes_en TEXT,
    
    -- Cooking & Flavor
    cooking_methods             TEXT[] DEFAULT '{}',
    spice_level                 TEXT NOT NULL DEFAULT 'not_spicy'
                                CHECK (spice_level IN ('not_spicy', 'mild', 'medium', 'spicy')),
    flavor_profile_tags         TEXT[] DEFAULT '{}',
    
    -- Safety-critical fields (canonical enums as text arrays)
    allergens                   TEXT[] DEFAULT '{}',
    dietary_flags               TEXT[] DEFAULT '{}',
    
    -- Variations (JSONB for nested VariationGroup[])
    variations                  JSONB DEFAULT '[]',
    
    -- Workflow status
    status                      TEXT NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'pending_review', 'published', 'archived')),
    review_status               TEXT NOT NULL DEFAULT 'draft'
                                CHECK (review_status IN ('draft', 'pending_review', 'approved')),
    reviewed_by                 UUID,
    reviewed_at                 TIMESTAMPTZ,
    ai_status                   TEXT NOT NULL DEFAULT 'not_started'
                                CHECK (ai_status IN ('not_started', 'drafted', 'approved')),
    
    -- Ratings (future use)
    rating_avg                  NUMERIC(2, 1),
    rating_count                INTEGER DEFAULT 0,
    
    -- Confidence flags for safety-critical data
    allergen_confidence         TEXT DEFAULT 'unknown' 
                                CHECK (allergen_confidence IN ('confirmed', 'unknown')),
    dietary_confidence          TEXT DEFAULT 'unknown' 
                                CHECK (dietary_confidence IN ('confirmed', 'unknown')),
    spice_confidence            TEXT DEFAULT 'unknown' 
                                CHECK (spice_confidence IN ('confirmed', 'unknown')),
    
    -- Provenance tracking
    provenance                  JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE dishes IS 'Individual dish records with 3-layer naming';
COMMENT ON COLUMN dishes.allergens IS 'Canonical allergen tags: gluten_wheat, soy, peanuts, tree_nuts, dairy, egg, fish, shellfish, sesame';
COMMENT ON COLUMN dishes.dietary_flags IS 'Canonical dietary tags: vegetarian, vegan, halal, contains_pork, contains_beef, contains_poultry, contains_seafood, contains_alcohol';
COMMENT ON COLUMN dishes.variations IS 'JSONB array of VariationGroup objects';
COMMENT ON COLUMN dishes.provenance IS 'Source tracking: ingredients_source, allergens_source, dietary_source, spice_source';

-- -----------------------------------------------------------------------------
-- DISH_INGREDIENTS
-- Normalized core ingredients for queryability
-- -----------------------------------------------------------------------------
CREATE TABLE dish_ingredients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dish_id         UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    name_native     TEXT NOT NULL,
    name_en         TEXT,
    is_hidden       BOOLEAN NOT NULL DEFAULT FALSE,
    notes_en        TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE dish_ingredients IS 'Normalized ingredients for each dish';
COMMENT ON COLUMN dish_ingredients.is_hidden IS 'Hidden ingredients not shown prominently';

-- -----------------------------------------------------------------------------
-- QR_CODES
-- Short-link QR mappings per restaurant
-- -----------------------------------------------------------------------------
CREATE TABLE qr_codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    short_code      TEXT NOT NULL UNIQUE,
    short_url       TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE qr_codes IS 'QR code short-link mappings';

-- -----------------------------------------------------------------------------
-- CHANGE_LOGS
-- Audit trail for all entity mutations
-- -----------------------------------------------------------------------------
CREATE TABLE change_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     TEXT NOT NULL CHECK (entity_type IN ('restaurant', 'menu', 'dish', 'media')),
    entity_id       UUID NOT NULL,
    changed_by      UUID,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    changed_fields  TEXT[] NOT NULL DEFAULT '{}',
    before_snapshot JSONB,
    after_snapshot  JSONB,
    reason          TEXT
);

COMMENT ON TABLE change_logs IS 'Audit log for all entity changes';
COMMENT ON COLUMN change_logs.before_snapshot IS 'Entity state before mutation';
COMMENT ON COLUMN change_logs.after_snapshot IS 'Entity state after mutation';

-- -----------------------------------------------------------------------------
-- REVIEWS
-- User reviews (future use, MVP excluded from UI)
-- -----------------------------------------------------------------------------
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type     TEXT NOT NULL CHECK (target_type IN ('restaurant', 'dish')),
    target_id       UUID NOT NULL,
    author_id       UUID,
    rating          INTEGER CHECK (rating >= 1 AND rating <= 5),
    text            TEXT,
    language        TEXT DEFAULT 'en',
    status          TEXT NOT NULL DEFAULT 'visible' 
                    CHECK (status IN ('visible', 'hidden', 'flagged')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE reviews IS 'User reviews (future use)';

-- ============================================================================
-- LAYER B: SNAPSHOT TABLES (Published - Immutable)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- MENU_SNAPSHOTS
-- Immutable published menu versions
-- -----------------------------------------------------------------------------
CREATE TABLE menu_snapshots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id             UUID NOT NULL REFERENCES menus(id) ON DELETE RESTRICT,
    restaurant_id       UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    version             INTEGER NOT NULL,
    
    -- Denormalized restaurant context at publish time (bilingual)
    restaurant_snapshot JSONB NOT NULL,
    
    -- Full menu data frozen (bilingual)
    title_native        TEXT,               -- Frozen menu title in Chinese
    title_en            TEXT NOT NULL,      -- Frozen menu title in English
    description_native  TEXT,
    description_en      TEXT,
    sections            JSONB NOT NULL,     -- Frozen bilingual sections
    
    -- Immutability metadata
    published_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_by        UUID,
    checksum            TEXT NOT NULL,  -- SHA256 of content for integrity verification
    
    UNIQUE(menu_id, version)
);

COMMENT ON TABLE menu_snapshots IS 'Immutable published menu versions (bilingual)';
COMMENT ON COLUMN menu_snapshots.restaurant_snapshot IS 'Denormalized restaurant data at publish time (bilingual)';
COMMENT ON COLUMN menu_snapshots.title_native IS 'Frozen menu title in native script';
COMMENT ON COLUMN menu_snapshots.checksum IS 'SHA256 hash of snapshot content for integrity';

-- -----------------------------------------------------------------------------
-- DISH_SNAPSHOTS
-- Denormalized dish data frozen at publish time
-- -----------------------------------------------------------------------------
CREATE TABLE dish_snapshots (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_snapshot_id            UUID NOT NULL REFERENCES menu_snapshots(id) ON DELETE CASCADE,
    dish_id                     UUID NOT NULL,  -- Original dish ID (no FK to allow dish deletion)
    
    -- Complete 3-layer naming
    native_name                 TEXT NOT NULL,
    romanized_name              TEXT NOT NULL,
    clarity_name_en             TEXT NOT NULL,
    one_line_story_en           TEXT NOT NULL,
    
    -- Pricing
    price                       NUMERIC(10, 2),
    currency                    TEXT,
    
    -- Safety-critical (denormalized)
    spice_level                 TEXT NOT NULL,
    allergens                   TEXT[] NOT NULL DEFAULT '{}',
    dietary_flags               TEXT[] NOT NULL DEFAULT '{}',
    
    -- Cooking & Flavor
    cooking_methods             TEXT[] DEFAULT '{}',
    flavor_profile_tags         TEXT[] DEFAULT '{}',
    
    -- Ingredients frozen as JSONB (denormalized from dish_ingredients)
    ingredients                 JSONB NOT NULL DEFAULT '[]',
    hidden_ingredients_notes_en TEXT,
    
    -- Variations frozen
    variations                  JSONB DEFAULT '[]',
    
    -- Media URLs frozen (not IDs - URLs at publish time)
    photo_urls                  JSONB NOT NULL DEFAULT '[]',
    
    -- Provenance at publish time
    provenance                  JSONB DEFAULT '{}',
    confidence_flags            JSONB DEFAULT '{}',
    
    -- Section placement within menu
    section_id                  TEXT,
    sort_order                  INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE dish_snapshots IS 'Immutable dish data frozen at publish time';
COMMENT ON COLUMN dish_snapshots.dish_id IS 'Original dish ID (no FK to allow working dish deletion)';
COMMENT ON COLUMN dish_snapshots.ingredients IS 'Denormalized ingredients array';
COMMENT ON COLUMN dish_snapshots.photo_urls IS 'Frozen media URLs at publish time';

-- -----------------------------------------------------------------------------
-- SNAPSHOT_MEDIA
-- Media references valid at snapshot time
-- -----------------------------------------------------------------------------
CREATE TABLE snapshot_media (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_snapshot_id    UUID NOT NULL REFERENCES menu_snapshots(id) ON DELETE CASCADE,
    original_media_id   UUID NOT NULL,
    url                 TEXT NOT NULL,  -- Frozen URL
    role                TEXT NOT NULL,
    owner_type          TEXT NOT NULL,
    owner_id            UUID NOT NULL,
    sort_order          INTEGER DEFAULT 0
);

COMMENT ON TABLE snapshot_media IS 'Media references frozen at snapshot time';

-- -----------------------------------------------------------------------------
-- PUBLISHED_MENUS
-- Current snapshot pointer per restaurant (only mutable table in snapshot layer)
-- -----------------------------------------------------------------------------
CREATE TABLE published_menus (
    restaurant_id           UUID PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
    current_snapshot_id     UUID NOT NULL REFERENCES menu_snapshots(id) ON DELETE RESTRICT,
    published_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_by            UUID
);

COMMENT ON TABLE published_menus IS 'Pointer to current published snapshot per restaurant';
COMMENT ON COLUMN published_menus.current_snapshot_id IS 'Update this to rollback to a previous version';

-- ============================================================================
-- LAYER C: RAW INTAKE ARCHIVE
-- ============================================================================

-- -----------------------------------------------------------------------------
-- RAW_SUBMISSIONS
-- Original payloads from Jinshuju or other intake sources
-- -----------------------------------------------------------------------------
CREATE TABLE raw_submissions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source              TEXT NOT NULL DEFAULT 'jinshuju',  -- 'jinshuju', 'api', 'manual', etc.
    external_id         TEXT,  -- External submission ID (e.g., Jinshuju ID)
    restaurant_id       UUID REFERENCES restaurants(id) ON DELETE SET NULL,
    
    -- Raw payload (never modified after insert)
    payload             JSONB NOT NULL,
    
    -- Processing status
    status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'skipped')),
    processed_at        TIMESTAMPTZ,
    error_message       TEXT,
    
    -- Lineage tracking
    created_entities    JSONB DEFAULT '{}',  -- { "dishes": ["uuid1", "uuid2"], ... }
    
    received_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE raw_submissions IS 'Original intake payloads (never modified)';
COMMENT ON COLUMN raw_submissions.payload IS 'Raw JSONB payload from intake source';
COMMENT ON COLUMN raw_submissions.created_entities IS 'IDs of entities created from this submission';

-- -----------------------------------------------------------------------------
-- RAW_SUBMISSION_FILES
-- File attachments from submissions (S3 keys)
-- -----------------------------------------------------------------------------
CREATE TABLE raw_submission_files (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id       UUID NOT NULL REFERENCES raw_submissions(id) ON DELETE CASCADE,
    original_filename   TEXT NOT NULL,
    storage_key         TEXT NOT NULL,  -- S3 key / path
    mime_type           TEXT,
    size_bytes          BIGINT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE raw_submission_files IS 'File attachments from raw submissions';

-- ============================================================================
-- LAYER D: AI JOB QUEUE
-- ============================================================================

-- -----------------------------------------------------------------------------
-- AI_JOBS
-- Async AI interpretation tasks
-- -----------------------------------------------------------------------------
CREATE TABLE ai_jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type            TEXT NOT NULL CHECK (job_type IN ('interpret_dish', 'draft_story', 'infer_clarity_name')),
    target_type         TEXT NOT NULL,
    target_id           UUID NOT NULL,
    priority            INTEGER NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    input_payload       JSONB NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    error_message       TEXT,
    retry_count         INTEGER NOT NULL DEFAULT 0,
    max_retries         INTEGER NOT NULL DEFAULT 3
);

COMMENT ON TABLE ai_jobs IS 'Async AI interpretation task queue';
COMMENT ON COLUMN ai_jobs.job_type IS 'Type: interpret_dish, draft_story, infer_clarity_name';

-- -----------------------------------------------------------------------------
-- AI_JOB_RESULTS
-- Drafted outputs awaiting human review
-- -----------------------------------------------------------------------------
CREATE TABLE ai_job_results (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id              UUID NOT NULL REFERENCES ai_jobs(id) ON DELETE CASCADE,
    output_payload      JSONB NOT NULL,
    model_version       TEXT,
    confidence_score    NUMERIC(4, 3),
    review_status       TEXT NOT NULL DEFAULT 'pending'
                        CHECK (review_status IN ('pending', 'approved', 'rejected', 'revised')),
    reviewed_by         UUID,
    reviewed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_job_results IS 'AI-drafted outputs pending human review';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Working tables
CREATE INDEX idx_restaurants_city ON restaurants(city);
CREATE INDEX idx_restaurants_status ON restaurants(status);
CREATE INDEX idx_restaurants_cuisine_tags ON restaurants USING GIN(cuisine_tags);

CREATE INDEX idx_menus_restaurant_id ON menus(restaurant_id);
CREATE INDEX idx_menus_status ON menus(status);

CREATE INDEX idx_dishes_menu_id ON dishes(menu_id);
CREATE INDEX idx_dishes_status ON dishes(status);
CREATE INDEX idx_dishes_allergens ON dishes USING GIN(allergens);
CREATE INDEX idx_dishes_dietary_flags ON dishes USING GIN(dietary_flags);
CREATE INDEX idx_dishes_spice_level ON dishes(spice_level);

CREATE INDEX idx_dish_ingredients_dish_id ON dish_ingredients(dish_id);
CREATE INDEX idx_dish_ingredients_name_en ON dish_ingredients(name_en);

CREATE INDEX idx_media_owner ON media(owner_type, owner_id);
CREATE INDEX idx_media_status ON media(status);

CREATE UNIQUE INDEX idx_qr_codes_short_code ON qr_codes(short_code);
CREATE INDEX idx_qr_codes_restaurant_id ON qr_codes(restaurant_id);

CREATE INDEX idx_change_logs_entity ON change_logs(entity_type, entity_id);
CREATE INDEX idx_change_logs_changed_at ON change_logs(changed_at DESC);
CREATE INDEX idx_change_logs_changed_by ON change_logs(changed_by);

CREATE INDEX idx_reviews_target ON reviews(target_type, target_id);
CREATE INDEX idx_reviews_status ON reviews(status);

-- Snapshot tables
CREATE INDEX idx_menu_snapshots_menu_id ON menu_snapshots(menu_id);
CREATE INDEX idx_menu_snapshots_restaurant_id ON menu_snapshots(restaurant_id);
CREATE INDEX idx_menu_snapshots_published_at ON menu_snapshots(published_at DESC);

CREATE INDEX idx_dish_snapshots_menu_snapshot_id ON dish_snapshots(menu_snapshot_id);
CREATE INDEX idx_dish_snapshots_dish_id ON dish_snapshots(dish_id);
CREATE INDEX idx_dish_snapshots_allergens ON dish_snapshots USING GIN(allergens);

CREATE INDEX idx_snapshot_media_menu_snapshot_id ON snapshot_media(menu_snapshot_id);

-- Raw intake
CREATE INDEX idx_raw_submissions_source ON raw_submissions(source);
CREATE INDEX idx_raw_submissions_external_id ON raw_submissions(external_id);
CREATE INDEX idx_raw_submissions_status ON raw_submissions(status);
CREATE INDEX idx_raw_submissions_restaurant_id ON raw_submissions(restaurant_id);

CREATE INDEX idx_raw_submission_files_submission_id ON raw_submission_files(submission_id);

-- AI jobs
CREATE INDEX idx_ai_jobs_status_priority ON ai_jobs(status, priority DESC);
CREATE INDEX idx_ai_jobs_target ON ai_jobs(target_type, target_id);

CREATE INDEX idx_ai_job_results_job_id ON ai_job_results(job_id);
CREATE INDEX idx_ai_job_results_review_status ON ai_job_results(review_status);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trg_restaurants_updated_at
    BEFORE UPDATE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_menus_updated_at
    BEFORE UPDATE ON menus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_dishes_updated_at
    BEFORE UPDATE ON dishes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
