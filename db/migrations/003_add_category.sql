-- Migration 003: Add restaurant categories
-- Categories are user-defined groupings (e.g. "West Lake Heritage", "Noodle Culture", "Dim Sum")
-- assigned manually via the portal. Separate from cuisine_tags.

CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
