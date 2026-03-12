import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "gastamo_session";
const PUBLIC_ROUTES = ["/login", "/register"];
const SKIP_PATTERNS = ["/_next", "/api", "/icons", "/favicon"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (SKIP_PATTERNS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  if (!isPublic && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublic && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
