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
function parseDate(raw: any): Date | null {
  if (!raw) return null;

  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;

  if (typeof raw === "number") {
    const dc = XLSX.SSF.parse_date_code(raw);
    if (!dc) return null;
    const d = new Date(dc.y, dc.m - 1, dc.d, dc.H || 0, dc.M || 0, Math.floor(dc.S || 0));
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    if (y < 2000 || y > 2100) return null;
    return d;
  }

  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    if (y < 2000 || y > 2100) return null;
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

  if (s.includes("данс") || s.includes("account") || s.includes("iban") || s.includes("банк")) return true;

  // 10+ оронтой тоо байвал дансны дугаар гэж үзнэ (утас 8 оронтой)
  const chunks = s.match(/\d+/g) ?? [];
  const hasLong = chunks.some((c) => c.length >= 10);
  const hasPhone8 = chunks.some((c) => c.length === 8);

  if (hasLong && !hasPhone8) return true;

  return false;
}

// ✅ Нэг нүдэнд олон дугаар/текст байж болно. Эхний valid утсыг олно.
function parsePhone(raw: any): {
  ok: boolean;
  phoneE164?: string;
  phoneRaw: string;
  reason?: string;
} {
  const s = normalizeCell(raw);

  if (!s) return { ok: false, phoneRaw: "", reason: "хоосон" };

  // ❌ Данс / банк
  if (looksLikeBankAccount(s)) {
    return { ok: false, phoneRaw: s, reason: "данс/банк" };
  }

  // Тоо огт байхгүй
  if (!/\d/.test(s)) {
    return { ok: false, phoneRaw: s, reason: "тоогүй" };
  }

  // 1️⃣ Бүх цифрийг нийлүүлж авна (space, -, . бүгдийг арилгана)
  const digitsOnly = s.replace(/\D/g, "");

  // 2️⃣ Монгол 8 оронтой (хамгийн чухал FIX)
  if (/^\d{8}$/.test(digitsOnly)) {
    const e = normalizePhoneE164(digitsOnly);
    if (e) return { ok: true, phoneE164: e, phoneRaw: s };
  }

  // 3️⃣ 976XXXXXXXX (11 оронтой)
  if (/^976\d{8}$/.test(digitsOnly)) {
    return { ok: true, phoneE164: `+${digitsOnly}`, phoneRaw: s };
  }

  // 4️⃣ +E164 формат
  const plusMatches = s.match(/\+\d{8,15}/g) ?? [];
  const e164 = plusMatches[0];
  if (e164 && /^\+\d{8,15}$/.test(e164)) {
    return { ok: true, phoneE164: e164, phoneRaw: s };
  }

  // 5️⃣ Эцэст нь: 8 оронтой chunk хайна (хуучин логик, fallback)
  const chunks = s.match(/\d+/g) ?? [];
  for (const c of chunks) {
    if (c.length === 8) {
      const e = normalizePhoneE164(c);
      if (e) return { ok: true, phoneE164: e, phoneRaw: s };
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
    if (!ticketPrice || ticketPrice <= 0) return NextResponse.json({ error: "ticketPrice буруу" }, { status: 400 });

    const skipped: Array<{ row: number; reason: string; phoneRaw?: string; paid?: number; qty?: number; diff?: number }> = [];
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
        skipped.push({ row: excelRow, reason: "огноо олдсонгүй", phoneRaw: phoneText, paid });
        current = null;
        continue;
      }

      const parsed = parsePhone(phoneCell);

      // ✅ CASE 1: УТАС олдсон мөр
      if (parsed.ok && parsed.phoneE164) {
        if (paid <= 0) {
          skipped.push({ row: excelRow, reason: "amount хоосон/буруу", phoneRaw: parsed.phoneRaw, paid });
          current = null;
          continue;
        }

        // ✅ Дутуу мөнгө огт оруулахгүй
        if (paid < ticketPrice) {
          skipped.push({ row: excelRow, reason: "дутуу төлсөн", phoneRaw: parsed.phoneRaw, paid });
          current = null;
          continue;
        }

        const qty = Math.floor(paid / ticketPrice);
        if (!Number.isFinite(qty) || qty <= 0 || qty > MAX_QTY) {
          skipped.push({ row: excelRow, reason: `qty буруу (1-${MAX_QTY})`, phoneRaw: parsed.phoneRaw, paid, qty });
          current = null;
          continue;
        }

        const amount = qty * ticketPrice;
        const diff = paid - amount; // 0 эсвэл +

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
      // ❗ Данс/банк/текст мөрийг continuation болгохгүй (машины логик)
      if (phoneText === "") {
        if (!current) {
          skipped.push({ row: excelRow, reason: "continuation боловч өмнөх purchase алга", paid });
          continue;
        }

        if (paid <= 0) {
          skipped.push({ row: excelRow, reason: "continuation amount хоосон", phoneRaw: current.phoneRaw, paid });
          continue;
        }

        const newPaid = current.paid + paid;

        if (newPaid < ticketPrice) {
          skipped.push({ row: excelRow, reason: "continuation нэмээд ч дутуу", phoneRaw: current.phoneRaw, paid: newPaid });
          continue;
        }

        const qty = Math.floor(newPaid / ticketPrice);
        if (!Number.isFinite(qty) || qty <= 0 || qty > MAX_QTY) {
          skipped.push({ row: excelRow, reason: "continuation qty буруу", phoneRaw: current.phoneRaw, paid: newPaid, qty });
          continue;
        }

        current.paid = newPaid;
        current.qty = qty;
        current.amount = qty * ticketPrice;
        current.diff = current.paid - current.amount;

        continue;
      }

      // ✅ CASE 3: банк/данс/утас олдохгүй текст мөр бол import хийхгүй
      skipped.push({ row: excelRow, reason: parsed.reason || "утас олдсонгүй", phoneRaw: parsed.phoneRaw, paid });
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

      const result = await prisma.$transaction(async (tx) => {
        // raffleCounter нь raffle байх үед л үүснэ
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
          // ✅ НЭГ ӨДӨР ОЛОН УДАА АВСАН НЬ ТУСДАА ОРОХООР uniqueKey-г өргөтгөнө
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

        // tickets chunked createMany
        for (let i = 0; i < ticketsAll.length; i += TICKET_CHUNK) {
          const chunk = ticketsAll.slice(i, i + TICKET_CHUNK);
          const created = await tx.ticket.createMany({ data: chunk, skipDuplicates: true });
          insertedTickets += created.count;
          skippedTickets += chunk.length - created.count;
        }

        await tx.raffleCounter.update({ where: { raffleId }, data: { nextSeq } });

        return { purchaseIds, insertedPurchases: batch.length };
      }, { timeout: 600000, maxWait: 60000 });

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
