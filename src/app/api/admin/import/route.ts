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
// date-only утгуудыг 12:00 цагтай болгож хадгална (timezone-оос болж +/-1 өдөр болохоос хамгаална)
function parseDate(raw: any): Date | null {
  if (!raw) return null;

  // Date object
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;

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

    // "YYYY-MM-DD HH:mm:ss" эсвэл "YYYY/MM/DD HH:mm:ss" (local гэж үзнэ)
    const mt = s.match(
      /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/
    );
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

    const d = new Date(s);
    if (isNaN(d.getTime())) return null;

    const y = d.getFullYear();
    if (y < 2000 || y > 2100) return null;

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

// ✅ Foreign hint: +..., 00..., эсвэл "7xxxxxxxxxx" (ОХУ)
function hasForeignPhoneHint(text: string) {
  const s = normalizeCell(text);

  // +7..., +86..., +82... гэх мэт (space/dash байж болно)
  if (/\+\s*[\d\s-]{8,20}/.test(s)) return true;

  // 00... олон улсын (0086..., 007..., 0082...) (space/dash байж болно)
  if (/00[\d\s-]{8,20}/.test(s)) return true;

  // ОХУ-ын нийтлэг формат: "7 900 658 2795" -> digits = 79006582795
  const digits = s.replace(/\D/g, "");
  if (/^7\d{10}$/.test(digits)) return true;

  return false;
}

/**
 * ✅ Утас parse (Монгол + гадаад)
 * - Монгол: 8 оронтой (space, dash, text байж болно) -> normalizePhoneE164
 * - Гадаад: зөвхөн hint-тэй үед ( +... / 00... / 7xxxxxxxxxx )
 */
function parsePhone(raw: any): {
  ok: boolean;
  phoneE164?: string;
  phoneRaw: string;
  reason?: string;
} {
  const s = normalizeCell(raw);

  if (!s) return { ok: false, phoneRaw: "", reason: "хоосон" };
  if (!/\d/.test(s)) return { ok: false, phoneRaw: s, reason: "дан текст" };

  // Огноо/цагтай мөрийг бүхэлд нь болгоомжлоно (утас андуурахаас хамгаална)
  const hasDateTimeHint =
    /\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/.test(s) ||
    /\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(s);

  // ✅ Утас шиг кластер: 1 цифр + (зай/зураас/хаалт г.м) + цифр ... нийт 8–18 цифрийн "блок"
  // - "+" эсвэл "00" эхлэлтэй байж болно
  // - Текст дундах "150000 2" гэх мэт нь 8 хүрэхгүй бол огт баригдахгүй
  const clusters =
    s.match(/(?:\+|00)?\d(?:[\s\-()._/]*\d){7,17}/g) ?? [];

  for (const cl of clusters) {
    // огноо шиг кластерийг алгасна (2026-01-14 гэх мэт)
    if (/\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/.test(cl)) continue;
    if (/\d{1,2}:\d{2}/.test(cl)) continue;

    const digits = cl.replace(/\D/g, "");
    if (digits.length < 8) continue;

    // 1) +E164
    if (cl.trim().startsWith("+")) {
      if (/^\d{8,15}$/.test(digits)) {
        return { ok: true, phoneE164: `+${digits}`, phoneRaw: s };
      }
      continue;
    }

    // 2) 00E164
    if (cl.trim().startsWith("00")) {
      const d = digits.startsWith("00") ? digits.slice(2) : digits;
      if (/^\d{8,15}$/.test(d)) {
        return { ok: true, phoneE164: `+${d}`, phoneRaw: s };
      }
      continue;
    }

    // 3) Монгол 976XXXXXXXX
    if (/^976\d{8}$/.test(digits)) {
      return { ok: true, phoneE164: `+${digits}`, phoneRaw: s };
    }

    // 4) Монгол 8 оронтой (5-9-өөр эхэлсэн)
    if (/^[5-9]\d{7}$/.test(digits)) {
      const e = normalizePhoneE164(digits);
      if (e) return { ok: true, phoneE164: e, phoneRaw: s };
      continue;
    }

    // 5) Foreign 9–15 (01/04-өөр эхэлсэн ч зөвшөөрнө)
    // ⚠️ огноо мөрөн дээр foreign-г ер нь алгасна
    if (!hasDateTimeHint && /^\d{9,15}$/.test(digits)) {
      return { ok: true, phoneE164: `+${digits}`, phoneRaw: s };
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

async function runPool<T>(items: T[], limit: number, fn: (x: T) => Promise<any>) {
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

    if (!raffleId) return NextResponse.json({ error: "raffleId шаардлагатай" }, { status: 400 });
    if (rows.length === 0) return NextResponse.json({ error: "rows хоосон" }, { status: 400 });

    const raffle = await prisma.raffle.findUnique({
      where: { id: raffleId },
      select: { id: true, ticketPrice: true },
    });
    if (!raffle) return NextResponse.json({ error: "Сугалаа олдсонгүй" }, { status: 404 });

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
      raw?: any;
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

      if (purchasedAt) lastDate = purchasedAt;
      const effectiveDate = purchasedAt ?? lastDate;

      if (!effectiveDate) {
        skipped.push({
          row: excelRow,
          reason: "огноо олдсонгүй",
          phoneRaw: phoneText,
          paid,
          ticketPrice,
          raw,
        });
        current = null;
        continue;
      }

      // ✅ Банк/данс/тайлбар мөрийг SKIP (гэхдээ +/00/7xxxxxxxxxx байвал зөвшөөрнө)
      if (looksLikeBankAccount(phoneText) && !hasForeignPhoneHint(phoneText)) {
        skipped.push({
          row: excelRow,
          reason: "данс/банк/тайлбар мөр",
          phoneRaw: phoneText,
          paid,
          ticketPrice,
          raw,
        });
        current = null;
        continue;
      }

      const parsed = parsePhone(phoneCell);

if (!parsed.ok || !parsed.phoneE164) {
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


      // ✅ CASE 1: утас олдсон мөр
      if (parsed.ok && parsed.phoneE164) {
        if (paid <= 0) {
          skipped.push({
            row: excelRow,
            reason: "дүнгүй мөр (bank export / purchase биш)",
            phoneRaw: parsed.phoneRaw,
            paid,
            ticketPrice,
            raw,
          });
          current = null;
          continue;
        }

        if (isClearlyNotPurchase(paid, ticketPrice)) {
          skipped.push({
            row: excelRow,
            reason: `purchase биш (хэт их дүн: > ${MAX_PAID_MULTIPLIER}ш)`,
            phoneRaw: parsed.phoneRaw,
            paid,
            ticketPrice,
            raw,
          });
          current = null;
          continue;
        }

        if (paid < ticketPrice) {
          skipped.push({
            row: excelRow,
            reason: "дутуу төлсөн",
            phoneRaw: parsed.phoneRaw,
            paid,
            ticketPrice,
            raw,
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
            raw,
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
      if (phoneText === "") {
        if (!current) {
          skipped.push({ row: excelRow, reason: "continuation боловч өмнөх purchase алга", paid, ticketPrice, raw });
          continue;
        }

        if (paid <= 0) {
          skipped.push({ row: excelRow, reason: "continuation amount хоосон", phoneRaw: current.phoneRaw, paid, ticketPrice, raw });
          continue;
        }

        const newPaid = current.paid + paid;

        if (newPaid < ticketPrice) {
          skipped.push({ row: excelRow, reason: "continuation нэмээд ч дутуу", phoneRaw: current.phoneRaw, paid: newPaid, ticketPrice, raw });
          continue;
        }

        const qty = Math.floor(newPaid / ticketPrice);
        if (!Number.isFinite(qty) || qty <= 0 || qty > MAX_QTY) {
          skipped.push({ row: excelRow, reason: "continuation qty буруу", phoneRaw: current.phoneRaw, paid: newPaid, qty, ticketPrice, raw });
          continue;
        }

        current.paid = newPaid;
        current.qty = qty;
        current.amount = qty * ticketPrice;
        current.diff = current.paid - current.amount;

        continue;
      }

      skipped.push({ row: excelRow, reason: "дан текст/утас олдсонгүй", phoneRaw: phoneText, paid, ticketPrice, raw });
      current = null;
      continue;
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
