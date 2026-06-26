import { NextResponse } from "next/server";
import { db } from "@/src/db";

// Public analytics ingest. Diners are not logged in, so this route lives OUTSIDE
// /api/portal (which proxy.ts gates) and accepts anonymous events from the
// browser via fetch/sendBeacon. Writes are fire-and-forget: this endpoint never
// throws back to the client — a failed analytics write must not affect the menu.

// Only our own client code sets these, but we whitelist anyway so a stray/bad
// event_type can't pollute the table. Unknown types are quietly ignored.
const ALLOWED_EVENT_TYPES = new Set([
  "qr_scan",
  "menu_view",
  "language_select",
  "show_to_server",
]);

// Trim free-text to keep rows bounded.
function str(value: unknown, max = 256): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function intOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

function numOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

// Loose UUID check — malformed ids become NULL rather than risking an insert
// error that would drop the whole event.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(value: unknown): string | null {
  const s = str(value, 36);
  return s && UUID_RE.test(s) ? s : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new NextResponse(null, { status: 204 });
    }

    const eventType = str((body as Record<string, unknown>).event_type, 40);
    if (!eventType || !ALLOWED_EVENT_TYPES.has(eventType)) {
      // Unknown/missing type — accept silently so the client never sees an error.
      return new NextResponse(null, { status: 204 });
    }

    const b = body as Record<string, unknown>;
    const props =
      b.props && typeof b.props === "object" && !Array.isArray(b.props)
        ? b.props
        : {};

    const userAgent = req.headers.get("user-agent")?.slice(0, 512) ?? null;

    await db.execute(
      `INSERT INTO analytics_events
         (event_type, restaurant_id, menu_id, session_id, locale, source,
          cart_item_count, estimated_order_value, currency, props, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        eventType,
        uuidOrNull(b.restaurant_id),
        uuidOrNull(b.menu_id),
        str(b.session_id, 64),
        str(b.locale, 8),
        str(b.source, 40),
        intOrNull(b.cart_item_count),
        numOrNull(b.estimated_order_value),
        str(b.currency, 8),
        JSON.stringify(props),
        userAgent,
      ]
    );

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    // Never surface analytics failures to the diner — log and move on.
    console.error("[POST /api/events]", err);
    return new NextResponse(null, { status: 204 });
  }
}
