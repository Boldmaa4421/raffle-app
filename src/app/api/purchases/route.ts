import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhoneE164 } from "@/lib/phone";
import crypto from "crypto";

type Body = {
  raffleId: string;
  phone: string;
  qty: number;
};

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const raffleId = (body.raffleId || "").trim();
    const phoneRaw = (body.phone || "").trim();
    const qty = Number(body.qty);

    if (!raffleId) return NextResponse.json({ error: "raffleId шаардлагатай" }, { status: 400 });
    if (!phoneRaw) return NextResponse.json({ error: "Утасны дугаар оруулна уу" }, { status: 400 });
    if (!Number.isFinite(qty) || qty <= 0 || qty > 500) {
      return NextResponse.json({ error: "qty буруу байна (1-500)" }, { status: 400 });
    }

    const phoneE164 = normalizePhoneE164(phoneRaw);
    if (!phoneE164) return NextResponse.json({ error: "Утасны дугаараа зөв оруулна уу" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const raffle = await tx.raffle.findUnique({ where: { id: raffleId } });
      if (!raffle) throw new Error("Сугалаа олдсонгүй");

      const ticketPrice = raffle.ticketPrice; // ✅ эндээс
      const amount = qty * ticketPrice;

      const counter = await tx.raffleCounter.upsert({
        where: { raffleId },
        create: { raffleId, nextSeq: 1 },
        update: {},
      });

      const startSeq = counter.nextSeq;
      const endSeq = startSeq + qty;

      await tx.raffleCounter.update({
        where: { raffleId },
        data: { nextSeq: endSeq },
      });

      const uniqueKey = crypto.randomUUID();

      const purchase = await tx.purchase.create({
        data: {
          raffleId,
          phoneRaw,
          phoneE164,
          qty,
          amount,
          uniqueKey,
        },
      });

      const prefix = raffleId.slice(0, 4).toUpperCase();

      const ticketsData = Array.from({ length: qty }).map((_, i) => {
        const seq = startSeq + i;
        return {
          raffleId,
          purchaseId: purchase.id,
          phoneE164,
          seq,
          code: `${prefix}-${pad3(seq)}`,
        };
      });

      // ✅ Давхар insert-ээс хамгаалъя (code unique байгаа тул)
      await tx.ticket.createMany({
        data: ticketsData,
        skipDuplicates: true,
      });

      const tickets = await tx.ticket.findMany({
        where: { purchaseId: purchase.id },
        orderBy: { seq: "asc" },
      });

      return { raffle, purchase, tickets };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Серверийн алдаа" }, { status: 500 });
  }
}
