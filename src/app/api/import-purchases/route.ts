import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhoneE164 } from "@/lib/phone";
import crypto from "crypto";

type Body = {
  raffleId: string;
  sourceFile?: string;
  rows: Record<string, any>[]; // sheet_to_json-оос ирсэн raw objects
};

function pad3(n: number) {
  return String(n).padStart(6, "0");
}

function extractPhone(raw: any) {
  const s = String(raw ?? "").trim();
  // "99216416 ХУРАЙ ХУРАЙ" -> "99216416"
  const m = s.match(/(\d{6,12})/);
  return m ? m[1] : "";
}

function toInt(raw: any) {
  const n = Number(String(raw ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function parseDate(raw: any): Date | null {
  // sheet_to_json дээр Date object, number(serial), string аль нь ч байж болно
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;

  if (typeof raw === "number") {
    // Excel serial -> JS date (rough but ok)
    // 25569 = 1970-01-01
    const ms = (raw - 25569) * 86400 * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(String(raw));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Sheet бүтэц чинь тогтмол 3 баганатай мэт харагдаж байна:
 * DateTime | Amount | Phone(+note)
 * Гэхдээ header нэрүүд ямар ч байж магадгүй тул:
 * - эхний "date-like" утгыг date
 * - эхний "number-like" утгыг amount
 * - эхний "phone-like" утгыг phone гэж танина
 */
function pickFields(row: Record<string, any>) {
  const vals = Object.values(row);

  let dateVal: any = null;
  let amountVal: any = null;
  let phoneVal: any = null;

  for (const v of vals) {
    if (!dateVal) {
      const d = parseDate(v);
      if (d) dateVal = v;
    }
  }

  for (const v of vals) {
    if (!amountVal) {
      const n = toInt(v);
      // 5000,10000 гэх мэт дүн байдаг тул 0-оос их бол amount гэж үзье
      if (n > 0) amountVal = v;
    }
  }

  for (const v of vals) {
    if (!phoneVal) {
      const p = extractPhone(v);
      if (p) phoneVal = v;
    }
  }

  const purchasedAt = parseDate(dateVal);
  const amount = toInt(amountVal);
  const phoneRaw = extractPhone(phoneVal);

  return { purchasedAt, amount, phoneRaw };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const raffleId = (body.raffleId || "").trim();
    const sourceFile = (body.sourceFile || "excel").trim();
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!raffleId) return NextResponse.json({ error: "raffleId шаардлагатай" }, { status: 400 });
    if (rows.length === 0) return NextResponse.json({ error: "rows хоосон" }, { status: 400 });

    const raffle = await prisma.raffle.findUnique({ where: { id: raffleId } });
    if (!raffle) return NextResponse.json({ error: "Сугалаа олдсонгүй" }, { status: 404 });

    // 1) Raw мөрүүдийг purchase group болгон нэгтгэнэ
    type Group = { startRow: number; purchasedAt: Date; amount: number; phoneE164: string; phoneRaw: string; qty: number; };
    const groups: Group[] = [];

    let current: Group | null = null;

    for (let i = 0; i < rows.length; i++) {
      const excelRow = i + 2; // header гэж үзээд
      const { purchasedAt, amount, phoneRaw } = pickFields(rows[i]);

      const normalized = phoneRaw ? normalizePhoneE164(phoneRaw) : null;

      const hasNewPurchaseSignal = Boolean(purchasedAt) || amount > 0; // огноо/дүн гарвал шинэ purchase эхэлнэ

      if (hasNewPurchaseSignal) {
        if (!purchasedAt) throw new Error(`Row ${excelRow}: огноо олдсонгүй`);
        if (!normalized) throw new Error(`Row ${excelRow}: утас буруу`);
        if (amount <= 0) throw new Error(`Row ${excelRow}: amount буруу`);

        current = {
          startRow: excelRow,
          purchasedAt,
          amount,
          phoneE164: normalized,
          phoneRaw,
          qty: 1,
        };
        groups.push(current);
        continue;
      }

      // зөвхөн утасны мөр: өмнөх purchase-ийн нэмэлт тасалбар гэж үзнэ
      if (!current) {
        // sheet эхний мөрөөсөө л date/amount-тай эхлэх ёстой
        throw new Error(`Row ${excelRow}: эхний purchase мэдээлэлгүй мөр байна`);
      }

      // утас өөр байвал алдаа гэж барина (sheet чинь нэг хүний тасалбарууд дараалж бичигддэг логиктой)
      if (normalized && normalized !== current.phoneE164) {
        throw new Error(`Row ${excelRow}: утас өөрчлөгдсөн байна (group алдагдсан)`);
      }

      current.qty += 1;
    }

    // 2) Counter-оо safe болгоё: одоо DB-д байгаа max seq + 1-ээс бага байвал дээшлүүлнэ
   const result = await prisma.$transaction(async (tx) => {
  await tx.raffleCounter.upsert({
    where: { raffleId },
    create: { raffleId, nextSeq: 1 },
    update: {},
  });

 // ✅ raffle бүр дээр давтагдахгүй prefix (6 тэмдэг)
const prefix = raffleId.slice(-6).toUpperCase();


  const pad6 = (n: number) => String(n).padStart(6, "0");

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
        createdAt: g.purchasedAt,
      },
      create: {
        raffleId,
        phoneRaw: g.phoneRaw,
        phoneE164: g.phoneE164,
        qty: g.qty,
        amount: g.amount,
        createdAt: g.purchasedAt,
        uniqueKey,
      },
    });

    insertedPurchases += 1;

    const c = await tx.raffleCounter.findUnique({ where: { raffleId } });
    if (!c) throw new Error("counter олдсонгүй");

    const startSeq = c.nextSeq;
    const endSeq = startSeq + g.qty;

    await tx.raffleCounter.update({
      where: { raffleId },
      data: { nextSeq: endSeq },
    });

   const pad6 = (n: number) => String(n).padStart(6, "0");
const prefix = raffleId.slice(0, 4).toUpperCase();

// counter-оос startSeq авсан хэвээр
const ticketsData = Array.from({ length: g.qty }).map((_, i) => {
  const n = startSeq + i;
  return {
    raffleId,                 // ✅ required
    purchaseId: purchase.id,  // ✅ required
    code: `${prefix}-${pad6(n)}`, // ✅ unique
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

  return { insertedPurchases, insertedTickets, skippedTickets, groups: groups.length };
});


    return NextResponse.json({ ok: true, raffleId, sourceFile, ...result });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Серверийн алдаа" }, { status: 500 });
  }
}
