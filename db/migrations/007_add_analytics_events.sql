-- Migration 007: Anonymous validation analytics.
--
-- One append-only row per tracked diner event. Used to answer the MVP
-- validation questions: are tourists actually opening each menu, and do they
-- reach "Show to server"? No PII — diners are identified only by an anonymous
-- per-device id (session_id) generated client-side in localStorage.
--
-- Events are written by the public POST /api/events route (diners are not
-- logged in) and read back by the gated /portal/analytics dashboard.
--
-- event_type values currently emitted (validated in the API, not constrained
-- here so a new type can never cause an insert to be dropped):
--   qr_scan         — language picker opened (the truest "QR was scanned" signal)
--   menu_view       — a menu actually rendered (carries restaurant_id + locale)
--   language_select — a language chosen from the picker
--   show_to_server  — the Show-to-server screen reached (carries cart totals)

CREATE TABLE IF NOT EXISTS analytics_events (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type             TEXT NOT NULL,
  -- Nullable FKs with ON DELETE SET NULL: analytics outlive the entities they
  -- reference, and a deleted restaurant/menu must never orphan or block a row.
  restaurant_id          UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  menu_id                UUID REFERENCES menus(id) ON DELETE SET NULL,
  session_id             TEXT,                 -- anonymous per-device id (localStorage)
  locale                 TEXT,                 -- 'en' | 'ja' | 'ko' | 'es' | 'ar'
  source                 TEXT,                 -- 'qr_picker' | 'direct' | 'language_switch'
  cart_item_count        INTEGER,             -- show_to_server: total quantity in cart
  estimated_order_value  NUMERIC(10, 2),      -- show_to_server: sum(price * quantity)
  currency               TEXT,                 -- show_to_server: cart currency symbol
  props                  JSONB NOT NULL DEFAULT '{}',  -- catch-all for future fields
  user_agent             TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dashboard reads aggregate by restaurant + time window, and conversion counts
-- distinct session_id; these indexes cover those access patterns.
CREATE INDEX IF NOT EXISTS idx_analytics_events_restaurant_created
  ON analytics_events (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
  ON analytics_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON analytics_events (session_id);
