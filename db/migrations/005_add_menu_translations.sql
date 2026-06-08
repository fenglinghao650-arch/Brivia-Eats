-- Migration 005: Per-menu, opt-in translations of the published menu payload.
-- One row per (menu, locale). `payload` is the full /api/menus/[id] response shape
-- but with free-text fields translated. Generated once (not on the fly) by
-- scripts/translate-menu.ts. Missing locales fall back to English at the API layer.

CREATE TABLE IF NOT EXISTS menu_translations (
  menu_id     UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  locale      TEXT NOT NULL,              -- 'ja' | 'ko' | 'es' (en is the canonical source)
  payload     JSONB NOT NULL,
  status      TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('draft', 'approved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (menu_id, locale)
);
