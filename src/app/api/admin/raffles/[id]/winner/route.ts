import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Body = {
  code: string;               // ялсан ticket code
  displayName?: string | null;
  bio?: string | null;
  imageUrl?: string | null;
  facebookLiveUrl?: string | null;
  publish?: boolean;          // true бол publishedAt set
};

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: raffleId } = await ctx.params;
    const body = (await req.json()) as Body;

    const code = (body.code || "").trim();
    if (!code) return NextResponse.json({ error: "code шаардлагатай" }, { status: 400 });

    // 1) Ticket олно
    const ticket = await prisma.ticket.findFirst({
      where: { raffleId, code },
      select: {
        id: true,
        code: true,
        purchase: { select: { phoneE164: true, phoneRaw: true, createdAt: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ийм кодтой ticket олдсонгүй" }, { status: 404 });
    }

    // 2) Winner upsert (raffle дээр ганц л winner)
    const winner = await prisma.winner.upsert({
      where: { raffleId },
      update: {
        ticketId: ticket.id,
        displayName: body.displayName ?? null,
        bio: body.bio ?? null,
        imageUrl: body.imageUrl ?? null,
        facebookLiveUrl: body.facebookLiveUrl ?? null,
        publishedAt: body.publish ? new Date() : null,
      },
      create: {
        raffleId,
        ticketId: ticket.id,
        displayName: body.displayName ?? null,
        bio: body.bio ?? null,
        imageUrl: body.imageUrl ?? null,
        facebookLiveUrl: body.facebookLiveUrl ?? null,
        publishedAt: body.publish ? new Date() : null,
      },
      include: {
        ticket: { select: { code: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      winner,
      ticket: {
        code: ticket.code,
        phoneE164: ticket.purchase?.phoneE164,
        phoneRaw: ticket.purchase?.phoneRaw,
        purchasedAt: ticket.purchase?.createdAt,
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// ✅ Admin detail page дээр winner-г харуулахад хэрэгтэй (optional)
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: raffleId } = await ctx.params;

  const winner = await prisma.winner.findUnique({
    where: { raffleId },
    include: {
      ticket: {
        select: { code: true, purchase: { select: { phoneE164: true, createdAt: true } } },
      },
    },
  });

  return NextResponse.json({ ok: true, winner });
}
