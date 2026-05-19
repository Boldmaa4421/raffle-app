import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const winners = await prisma.winner.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      raffle: { select: { id: true, title: true } },
      ticket: { select: { code: true } },
    },
  });
  return NextResponse.json({ ok: true, winners });
}
