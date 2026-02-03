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
  downloadOverpayReport?: boolean; // ✅ import дуусаад илүү төлсөнүүдийн тайлан Excel-аар татах
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

/**
 * ✅ Excel serial-ийг LOCAL date-р үүсгэнэ. (UTC биш)
 */
function parseDate(raw: any): Date | null {
  if (!raw) return null;

  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw;
  }

  // Excel serial
  if (typeof raw === "number") {
    const dc = XLSX.SSF.parse_date_code(raw);
    if (!dc) return null;

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

  // string
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

/**
 * ✅ ДАНСНЫ ЛОГИК БАЙХГҮЙ (хуучнаараа буцаасан)
 * - 8 оронтой монгол дугаар (99112233) -> +97699112233
 * - 976xxxxxxxx -> +976xxxxxxxx
 * - +<8-15 digits> гадаад дугаар зөвшөөрнө
 */
function parsePhone(raw: any): {
  ok: boolean;
  phoneE164?: string;
  phoneRaw: string;
  reason?: string;
} {
  const s = normalizeCell(raw);

  if (!s) return { ok: false, phoneRaw: "", reason: "хоосон" };

  // тоо байгаа эсэх
  if (!/\d/.test(s)) return { ok: false, phoneRaw: s, reason: "дан текст" };

  // 8 оронтойг хамгийн түрүүнд авна
  const chunks = s.match(/\d+/g) ?? [];
  const mn8 = chunks.find((c) => c.length === 8);
  if (mn8) {
    const e = normalizePhoneE164(mn8);
    if (e) return { ok: true, phoneE164: e, phoneRaw: s };
  }

  // +976... / 976... / бусад +E164
  const compact = s.replace(/[^\d+]/g, "");
  const e164 = compact.startsWith("+")
    ? compact
    : compact.startsWith("976")
    ? `+${compact}`
    : "";

  if (e164 && /^\+\d{8,15}$/.test(e164)) {
    return { ok: true, phoneE164: e164, phoneRaw: s };
  }

  return { ok: false, phoneRaw: s, reason: "утас олдсонгүй" };
}

function sha1(input: string) {
  return crypto.createHash("sha1").update(input).digest("hex");
}

// ---------- handler ----------
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const raffleId = (body.raffleId || "").trim();
    const sourceFile = (body.sourceFile || "excel").trim();
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const downloadOverpayReport = Boolean(body.downloadOverpayReport);

    if (!raffleId)
      return NextResponse.json(
        { error: "raffleId шаардлагатай" },
        { status: 400 }
      );
    if (rows.length === 0)
      return NextResponse.json({ error: "rows хоосон" }, { status: 400 });

    const raffle = await prisma.raffle.findUnique({
      where: { id: raffleId },
      select: { id: true, ticketPrice: true },
    });
    if (!raffle)
      return NextResponse.json({ error: "Сугалаа олдсонгүй" }, { status: 404 });

    const ticketPrice = raffle.ticketPrice;
    if (!ticketPrice || ticketPrice <= 0) {
      return NextResponse.json({ error: "ticketPrice буруу" }, { status: 400 });
    }

    type Group = {
      startRow: number;
      purchasedAt: Date;
      phoneRaw: string;
      phoneE164: string;

      paid: number; // нийлбэр төлсөн
      qty: number; // floor(paid / ticketPrice)
      amount: number; // qty * ticketPrice (DB amount)
      diff: number; // paid - amount (илүү бол +)
    };

    const skipped: Array<{
      row: number;
      reason: string;
      phoneRaw?: string;
      paid?: number;
      diff?: number;
      ticketPrice?: number;
    }> = [];

    const groups: Group[] = [];

    // ✅ илүү төлсөнүүдийн тайлан мөрүүд (Excel download хийхэд)
    const reportRows: Array<{
      excelRow: number;
      purchasedAt: string;
      phoneRaw: string;
      phoneE164: string;
      qty: number;
      ticketPrice: number;
      expectedAmount: number;
      paidAmount: number;
      overpayDiff: number;
      purchaseId?: string;
      uniqueKey?: string;
    }> = [];

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
        });
        current = null;
        continue;
      }

      const parsed = parsePhone(phoneCell);

      // --- CASE 1: УТАС БАЙГАА МӨР ---
      if (parsed.ok && parsed.phoneE164) {
        if (paid <= 0) {
          skipped.push({
            row: excelRow,
            reason: "дүн (amount) хоосон/буруу",
            phoneRaw: parsed.phoneRaw,
            paid,
            ticketPrice,
          });
          current = null;
          continue;
        }

        // ✅ ДУТУУ мөнгө: ticketPrice-аас бага бол оруулахгүй
        if (paid < ticketPrice) {
          skipped.push({
            row: excelRow,
            reason: "дутуу мөнгө (ticketPrice-аас бага)",
            phoneRaw: parsed.phoneRaw,
            paid,
            diff: paid - ticketPrice,
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
            ticketPrice,
          });
          current = null;
          continue;
        }

        const amount = qty * ticketPrice;
        const diff = paid - amount; // илүү бол +, яг таарсан бол 0

        // ✅ ЗӨВХӨН ИЛҮҮ ТӨЛСӨНГ DB-Д ОРУУЛНА (diff > 0)
     // ✅ ДУТУУ биш бол оруулна (яг таарсан = diff 0 OK)
if (diff < 0) {
  skipped.push({
    row: excelRow,
    reason: "дутуу төлбөр (тооцоогоор)",
    phoneRaw: parsed.phoneRaw,
    paid,
    diff,
    ticketPrice,
  });
  current = null;
  continue;
}

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

      // --- CASE 2: УТАСГҮЙ МӨР (continuation) ---
      if (phoneText === "") {
        if (!current) {
          skipped.push({
            row: excelRow,
            reason: "утасгүй мөр (continuation) гэхдээ өмнөх purchase алга",
            phoneRaw: "",
            paid,
            ticketPrice,
          });
          continue;
        }

        if (paid <= 0) {
          skipped.push({
            row: excelRow,
            reason: "утасгүй мөрийн дүн хоосон",
            phoneRaw: "",
            paid,
            ticketPrice,
          });
          continue;
        }

        // ✅ continuation дээр paid нэмнэ
        const newPaid = current.paid + paid;

        // дутуу бол (нийлбэрээр) оруулахгүй
        if (newPaid < ticketPrice) {
          skipped.push({
            row: excelRow,
            reason: "утасгүй мөр нэмээд ч дутуу мөнгө",
            phoneRaw: current.phoneRaw,
            paid: newPaid,
            diff: newPaid - ticketPrice,
            ticketPrice,
          });
          continue;
        }

        const qty = Math.floor(newPaid / ticketPrice);
        if (!Number.isFinite(qty) || qty <= 0 || qty > MAX_QTY) {
          skipped.push({
            row: excelRow,
            reason: "утасгүй мөрийн qty хэтэрсэн/буруу",
            phoneRaw: current.phoneRaw,
            paid: newPaid,
            ticketPrice,
          });
          continue;
        }

        current.paid = newPaid;
        current.qty = qty;
        current.amount = qty * ticketPrice;
        current.diff = current.paid - current.amount;

        // ✅ нэмэлт мөрүүдийн дараа илүү биш болчихвол: энэ purchase-г DB-д оруулахгүй
        if (current.diff < 0) {
          skipped.push({
            row: excelRow,
            reason: "нэмэлт мөрүүдийн дараа илүү төлөлт үгүй болсон",
            phoneRaw: current.phoneRaw,
            paid: current.paid,
            diff: current.diff,
            ticketPrice,
          });

          // current нь хамгийн сүүлд push хийгдсэн гэж үзэж groups-с устгана
          groups.pop();
          current = null;
        }

        continue;
      }

      // --- CASE 3: ДАН ТЕКСТ/УТАС ОЛДСОНГҮЙ ---
      skipped.push({
        row: excelRow,
        reason: parsed.reason || "дан текст/утас олдсонгүй",
        phoneRaw: parsed.phoneRaw,
        paid,
        ticketPrice,
      });
    }

    // ✅ Overpaid тоолох (diff>0)
    const overpaidCount = groups.length;

    // ✅ Том import дээр transaction timeout-оос сэргийлж БАГЦАЛЖ оруулна
    const BATCH = 30;

    let insertedPurchases = 0;
    let insertedTickets = 0;
    let skippedTickets = 0;

    const allPurchaseIds: string[] = [];

    for (let b = 0; b < groups.length; b += BATCH) {
      const batch = groups.slice(b, b + BATCH);

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

          for (const g of batch) {
            const uniqueKey = sha1(`${raffleId}:${sourceFile}:${g.startRow}`);

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

            // ✅ reportRows-д нэмнэ (diff>0 л groups-д байгаа)
            reportRows.push({
              excelRow: g.startRow,
              purchasedAt: g.purchasedAt.toISOString(),
              phoneRaw: g.phoneRaw,
              phoneE164: g.phoneE164,
              qty: g.qty,
              ticketPrice,
              expectedAmount: g.amount,
              paidAmount: g.paid,
              overpayDiff: g.diff,
              purchaseId: purchase.id,
              uniqueKey,
            });

            const startSeq = nextSeq;
            const endSeq = startSeq + g.qty;
            nextSeq = endSeq;

            const ticketsData = Array.from({ length: g.qty }).map((_, i) => {
              const n = startSeq + i;
              return {
                raffleId,
                purchaseId: purchase.id,
                code: `${prefix}-${pad6(n)}`,
                createdAt: g.purchasedAt,
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

          return { purchaseIds, insertedPurchases: batch.length };
        },
        { timeout: 600000, maxWait: 60000 }
      );

      insertedPurchases += result.insertedPurchases;
      allPurchaseIds.push(...result.purchaseIds);
    }

    // ✅ Commit болсон ДАРАА SMS (concurrency=5)
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

        if (executing.size >= limit) {
          await Promise.race(executing);
        }
      }
      return Promise.allSettled(ret);
    }

    await runPool(allPurchaseIds, 5, (id) => sendPurchaseSms(id));

    const skippedCount = skipped.length;

    // ✅ Хэрвээ Excel report хүссэн бол binary (.xlsx) буцаана
    if (downloadOverpayReport) {
      const ws = XLSX.utils.json_to_sheet(reportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Overpay Report");

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="overpay-report-${raffleId}.xlsx"`,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      raffleId,
      sourceFile,

      groups: groups.length,
      insertedPurchases,
      insertedTickets,
      skippedTickets,

      overpaidCount,
      skippedCount,

      skippedPreview: skipped.slice(0, 500),
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || "Серверийн алдаа" },
      { status: 500 }
    );
  }
}
