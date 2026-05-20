import { NextResponse, type NextRequest } from "next/server";
import {
  isPortalSessionValid,
  PORTAL_SESSION_COOKIE,
} from "@/src/lib/portal-session";

const PUBLIC_PORTAL_PATHS = new Set(["/portal/login"]);
const PUBLIC_PORTAL_API_PATHS = new Set([
  "/api/portal/login",
  "/api/portal/logout",
]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PORTAL_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const session = req.cookies.get(PORTAL_SESSION_COOKIE)?.value;
  const authed = await isPortalSessionValid(session);

  if (PUBLIC_PORTAL_PATHS.has(pathname)) {
    if (authed) {
      return NextResponse.redirect(new URL("/portal", req.url));
    }
    return NextResponse.next();
  }

  if (!authed) {
    if (pathname.startsWith("/api/portal")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/portal/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*", "/api/portal/:path*"],
};
