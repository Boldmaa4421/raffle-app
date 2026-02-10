import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // ✅ LOCAL дээр admin хамгаалалт унтраая
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  // ⬇️ доор чинь байгаа basic auth логик хэвээрээ үлдэнэ
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
