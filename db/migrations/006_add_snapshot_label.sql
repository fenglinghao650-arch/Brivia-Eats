-- Human-friendly name for each published menu version, shown in the portal
-- version switcher (e.g. "Winter Menu", "Summer Menu"). Optional; the UI falls
-- back to "Version N" when null.
ALTER TABLE menu_snapshots ADD COLUMN IF NOT EXISTS label TEXT;
COMMENT ON COLUMN menu_snapshots.label IS 'Human-friendly version name shown in the portal version switcher';
