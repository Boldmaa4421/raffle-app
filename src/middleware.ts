import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function unauthorized() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin Area", charset="UTF-8"',
    },
  });
}

export function middleware(req: NextRequest) {
  const user = (process.env.ADMIN_USER || "").trim();
  const pass = (process.env.ADMIN_PASS || "").trim();

  // env тохироогүй бол хамгаалалт үргэлж 401 буцаана
  if (!user || !pass) return unauthorized();

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return unauthorized();

  try {
    const base64 = auth.slice("Basic ".length);
    const decoded = atob(base64); // ✅ Edge-safe
    const idx = decoded.indexOf(":");
    const u = idx >= 0 ? decoded.slice(0, idx) : "";
    const p = idx >= 0 ? decoded.slice(idx + 1) : "";

    if (u === user && p === pass) return NextResponse.next();
    return unauthorized();
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
