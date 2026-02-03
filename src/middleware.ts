import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // ✅ Түр унтраалт: бүх request-ийг шууд нэвтрүүл
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
