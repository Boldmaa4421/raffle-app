import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPurchaseSms } from "@/lib/sendPurchaseSms";
import { normalizePhoneE164 } from "@/lib/phone";
import crypto from "crypto";
import * as XLSX from "xlsx";

type Body = {
  raffleId: string;
  sourceFile?: string;
  rows: Array<{ purchasedAt?: any; amount?: any; phone?: any }>;
};

const MAX_QTY = 500;
const MAX_PAID_MULTIPLIER = 500; // 1 хүн 500-аас их сугалаа авахгүй гэж үзнэ

function isClearlyNotPurchase(paid: number, ticketPrice: number) {
  return paid >= ticketPrice * (MAX_PAID_MULTIPLIER + 1);
}

// ---------- helpers ----------
function toInt(raw: any) {
  const n = Number(String(raw ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function pad6(n: number) {
  return String(n).padStart(6, "0");
}

function normalizeCell(raw: any) {
  return String(raw ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Excel serial-ийг LOCAL date-р үүсгэнэ
// Excel serial-ийг "яг тэр өдөр"-өөр нь DB-д оруулахын тулд
// date-only утгуудыг 12:00 цагтай болгож хадгална (timezone-оос болж +/-1 өдөр болохоос хамгаална)
function parseDate(raw: any): Date | null {
  if (!raw) return null;

  // Date object
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;

    // хэрвээ цаг нь яг 00:00:00 бол "date-only" гэж үзээд 12:00 болгоно
    if (
      raw.getHours() === 0 &&
      raw.getMinutes() === 0 &&
      raw.getSeconds() === 0 &&
      raw.getMilliseconds() === 0
    ) {
      const d = new Date(raw);
      d.setHours(12, 0, 0, 0);
      return d;
    }

    return raw;
  }

  // Excel serial number
  if (typeof raw === "number") {
    const dc = XLSX.SSF.parse_date_code(raw);
    if (!dc) return null;

    const y = dc.y;
    if (y < 2000 || y > 2100) return null;

    // цаг байхгүй бол 12:00 гэж үзнэ
    const hasTime = (dc.H || 0) + (dc.M || 0) + (dc.S || 0) > 0;
    const hh = hasTime ? (dc.H || 0) : 12;
    const mm = hasTime ? (dc.M || 0) : 0;
    const ss = hasTime ? Math.floor(dc.S || 0) : 0;

    const d = new Date(y, dc.m - 1, dc.d, hh, mm, ss, 0);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  // string
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;

    // "YYYY-MM-DD" (эсвэл "YYYY/MM/DD") мэт date-only форматыг барьж аваад 12:00 болгоно
   // "YYYY-MM-DD HH:mm:ss" эсвэл "YYYY/MM/DD HH:mm:ss" (local гэж үзнэ)
const mt = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
if (mt) {
  const y = Number(mt[1]);
  const mo = Number(mt[2]);
  const dd = Number(mt[3]);
  const hh = Number(mt[4]);
  const mm = Number(mt[5]);
  const ss = Number(mt[6] ?? "0");

  if (y < 2000 || y > 2100) return null;
  const d = new Date(y, mo - 1, dd, hh, mm, ss, 0);
  if (isNaN(d.getTime())) return null;
  return d;
}


    // бусад string — JS Date parse
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;

    const y = d.getFullYear();
    if (y < 2000 || y > 2100) return null;

    // хэрвээ parse-дахад 00:00 болж орж ирвэл 12:00 болгоно
    if (
      d.getHours() === 0 &&
      d.getMinutes() === 0 &&
      d.getSeconds() === 0 &&
      d.getMilliseconds() === 0
    ) {
      d.setHours(12, 0, 0, 0);
    }

    return d;
  }

  return null;
}

function sha1(input: string) {
  return crypto.createHash("sha1").update(input).digest("hex");
}

// ✅ Данс/банк мөр мөн үү?
function looksLikeBankAccount(text: string) {
  const s = normalizeCell(text).toLowerCase();
  if (!s) return false;

  if (
    s.includes("данс") ||
    s.includes("account") ||
    s.includes("iban") ||
    s.includes("банк")
  )
    return true;

  const chunks = s.match(/\d+/g) ?? [];
  const hasLong = chunks.some((c) => c.length >= 10);
  const hasPhone8 = chunks.some((c) => c.length === 8);

  // 10+ оронтой тоо байгаад 8 оронтой утас огт байхгүй бол данс гэж үзнэ
  if (hasLong && !hasPhone8) return true;

  return false;
}
function hasForeignPhoneHint(s: string) {
  // +7..., +86..., +82... гэх мэт
  if (/\+\d{8,15}/.test(s)) return true;

  // 00... олон улсын (0086..., 007..., 0082...)
  if (/00\d{8,15}/.test(s)) return true;

  // ОХУ-ын олон бичигддэг формат: "7 900..." (эхний 7 + 10 цифр)
  const digits = s.replace(/\D/g, "");
  if (/^7\d{10}$/.test(digits)) return true;

  return false;
}

/**
 * ✅ Утас parse (Монгол + гадаад)
 * - Монгол: 8 оронтой (space, dash, text байж болно)
 * - Монгол: 976XXXXXXXX -> +976XXXXXXXX
 * - Гадаад: +E164 (8..15 орон)
 * - Гадаад: 00E164 (0086..., 0082... гэх мэт) -> +E164
 */
function parsePhone(raw: any): {
  ok: boolean;
  phoneE164?: string;
  phoneRaw: string;
  reason?: string;
} {
  const s = normalizeCell(raw);

  if (!s) return { ok: false, phoneRaw: "", reason: "хоосон" };

  // digits огт байхгүй => дан текст => SKIP
  if (!/\d/.test(s)) return { ok: false, phoneRaw: s, reason: "тоогүй/дан текст" };

  // 1) +E164 хайна (text дунд байсан ч болно)
 // 1) +E164 хайна (text дунд байсан ч болно, +7 900..., +86-... гэх мэт space/dash зөвшөөрнө)
const plusMatches = s.match(/\+\s*[\d\s-]{8,20}/g) ?? [];
const cand = plusMatches[0];

if (cand) {
  const digits = cand.replace(/[^\d]/g, ""); // + тэмдэг/зай/зураасыг цэвэрлээд зөвхөн тоо үлдээнэ
  if (/^\d{8,15}$/.test(digits)) {
    return { ok: true, phoneE164: `+${digits}`, phoneRaw: s };
  }
}



  // 2) 00... олон улсын формат (0086..., 0082...) => +...
  // 2) 00... олон улсын формат (space/dash зөвшөөрнө) => +...
const m00 = s.match(/00[\d\s-]{8,20}/);
if (m00?.[0]) {
  const digits = m00[0].replace(/[^\d]/g, "").slice(2); // remove leading 00
  if (/^\d{8,15}$/.test(digits)) {
    return { ok: true, phoneE164: `+${digits}`, phoneRaw: s };
  }
}

  if (m00?.[0]) {
    const digits = m00[0].slice(2); // remove leading 00
    if (/^\d{8,15}$/.test(digits)) {
      return { ok: true, phoneE164: `+${digits}`, phoneRaw: s };
    }
  }

  // ✅ 3) Монгол 8 оронтой дугаарыг "текст дотроос" хамгийн түрүүнд сугална
  // Ж: "88606221 ХААНААС: 150000 ...", "99643334 ; 95820309", "+976 88606221"
  // (Зөвхөн эхний олдсоныг авна)
    // ✅ 3) Монгол 8 оронтойг текст дундаас "тасархай байсан ч" нийлүүлж олно
  // Ж: "88 058978", "8845 7894", "88-05-8978", "88_05 89 78"
  //  - цифрүүдийн хооронд 0-2 тэмдэг/зай байж болно (хэт урт бол огт өөр тоонууд нийлээд андуурна)
  // ✅ MN 8-digit: MN prefix байвал (MN:, утас, дугаар гэх мэт) тасархай байсан ч нийлүүлж авна
const hasMnHint = /(^|\b)(mn|утас|дугаар|phone)\b/i.test(s);

if (hasMnHint) {
  const mnLoose = s.match(
    /([0-9])\D*([0-9])\D*([0-9])\D*([0-9])\D*([0-9])\D*([0-9])\D*([0-9])\D*([0-9])/
  );
  if (mnLoose) {
    const eight = mnLoose.slice(1).join("");

    // Монгол утас: 8 цифр, ихэнхдээ 5-9
    if (/^[5-9]\d{7}$/.test(eight)) {
      const e = normalizePhoneE164(eight);
      if (e) return { ok: true, phoneE164: e, phoneRaw: s };
    }
  }
}



  // 4) Хэрвээ 8 оронтой MN олдохгүй бол:
  // текст доторх бүх "digit chunk"-уудыг авч, хамгийн боломжит утсыг сонгоно
  const looksLikeDateTime =
    /\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/.test(s) ||
    /\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(s);

  const chunks = s.match(/\d+/g) ?? [];

  /* -------------------------------------------------
   * 4) MN 8 цифр — тасархайг НИЙЛҮҮЛЖ барина
   *    881 514 39 → 88151439
   *    96 384404 → 96384404
   *    9500 2425 → 95002425
   * ------------------------------------------------- */
  if (!looksLikeDateTime) {
    for (let i = 0; i < chunks.length; i++) {
      let acc = "";
      for (let j = i; j < chunks.length && acc.length <= 15; j++) {
        acc += chunks[j];

        if (acc.length === 8 && /^[5-9]\d{7}$/.test(acc)) {
          const e = normalizePhoneE164(acc);
          if (e) return { ok: true, phoneE164: e, phoneRaw: s };
        }

        if (acc.length > 15) break;
      }
    }
  }

  /* -------------------------------------------------
   * 5) MN 8-digit chunk шууд
   * ------------------------------------------------- */
  for (const c of chunks) {
    if (/^\d{8}$/.test(c) && /^[5-9]/.test(c)) {
      const e = normalizePhoneE164(c);
      if (e) return { ok: true, phoneE164: e, phoneRaw: s };
    }
  }
  /* -------------------------------------------------
 * 6) Foreign (chunks-аас сонгоно)
 *  - Текст дотор дүн/огноо байвал digitsAll хэт урт болдог тул chunks ашиглана
 * ------------------------------------------------- */

// 6a) Эхлээд хамгийн "гадаад" магадлал өндөр: 9–15 цифрийн chunk
// 6b) consecutive chunks нийлүүлээд foreign болгох (strict)
for (let i = 0; i < chunks.length; i++) {
  let acc = "";
  for (let j = i; j < chunks.length && acc.length <= 15; j++) {
    acc += chunks[j];

    if (/^\d{9,15}$/.test(acc)) {
      // ✅ country code мэт эхлэл (хамгийн нийтлэгийг зөвшөөрнө)
      // 7 (RU), 86 (CN), 82 (KR), 81 (JP), 1 (US/CA), 44 (UK) гэх мэт
      if (/^(7|86|82|81|1|44|49|33|39|90|91|61|65|66)\d{7,13}$/.test(acc)) {
        return { ok: true, phoneE164: `+${acc}`, phoneRaw: s };
      }
    }

    if (acc.length > 15) break;
  }
}


// 6b) Хэрвээ гадаад дугаар тасархай бичигдсэн бол (ж: "7 900 658 2795", "86 138 0000 0000")
//     consecutive chunks нийлүүлээд 9–15 болсон даруйд авна
for (const c of chunks) {
  if (/^\d{9,15}$/.test(c)) {
    if (/^(7|86|82|81|1|44|49|33|39|90|91|61|65|66)\d{7,13}$/.test(c)) {
      return { ok: true, phoneE164: `+${c}`, phoneRaw: s };
    }
  }
}





  return { ok: false, phoneRaw: s, reason: "утас олдсонгүй" };
}


type Group = {
  startRow: number;
  purchasedAt: Date;
  phoneRaw: string;
  phoneE164: string;

  paid: number;
  qty: number;
  amount: number;
  diff: number; // paid - amount (>=0)
};

async function runPool<T>(
  items: T[],
  limit: number,
  fn: (x: T) => Promise<any>
) {
  const ret: Promise<any>[] = [];
  const executing = new Set<Promise<any>>();
  for (const it of items) {
    const p = Promise.resolve().then(() => fn(it));
    ret.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean).catch(clean);
    if (executing.size >= limit) await Promise.race(executing);
  }
  return Promise.allSettled(ret);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const raffleId = (body.raffleId || "").trim();
    const sourceFile = (body.sourceFile || "excel").trim();
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!raffleId)
      return NextResponse.json({ error: "raffleId шаардлагатай" }, { status: 400 });
    if (rows.length === 0)
      return NextResponse.json({ error: "rows хоосон" }, { status: 400 });

    const raffle = await prisma.raffle.findUnique({
      where: { id: raffleId },
      select: { id: true, ticketPrice: true },
    });
    if (!raffle)
      return NextResponse.json({ error: "Сугалаа олдсонгүй" }, { status: 404 });

    const ticketPrice = raffle.ticketPrice;
    if (!ticketPrice || ticketPrice <= 0)
      return NextResponse.json({ error: "ticketPrice буруу" }, { status: 400 });

    const skipped: Array<{
      row: number;
      reason: string;
      phoneRaw?: string;
      paid?: number;
      qty?: number;
      diff?: number;
      ticketPrice?: number;
    }> = [];

    const groups: Group[] = [];

    let lastDate: Date | null = null;
    let current: Group | null = null;

    for (let i = 0; i < rows.length; i++) {
      const excelRow = i + 2;
      const raw = rows[i];

      const purchasedAt = parseDate((raw as any)?.purchasedAt);
      const paid = toInt((raw as any)?.amount);
      const phoneCell = (raw as any)?.phone;
      const phoneText = normalizeCell(phoneCell);
// ⛔ данс/банк/тайлбар маягийн мөр бол утас гэж бүү оролд (toхиргоо)
// ✅ Данс/банк мэт харагдсан ч гадаад утас илэрвэл зөвшөөрнө


      if (purchasedAt) lastDate = purchasedAt;
      const effectiveDate = purchasedAt ?? lastDate;

      if (!effectiveDate) {
        skipped.push({ row: excelRow, reason: "огноо олдсонгүй", phoneRaw: phoneText, paid, ticketPrice });
        current = null;
        continue;
      }
const parsed = parsePhone(phoneCell);

// ✅ утас олдвол — банк гэсэн үг байсан ч ОРУУЛНА
if (parsed.ok && parsed.phoneE164) {
  // (энэ цаашаа таны paid/qty шалгалтууд хэвээр)
} else {
 

  skipped.push({
    row: excelRow,
    reason: parsed.reason ?? "утас олдсонгүй",
    phoneRaw: parsed.phoneRaw,
    paid,
    ticketPrice,
  });
  current = null;
  continue;
}



// ⛔ УТАС ОЛДООГҮЙ БОЛ — ШУУД SKIP
if (!parsed.ok || !parsed.phoneE164) {
  skipped.push({
    row: excelRow,
    reason: parsed.reason ?? "утас олдсонгүй",
    phoneRaw: parsed.phoneRaw,
    paid,
    ticketPrice,
  });
  current = null;
  continue; // 🔥 ЭНЭ Л ЧАМД ДУТААД БАЙСАН
}
console.log("IMPORT:", excelRow, parsed.ok, parsed.reason, parsed.phoneRaw);

      
      // ✅ CASE 1: утас олдсон мөр
      if (parsed.ok && parsed.phoneE164) {
        // ✅ paid=0/хоосон мөр бол purchase биш гэж үзээд оруулахгүй (bank export)
        if (paid <= 0) {
          skipped.push({
            row: excelRow,
            reason: "дүнгүй мөр (bank export / purchase биш)",
            phoneRaw: parsed.phoneRaw,
            paid,
            ticketPrice,
          });
          current = null;
          continue;
        }

        // ✅ purchase биш “хэт их дүн” мөрүүдийг хурдан ялгаж skip хийнэ
        if (isClearlyNotPurchase(paid, ticketPrice)) {
          skipped.push({
            row: excelRow,
            reason: `purchase биш (хэт их дүн: > ${MAX_PAID_MULTIPLIER}ш)`,
            phoneRaw: parsed.phoneRaw,
            paid,
            ticketPrice,
          });
          current = null;
          continue;
        }

        // ✅ дутуу төлсөн бол оруулахгүй
        if (paid < ticketPrice) {
          skipped.push({
            row: excelRow,
            reason: "дутуу төлсөн",
            phoneRaw: parsed.phoneRaw,
            paid,
            ticketPrice,
          });
          current = null;
          continue;
        }

        const qty = Math.floor(paid / ticketPrice);
        if (!Number.isFinite(qty) || qty <= 0 || qty > MAX_QTY) {
          skipped.push({
            row: excelRow,
            reason: `qty буруу (1-${MAX_QTY})`,
            phoneRaw: parsed.phoneRaw,
            paid,
            qty,
            ticketPrice,
          });
          current = null;
          continue;
        }

        const amount = qty * ticketPrice;
        const diff = paid - amount;

        current = {
          startRow: excelRow,
          purchasedAt: effectiveDate,
          phoneRaw: parsed.phoneRaw,
          phoneE164: parsed.phoneE164,
          paid,
          qty,
          amount,
          diff,
        };
        groups.push(current);
        continue;
      }

      // ✅ CASE 2: continuation зөвхөн phone нүд ХООСОН үед
      // ❗ данс/банк/текст мөрийг continuation болгохгүй
      if (phoneText === "") {
        if (!current) {
          skipped.push({ row: excelRow, reason: "continuation боловч өмнөх purchase алга", paid, ticketPrice });
          continue;
        }

        if (paid <= 0) {
          skipped.push({ row: excelRow, reason: "continuation amount хоосон", phoneRaw: current.phoneRaw, paid, ticketPrice });
          continue;
        }

        const newPaid = current.paid + paid;

        if (newPaid < ticketPrice) {
          skipped.push({ row: excelRow, reason: "continuation нэмээд ч дутуу", phoneRaw: current.phoneRaw, paid: newPaid, ticketPrice });
          continue;
        }

        const qty = Math.floor(newPaid / ticketPrice);
        if (!Number.isFinite(qty) || qty <= 0 || qty > MAX_QTY) {
          skipped.push({ row: excelRow, reason: "continuation qty буруу", phoneRaw: current.phoneRaw, paid: newPaid, qty, ticketPrice });
          continue;
        }

        current.paid = newPaid;
        current.qty = qty;
        current.amount = qty * ticketPrice;
        current.diff = current.paid - current.amount;

        continue;
      }

      // ✅ CASE 3: банк/данс/утас олдохгүй текст мөр бол import хийхгүй
      skipped.push({ row: excelRow, reason: parsed.reason || "утас олдсонгүй", phoneRaw: parsed.phoneRaw, paid, ticketPrice });
      current = null;
    }

    // ---- INSERT ----
    const BATCH_PURCHASE = 80;
    const TICKET_CHUNK = 2000;

    let insertedPurchases = 0;
    let insertedTickets = 0;
    let skippedTickets = 0;

    const allPurchaseIds: string[] = [];

    for (let b = 0; b < groups.length; b += BATCH_PURCHASE) {
      const batch = groups.slice(b, b + BATCH_PURCHASE);

      const result = await prisma.$transaction(
        async (tx) => {
          const counter = await tx.raffleCounter.upsert({
            where: { raffleId },
            create: { raffleId, nextSeq: 1 },
            update: {},
          });

          let nextSeq = counter.nextSeq;
          const prefix = raffleId.slice(0, 4).toUpperCase();

          const purchaseIds: string[] = [];
          const ticketsAll: Array<{ raffleId: string; purchaseId: string; code: string; createdAt: Date }> = [];

          for (const g of batch) {
            const uniqueKey = sha1(
              `${raffleId}:${sourceFile}:${g.startRow}:${g.phoneE164}:${g.purchasedAt.toISOString()}:${g.paid}`
            );

            const purchase = await tx.purchase.upsert({
              where: { uniqueKey },
              update: {
                phoneRaw: g.phoneRaw,
                phoneE164: g.phoneE164,
                qty: g.qty,
                amount: g.amount,
                paidAmount: g.paid,
                overpayDiff: g.diff,
                createdAt: g.purchasedAt,
              } as any,
              create: {
                raffleId,
                phoneRaw: g.phoneRaw,
                phoneE164: g.phoneE164,
                qty: g.qty,
                amount: g.amount,
                paidAmount: g.paid,
                overpayDiff: g.diff,
                createdAt: g.purchasedAt,
                uniqueKey,
              } as any,
            });

            purchaseIds.push(purchase.id);

            const startSeq = nextSeq;
            nextSeq += g.qty;

            for (let i = 0; i < g.qty; i++) {
              const n = startSeq + i;
              ticketsAll.push({
                raffleId,
                purchaseId: purchase.id,
                code: `${prefix}-${pad6(n)}`,
                createdAt: g.purchasedAt,
              });
            }
          }

          for (let i = 0; i < ticketsAll.length; i += TICKET_CHUNK) {
            const chunk = ticketsAll.slice(i, i + TICKET_CHUNK);
            const created = await tx.ticket.createMany({ data: chunk, skipDuplicates: true });
            insertedTickets += created.count;
            skippedTickets += chunk.length - created.count;
          }

          await tx.raffleCounter.update({ where: { raffleId }, data: { nextSeq } });

          return { purchaseIds, insertedPurchases: batch.length };
        },
        { timeout: 600000, maxWait: 60000 }
      );

      insertedPurchases += result.insertedPurchases;
      allPurchaseIds.push(...result.purchaseIds);
    }

    // SMS optional
    const smsEnabled = (process.env.SMS_ENABLED || "true").toLowerCase() !== "false";
    if (smsEnabled && allPurchaseIds.length > 0) {
      await runPool(allPurchaseIds, 5, (id) => sendPurchaseSms(id));
    }

    const overpayPreview = groups
      .filter((g) => g.diff > 0)
      .slice(0, 500)
      .map((g) => ({
        row: g.startRow,
        phone: g.phoneE164,
        paid: g.paid,
        qty: g.qty,
        expected: g.amount,
        overpayDiff: g.diff,
      }));

    return NextResponse.json({
      ok: true,
      raffleId,
      sourceFile,
      parsedGroups: groups.length,
      insertedPurchases,
      insertedTickets,
      skippedTickets,
      overpaidCount: groups.filter((g) => g.diff > 0).length,
      skippedCount: skipped.length,
      overpayPreview,
      skippedPreview: skipped.slice(0, 500),
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Серверийн алдаа" }, { status: 500 });
  }
  
}
