import { NextResponse } from "next/server";
import {
  DEVICE_COOKIE,
  DEVICE_TTL_SEC,
  SESSION_COOKIE,
  SESSION_TTL_SEC,
  createSessionToken,
  formatDeviceId,
  isDeviceAllowed,
  newDeviceId,
  normalizeDeviceId,
  safeEqual,
} from "@/lib/adminAuth";

// Нууц үг таах оролдлогоос хамгаална: IP бүрт 5 буруу оролдлого -> 10 минут түгжинэ
const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;
const fails = new Map<string, { n: number; until: number }>();

function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function POST(req: Request) {
  const ip = clientIp(req);
  const f = fails.get(ip);
  if (f && f.until > Date.now()) {
    const min = Math.ceil((f.until - Date.now()) / 60000);
    return NextResponse.json(
      { error: `Олон удаа буруу оролдсон тул ${min} минутын дараа дахин оролдоно уу.` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const username = String(body?.username ?? "");
  const password = String(body?.password ?? "");

  const U = process.env.ADMIN_BASIC_USER || "";
  const P = process.env.ADMIN_BASIC_PASS || "";
  if (!U || !P) {
    return NextResponse.json({ error: "Серверт админ тохиргоо хийгдээгүй байна." }, { status: 500 });
  }

  // Төхөөрөмжийн код (байхгүй бол шинээр үүсгэнэ)
  const cookieHeader = req.headers.get("cookie") || "";
  const m = cookieHeader.match(new RegExp(`(?:^|;\s*)${DEVICE_COOKIE}=([^;]+)`));
  let deviceId = normalizeDeviceId(m ? decodeURIComponent(m[1]) : "");
  const isNewDevice = !deviceId;
  if (isNewDevice) deviceId = newDeviceId();

  const withDevice = (res: NextResponse) => {
    if (isNewDevice) res.cookies.set(DEVICE_COOKIE, deviceId, { ...cookieBase, maxAge: DEVICE_TTL_SEC });
    return res;
  };

  if (!(safeEqual(username, U) && safeEqual(password, P))) {
    const n = (f && f.until <= Date.now() ? 0 : f?.n ?? 0) + 1;
    fails.set(ip, { n, until: n >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
    await new Promise((r) => setTimeout(r, 600));
    return withDevice(NextResponse.json({ error: "Нэвтрэх нэр эсвэл нууц үг буруу байна." }, { status: 401 }));
  }
  fails.delete(ip);

  if (!isDeviceAllowed(deviceId)) {
    return withDevice(
      NextResponse.json(
        {
          error: "Энэ төхөөрөмж зөвшөөрөгдөөгүй байна.",
          deviceNotAllowed: true,
          deviceCode: formatDeviceId(deviceId),
        },
        { status: 403 }
      )
    );
  }

  const res = withDevice(NextResponse.json({ ok: true, deviceCode: formatDeviceId(deviceId) }));
  res.cookies.set(SESSION_COOKIE, await createSessionToken(deviceId), {
    ...cookieBase,
    maxAge: SESSION_TTL_SEC,
  });
  return res;
}
