import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role;

  // ── Redirect old standalone routes to unified dashboard ───────────────────
  if (pathname.startsWith("/operator") || pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // ── Dashboard — must be authenticated ────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(
        new URL("/auth?callbackUrl=/dashboard", req.url),
      );
    }
  }

  // ── Auth page — redirect away if already signed in ────────────────────────
  if (pathname === "/auth" && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
