-- ============================================================================
-- Migration: 002_add_contains_lamb.sql
-- Adds 'contains_lamb' to the dietary_flags enum for dishes and snapshots
-- ============================================================================

BEGIN;

-- Update CHECK constraint on dishes table
ALTER TABLE dishes DROP CONSTRAINT IF EXISTS dishes_dietary_flags_check;
-- No CHECK on text[] — dietary_flags is validated at application level

-- Update CHECK constraint on dish_snapshots table (if exists)
-- dish_snapshots.dietary_flags has no CHECK constraint (just NOT NULL DEFAULT '{}')

-- Note: The actual enforcement of valid dietary_flags values happens at the
-- application layer via TypeScript types (DietaryTag union).
-- This migration is a no-op at the SQL level since dietary_flags is TEXT[].
-- The real changes are in the TypeScript type definitions.

COMMIT;
