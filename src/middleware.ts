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

  // ENV байхгүй бол шууд хаана
  if (!user || !pass) return unauthorized();

  /**
   * ✅ ЗӨВХӨН HTML document request дээр Basic Auth шалгана
   * (redirect, js, css, prefetch дээр шалгахгүй)
   */
  const accept = req.headers.get("accept") || "";
  const isDocument = accept.includes("text/html");

  if (!isDocument) {
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return unauthorized();

  try {
    const decoded = atob(auth.slice("Basic ".length));
    const [u, p] = decoded.split(":");

    if (u === user && p === pass) {
      return NextResponse.next();
    }

    return unauthorized();
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
