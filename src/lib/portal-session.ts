export const PORTAL_SESSION_COOKIE = "brivia_portal_session";

const SESSION_PREFIX = "brivia-eats-portal:";

function getPortalToken(): string | null {
  const token = process.env.PORTAL_ADMIN_TOKEN?.trim();
  return token || null;
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function portalSessionValue(): Promise<string | null> {
  const token = getPortalToken();
  if (!token) return null;
  return sha256Hex(`${SESSION_PREFIX}${token}`);
}

export async function isPortalSessionValid(
  cookieValue: string | undefined | null
): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await portalSessionValue();
  return Boolean(expected && cookieValue === expected);
}

export function isPortalTokenConfigured(): boolean {
  return Boolean(getPortalToken());
}

export function isSubmittedPortalTokenValid(token: string): boolean {
  const expected = getPortalToken();
  return Boolean(expected && token === expected);
}
