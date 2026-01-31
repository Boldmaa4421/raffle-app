export function normalizePhoneE164(input: string): string | null {
  const raw = (input || "").trim();

  if (!raw) return null;

  // зай, - , () зэргийг арилгана
  const cleaned = raw.replace(/[^\d+]/g, "");

  // +XXXXXXXX -> шууд зөвшөөрнө (маш бага шалгалт)
  if (cleaned.startsWith("+")) {
    if (/^\+\d{6,15}$/.test(cleaned)) return cleaned; // E.164 max 15
    return null;
  }

  // Зөвхөн цифр үлдсэн бол:
  const digits = cleaned.replace(/\D/g, "");

  // Монгол: 8 оронтой (ж: 99112233) гэж үзээд +976 нэмнэ
  if (/^\d{8}$/.test(digits)) return `+976${digits}`;

  // 976XXXXXXXX гэж өгвөл + нэмнэ
  if (/^976\d{8}$/.test(digits)) return `+${digits}`;

  // Бусад улс: хамгийн багадаа 6, ихдээ 15 оронтой бол + нэмээд буцаая
  if (/^\d{6,15}$/.test(digits)) return `+${digits}`;

  return null;
}
