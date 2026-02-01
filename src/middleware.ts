import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function unauthorized() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

function decodeBasic(auth: string) {
  // auth = "Basic base64(user:pass)"
  const b64 = auth.slice("Basic ".length).trim();

  // Edge дээр Buffer байхгүй тул atob ашиглана
  // atob ажиллахгүй орчин байвал fallback гэж try/catch хийнэ
  try {
    const decoded = atob(b64); // "user:pass"
    const idx = decoded.indexOf(":");
    if (idx < 0) return { u: "", p: "" };
    return { u: decoded.slice(0, idx), p: decoded.slice(idx + 1) };
  } catch {
    return { u: "", p: "" };
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdmin =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (!isAdmin) return NextResponse.next();

  const user = process.env.ADMIN_BASIC_USER || "";
  const pass = process.env.ADMIN_BASIC_PASS || "";

  // env хоосон байсан ч хаалттай байлгая
  if (!user || !pass) return unauthorized();

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return unauthorized();

  const { u, p } = decodeBasic(auth);
  if (u !== user || p !== pass) return unauthorized();

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
