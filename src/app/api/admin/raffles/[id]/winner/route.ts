import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Body = {
  code?: string;
  displayName?: string | null;
  phone?: string | null;
  bio?: string | null;
  imageUrl?: string | null;
  facebookLiveUrl?: string | null;
  publish?: boolean;
};

async function findTicket(raffleId: string, codeInput: string) {
  // Зөвхөн тоо оруулсан бол sequence number-ээр хайна (006, 506, 1200 гэх мэт)
  if (/^\d+$/.test(codeInput)) {
    const padded = codeInput.padStart(6, "0");
    return prisma.ticket.findFirst({
      where: { raffleId, code: { endsWith: `-${padded}` } },
      select: {
        id: true,
        code: true,
        purchase: { select: { phoneE164: true, phoneRaw: true, createdAt: true } },
      },
    });
  }
  // Үгүй бол яг код-оор хайна
  return prisma.ticket.findFirst({
    where: { raffleId, code: codeInput },
    select: {
      id: true,
      code: true,
      purchase: { select: { phoneE164: true, phoneRaw: true, createdAt: true } },
    },
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: raffleId } = await ctx.params;
    const body = (await req.json()) as Body;

    const isPublish = !!body.publish;
    const codeInput = (body.code || "").trim();

    // Нийтлэхэд ticket код заавал хэрэгтэй
    if (isPublish && !codeInput) {
      return NextResponse.json({ error: "Нийтлэхийн тулд ticket код оруулна уу" }, { status: 400 });
    }

    let ticketId: string | undefined;
    let ticketResult: { code: string; purchase: any } | null = null;

    if (codeInput) {
      const ticket = await findTicket(raffleId, codeInput);
      if (!ticket) {
        return NextResponse.json({ error: "Ticket олдсонгүй" }, { status: 404 });
      }
      ticketId = ticket.id;
      ticketResult = ticket;
    }

    const winner = await prisma.winner.upsert({
      where: { raffleId },
      update: {
        ...(ticketId !== undefined ? { ticketId } : {}),
        displayName: body.displayName ?? null,
        phone: body.phone ?? null,
        bio: body.bio ?? null,
        imageUrl: body.imageUrl ?? null,
        facebookLiveUrl: body.facebookLiveUrl ?? null,
        publishedAt: isPublish ? new Date() : null,
      },
      create: {
        raffleId,
        ...(ticketId !== undefined ? { ticketId } : {}),
        displayName: body.displayName ?? null,
        phone: body.phone ?? null,
        bio: body.bio ?? null,
        imageUrl: body.imageUrl ?? null,
        facebookLiveUrl: body.facebookLiveUrl ?? null,
        publishedAt: isPublish ? new Date() : null,
      } as any,
      include: {
        ticket: { select: { code: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      winner,
      ticket: ticketResult
        ? {
            code: ticketResult.code,
            phoneE164: ticketResult.purchase?.phoneE164,
            phoneRaw: ticketResult.purchase?.phoneRaw,
            purchasedAt: ticketResult.purchase?.createdAt,
          }
        : null,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: raffleId } = await ctx.params;
    await prisma.winner.delete({ where: { raffleId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Устгахад алдаа" }, { status: 500 });
  }
}

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
