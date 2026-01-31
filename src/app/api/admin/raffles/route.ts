import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const raffles = await prisma.raffle.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tickets: true } } },
  });

  return NextResponse.json({ raffles });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = (body?.title ?? null) as string | null;
    const ticketPrice = Number(body?.ticketPrice);
    const totalTickets = body?.totalTickets == null ? null : Number(body.totalTickets);

    const payBankLabel = (body?.payBankLabel ?? null) as string | null;
    const payAccount = (body?.payAccount ?? null) as string | null;
    const fbUrl = (body?.fbUrl ?? null) as string | null;
    const imageUrl = (body?.imageUrl ?? null) as string | null;

    if (!Number.isFinite(ticketPrice) || ticketPrice <= 0) {
      return NextResponse.json({ message: "ticketPrice буруу байна" }, { status: 400 });
    }
    if (!imageUrl || !String(imageUrl).trim()) {
      return NextResponse.json({ message: "imageUrl шаардлагатай" }, { status: 400 });
    }
    if (totalTickets != null && (!Number.isFinite(totalTickets) || totalTickets <= 0)) {
      return NextResponse.json({ message: "totalTickets буруу байна" }, { status: 400 });
    }

    const raffle = await prisma.raffle.create({
      data: {
        title: title?.trim() || null,
        ticketPrice,
        totalTickets: totalTickets ?? null,
        payBankLabel: payBankLabel?.trim() || null,
        payAccount: payAccount?.trim() || null,
        fbUrl: fbUrl?.trim() || null,
        imageUrl: String(imageUrl).trim(),
      },
      select: { id: true },
    });

    return NextResponse.json({ id: raffle.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Create raffle failed" }, { status: 500 });
  }
}
