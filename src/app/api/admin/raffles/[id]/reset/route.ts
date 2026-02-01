import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: raffleId } = await ctx.params;

  if (!raffleId) {
    return NextResponse.json({ ok: false, error: "Missing raffle id" }, { status: 400 });
  }

  try {
    // 1) энэ raffle-ийн бүх ticket устгана
    const deletedTickets = await prisma.ticket.deleteMany({
      where: { raffleId },
    });

    // 2) энэ raffle-ийн бүх purchase устгана
    const deletedPurchases = await prisma.purchase.deleteMany({
      where: { raffleId },
    });

    // 3) counter-ийг 1 болгоно (байхгүй бол create хийнэ)
    const counter = await prisma.raffleCounter.upsert({
      where: { raffleId },
      update: { nextSeq: 1 },
      create: { raffleId, nextSeq: 1 },
    });

    return NextResponse.json({
      ok: true,
      raffleId,
      deletedPurchases: deletedPurchases.count,
      deletedTickets: deletedTickets.count,
      nextSeq: counter.nextSeq,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
