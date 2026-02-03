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
  // зөвхөн /admin хамгаална (matcher дээр байгаа)
  const user = process.env.ADMIN_USER || "";
  const pass = process.env.ADMIN_PASS || "";

  // env байхгүй бол хамгаалалт ажиллахгүй (аюултай)
  if (!user || !pass) {
    return unauthorized();
  }

  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Basic ")) {
    return unauthorized();
  }

  try {
    const base64 = auth.slice("Basic ".length);
    const decoded = Buffer.from(base64, "base64").toString("utf8");
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
