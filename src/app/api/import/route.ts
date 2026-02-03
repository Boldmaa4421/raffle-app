import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhoneE164 } from "@/lib/phone";
import crypto from "crypto";
import * as XLSX from "xlsx";

type Body = {
  raffleId: string;
  sourceFile?: string;
  rows: Array<{ purchasedAt?: any; amount?: any; phone?: any }>;
};

function toInt(raw: any) {
  const n = Number(String(raw ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function pad6(n: number) {
  return String(n).padStart(6, "0");
}

function normalizePhoneCell(raw: any) {
  return String(raw ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ✅ Excel serial date-г LOCAL-аар үүсгэнэ (UTC ашиглахгүй)
 * Ингэснээр 1 өдөр хойшлох, цаг зөрөх асуудал арилна.
 */
function parseDate(raw: any): Date | null {
  if (!raw) return null;

  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;

  // Excel serial number
  if (typeof raw === "number") {
    const dc = XLSX.SSF.parse_date_code(raw);
    if (!dc) return null;

    // ✅ UTC биш LOCAL
    const d = new Date(
      dc.y,
      dc.m - 1,
      dc.d,
      dc.H || 0,
      dc.M || 0,
      Math.floor(dc.S || 0)
    );

    if (isNaN(d.getTime())) return null;

    const y = d.getFullYear();
    if (y < 2000 || y > 2100) return null;

    return d;
  }

  // String date
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;

    // ⚠️ ISO "2026-01-13" мэт string бол timezone-оос болж зөрж магадгүй.
    // Боломжтой бол Excel-ээс actual date value (serial) ирэх нь хамгийн зөв.
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;

    const y = d.getFullYear();
    if (y < 2000 || y > 2100) return null;

    return d;
  }

  return null;
}

function pickRow(row: { purchasedAt?: any; amount?: any; phone?: any }) {
  const purchasedAt = parseDate(row.purchasedAt);
  const amount = toInt(row.amount);
  const phoneCell = row.phone;
  return { purchasedAt, amount, phoneCell };
}

/**
 * Өршөөх phone parse:
 * - MN 8 digit бол normalizePhoneE164 ашиглана
 * - Intl 9..15 digit -> +xxxxxxxx
 * - 00... эхэлбэл + болгож авна
 */
function parsePhone(raw: any): {
  primary: string | null;
  allE164: string[];
  phoneRaw: string;
  reason?: string;
} {
  const s = normalizePhoneCell(raw);

  if (!s) return { primary: null, allE164: [], phoneRaw: "", reason: "хоосон" };
  if (!/\d/.test(s)) return { primary: null, allE164: [], phoneRaw: s, reason: "дан текст" };

  const chunks = s.match(/\d+/g) ?? [];

  function splitBy8(x: string) {
    const out: string[] = [];
    if (x.length % 8 === 0 && x.length >= 16) {
      for (let i = 0; i < x.length; i += 8) out.push(x.slice(i, i + 8));
      return out;
    }
    return [x];
  }

  const candidatesMN: string[] = [];
  const candidatesIntl: string[] = [];

  for (const c0 of chunks) {
    const c = c0.replace(/\D/g, "");
    if (!c) continue;

    for (const part of splitBy8(c)) {
      if (part.length === 8) candidatesMN.push(part);
      else if (part.length >= 9 && part.length <= 15) candidatesIntl.push(part);
    }
  }

  // "99 01 90 96" төрлийн
  if (candidatesMN.length === 0 && chunks.length > 1) {
    for (let i = 0; i < chunks.length; i++) {
      let acc = "";
      for (let j = i; j < chunks.length; j++) {
        acc += chunks[j].replace(/\D/g, "");
        if (acc.length === 8) {
          candidatesMN.push(acc);
          break;
        }
        if (acc.length > 8) break;
      }
    }
  }

  const allE164: string[] = [];

  for (const mn of candidatesMN) {
    const e = normalizePhoneE164(mn);
    if (e && !allE164.includes(e)) allE164.push(e);
  }

  for (let intl of candidatesIntl) {
    if (intl.startsWith("00")) intl = intl.slice(2);
    const e = `+${intl}`;
    if (!allE164.includes(e)) allE164.push(e);
  }

  if (allE164.length === 0) {
    return { primary: null, allE164: [], phoneRaw: s, reason: "дан текст/богино тоо" };
  }

  const primary = allE164.find((x) => x.startsWith("+976")) ?? allE164[0];
  return { primary, allE164, phoneRaw: s };
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
    const MAX_QTY = 500;

    type Group = {
      startRow: number;
      purchasedAt: Date;
      amount: number;
      phoneRaw: string;
      phoneE164: string;
      qty: number;
    };

    const skipped: { row: number; reason: string; raw: any }[] = [];
    const groups: Group[] = [];

    let lastDate: Date | null = null;
    let current: Group | null = null;

    for (let i = 0; i < rows.length; i++) {
      const excelRow = i + 2;
      const raw = rows[i];

      const hasSomething =
        normalizePhoneCell((raw as any)?.phone) ||
        String((raw as any)?.amount ?? "").trim() ||
        String((raw as any)?.purchasedAt ?? "").trim();

      if (!hasSomething) continue;

      const { purchasedAt, amount, phoneCell } = pickRow(raw);
      const phoneText = normalizePhoneCell(phoneCell);
      const parsed = parsePhone(phoneCell);

      if (purchasedAt) lastDate = purchasedAt;
      const effectiveDate = purchasedAt ?? lastDate;

      if (!effectiveDate) {
        skipped.push({ row: excelRow, reason: "огноо олдсонгүй (өмнөхөөс өвлөх боломжгүй)", raw });
        current = null;
        continue;
      }

      // --- CASE 1: УТАС БАЙГАА МӨР ---
      if (parsed.primary) {
        const finalAmount = amount > 0 ? amount : ticketPrice;

        if (finalAmount <= 0) {
          skipped.push({ row: excelRow, reason: "дүн (amount) хоосон/буруу", raw });
          current = null;
          continue;
        }
        if (finalAmount % ticketPrice !== 0) {
          skipped.push({
            row: excelRow,
            reason: `дүн буруу (ticketPrice=${ticketPrice}-д хуваагдахгүй)`,
            raw,
          });
          current = null;
          continue;
        }

        const qty = finalAmount / ticketPrice;
        if (!Number.isFinite(qty) || qty <= 0 || qty > MAX_QTY) {
          skipped.push({ row: excelRow, reason: `qty буруу (1-${MAX_QTY})`, raw });
          current = null;
          continue;
        }

        current = {
          startRow: excelRow,
          purchasedAt: effectiveDate,
          amount: finalAmount,
          phoneRaw: parsed.phoneRaw,
          phoneE164: parsed.primary,
          qty,
        };
        groups.push(current);
        continue;
      }

      // --- CASE 2: УТАСГҮЙ МӨР (continuation) ---
      if (phoneText === "") {
        if (!current) {
          skipped.push({ row: excelRow, reason: "утасгүй мөр (continuation) гэхдээ өмнөх purchase алга", raw });
          continue;
        }

        const addAmount = amount > 0 ? amount : ticketPrice;

        if (addAmount % ticketPrice !== 0) {
          skipped.push({ row: excelRow, reason: "утасгүй мөрийн дүн буруу", raw });
          continue;
        }

        const addQty = addAmount / ticketPrice;
        if (!Number.isFinite(addQty) || addQty <= 0 || current.qty + addQty > MAX_QTY) {
          skipped.push({ row: excelRow, reason: "утасгүй мөрийн qty хэтэрсэн/буруу", raw });
          continue;
        }

        current.qty += addQty;
        current.amount = current.qty * ticketPrice;
        continue;
      }

      skipped.push({ row: excelRow, reason: parsed.reason || "дан текст/богино тоо", raw });
    }

    // ✅ Код дарааллыг нэг транзакц дотор баталгаатай өсгөнө
    const result = await prisma.$transaction(
      async (tx) => {
        const counter = await tx.raffleCounter.upsert({
          where: { raffleId },
          create: { raffleId, nextSeq: 1 },
          update: {},
        });

        let nextSeq = counter.nextSeq;
        const prefix = raffleId.slice(0, 4).toUpperCase();

        let insertedPurchases = 0;
        let insertedTickets = 0;
        let skippedTickets = 0;

        for (const g of groups) {
          const uniqueKey = crypto
            .createHash("sha1")
            .update(`${raffleId}:${sourceFile}:${g.startRow}`)
            .digest("hex");

          const purchase = await tx.purchase.upsert({
            where: { uniqueKey },
            update: {
              phoneRaw: g.phoneRaw,
              phoneE164: g.phoneE164,
              qty: g.qty,
              amount: g.amount,
              createdAt: g.purchasedAt, // ✅ LOCAL date хадгална
            },
            create: {
              raffleId,
              phoneRaw: g.phoneRaw,
              phoneE164: g.phoneE164,
              qty: g.qty,
              amount: g.amount,
              createdAt: g.purchasedAt, // ✅ LOCAL date хадгална
              uniqueKey,
            },
          });

          insertedPurchases += 1;

          const startSeq = nextSeq;
          const endSeq = startSeq + g.qty;
          nextSeq = endSeq;

          const ticketsData = Array.from({ length: g.qty }).map((_, i) => {
            const n = startSeq + i;
            return {
              raffleId,
              purchaseId: purchase.id,
              code: `${prefix}-${pad6(n)}`,
              createdAt: g.purchasedAt, // ✅ LOCAL date хадгална
            };
          });

          const created = await tx.ticket.createMany({
            data: ticketsData,
            skipDuplicates: true,
          });

          insertedTickets += created.count;
          skippedTickets += ticketsData.length - created.count;
        }

        await tx.raffleCounter.update({
          where: { raffleId },
          data: { nextSeq },
        });

        return { groups: groups.length, insertedPurchases, insertedTickets, skippedTickets };
      },
      { timeout: 600000, maxWait: 60000 }
    );

    return NextResponse.json({
      ok: true,
      raffleId,
      sourceFile,
      ...result,
      skipped,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Серверийн алдаа" }, { status: 500 });
  }
}
