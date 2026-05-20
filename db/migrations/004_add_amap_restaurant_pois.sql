-- Migration 004: Cache public AMap restaurant POIs for city discovery.
-- These are not canonical Brivia restaurant records. They are third-party
-- discovery candidates used for rich map cards until a restaurant is onboarded.

CREATE TABLE IF NOT EXISTS amap_restaurant_pois (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amap_poi_id           TEXT NOT NULL UNIQUE,
  matched_restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,

  city                  TEXT NOT NULL,
  adcode                TEXT,
  name_native           TEXT NOT NULL,
  name_en               TEXT,
  address_native        TEXT,
  address_en            TEXT,
  geo_lat               NUMERIC(10, 7),
  geo_lng               NUMERIC(10, 7),

  tel                   TEXT,
  type                  TEXT,
  typecode              TEXT,
  business_area         TEXT,
  rating                TEXT,
  cost                  TEXT,
  opentime_today        TEXT,
  opentime_week         TEXT,
  tag_native            TEXT,
  tag_en                TEXT,
  photo_url             TEXT,
  photos                JSONB NOT NULL DEFAULT '[]',
  raw_payload           JSONB NOT NULL DEFAULT '{}',

  translation_status    TEXT NOT NULL DEFAULT 'pending'
                        CHECK (translation_status IN ('pending', 'translated', 'failed', 'skipped')),
  fetched_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  translated_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_amap_restaurant_pois_city
  ON amap_restaurant_pois(city);

CREATE INDEX IF NOT EXISTS idx_amap_restaurant_pois_location
  ON amap_restaurant_pois(geo_lat, geo_lng);

CREATE INDEX IF NOT EXISTS idx_amap_restaurant_pois_matched
  ON amap_restaurant_pois(matched_restaurant_id);

CREATE INDEX IF NOT EXISTS idx_amap_restaurant_pois_fetched_at
  ON amap_restaurant_pois(fetched_at DESC);
