// Админ нэвтрэлт: гарын үсэгтэй session cookie + зөвшөөрсөн төхөөрөмж.
// Web Crypto ашигладаг тул middleware болон API route-д хоёуланд нь ажиллана.

export const SESSION_COOKIE = "admin_session";
export const DEVICE_COOKIE = "admin_device";
export const SESSION_TTL_SEC = 7 * 24 * 60 * 60; // 7 хоног
export const DEVICE_TTL_SEC = 10 * 365 * 24 * 60 * 60; // ~10 жил

function secret() {
  // Нууц үг солигдвол бүх session автоматаар хүчингүй болно
  return `${process.env.ADMIN_SESSION_SECRET || ""}|${process.env.ADMIN_BASIC_USER || ""}|${process.env.ADMIN_BASIC_PASS || ""}`;
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Төхөөрөмжийн код: 12 тэмдэгт (0/O, 1/I андуурагдахгүй)
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newDeviceId() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function normalizeDeviceId(s: string) {
  return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatDeviceId(id: string) {
  return (id.match(/.{1,4}/g) ?? [id]).join("-");
}

// ADMIN_ALLOWED_DEVICES="ABCD-EFGH-JKLM, NPQR-STUV-WXYZ"
// Хоосон бол бүх төхөөрөмжийг зөвшөөрнө (анх тохируулах үед түгжигдэхгүйн тулд)
export function allowedDevices(): string[] {
  return String(process.env.ADMIN_ALLOWED_DEVICES || "")
    .split(/[,\s;]+/)
    .map(normalizeDeviceId)
    .filter(Boolean);
}

export function isDeviceAllowed(deviceId: string | undefined | null) {
  const list = allowedDevices();
  if (list.length === 0) return true;
  const id = normalizeDeviceId(deviceId || "");
  return !!id && list.includes(id);
}

export async function createSessionToken(deviceId: string) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const payload = `${exp}.${normalizeDeviceId(deviceId)}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySession(token: string | undefined, deviceId: string | undefined) {
  if (!token || !deviceId) return false;
  if (!process.env.ADMIN_BASIC_USER || !process.env.ADMIN_BASIC_PASS) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expStr, dev, sig] = parts;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  if (dev !== normalizeDeviceId(deviceId)) return false; // session өөр төхөөрөмж рүү хуулагдсан
  if (!isDeviceAllowed(dev)) return false; // жагсаалтаас хасвал шууд гарна

  return safeEqual(sig, await hmac(`${expStr}.${dev}`));
}
