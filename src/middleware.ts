import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEVICE_COOKIE, SESSION_COOKIE, verifySession } from "@/lib/adminAuth";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Нэвтрэх хуудас нээлттэй
  if (pathname === "/admin/login") return NextResponse.next();

  const ok = await verifySession(
    req.cookies.get(SESSION_COOKIE)?.value,
    req.cookies.get(DEVICE_COOKIE)?.value
  );
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Нэвтрэх шаардлагатай" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    // Өгөгдөл өөрчилдөг, зөвхөн админд зориулсан API-ууд
    "/api/upload",
    "/api/import",
    "/api/purchases",
    "/api/raffles",
    "/api/raffle/:path*",
  ],
};
