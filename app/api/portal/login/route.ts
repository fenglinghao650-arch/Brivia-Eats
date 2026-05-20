import { NextResponse } from "next/server";
import {
  isPortalTokenConfigured,
  isSubmittedPortalTokenValid,
  portalSessionValue,
  PORTAL_SESSION_COOKIE,
} from "@/src/lib/portal-session";

export async function POST(req: Request) {
  if (!isPortalTokenConfigured()) {
    return NextResponse.json(
      { error: "PORTAL_ADMIN_TOKEN is not configured" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";

  if (!isSubmittedPortalTokenValid(token)) {
    return NextResponse.json({ error: "Invalid portal token" }, { status: 401 });
  }

  const sessionValue = await portalSessionValue();
  if (!sessionValue) {
    return NextResponse.json(
      { error: "PORTAL_ADMIN_TOKEN is not configured" },
      { status: 503 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(PORTAL_SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
