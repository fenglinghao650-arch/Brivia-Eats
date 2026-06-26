/**
 * Anonymous, fire-and-forget diner analytics for MVP validation.
 *
 * Each device gets one persistent anonymous id (no login, no PII) so we can
 * count unique visitors and a per-person view→show-to-server conversion rate.
 * Events are POSTed to /api/events; sendBeacon is used when available so the
 * event still lands even as the page navigates away (e.g. picking a language).
 *
 * Every function is best-effort and swallows its own errors — analytics must
 * never break the menu.
 */

const ANON_ID_KEY = "brivia_anon_id";
const LAST_LOCALE_KEY = "brivia_last_locale";

// Anonymous device id lives ~indefinitely (localStorage has no TTL); long-lived
// on purpose so a returning tourist counts as the same visitor.
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

// The Show-to-server screen doesn't know which language the diner browsed in
// (cart items don't carry it), so menu_view records the last locale here for it.
export function setLastLocale(locale: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_LOCALE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export function getLastLocale(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_LOCALE_KEY);
  } catch {
    return null;
  }
}

export type EventType =
  | "qr_scan"
  | "menu_view"
  | "language_select"
  | "show_to_server";

export type TrackPayload = {
  restaurant_id?: string | null;
  menu_id?: string | null;
  locale?: string | null;
  source?: string | null;
  cart_item_count?: number | null;
  estimated_order_value?: number | null;
  currency?: string | null;
  props?: Record<string, unknown>;
};

export function track(eventType: EventType, payload: TrackPayload = {}) {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      event_type: eventType,
      session_id: getSessionId(),
      ...payload,
    });

    // sendBeacon survives navigation (language pick, Show-to-server), which a
    // normal fetch can have cancelled. Fall back to keepalive fetch otherwise.
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/events", blob);
      return;
    }
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics must never throw */
  }
}
