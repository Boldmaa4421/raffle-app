import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const raffles = await prisma.raffle.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(raffles);
}

export async function POST(req: Request) {
  const body = await req.json();

  const title = String(body?.title ?? "").trim();
  const ticketPrice = Number(body?.ticketPrice);
  const drawAtRaw = body?.drawAt;

  if (!title) return new Response("title шаардлагатай", { status: 400 });
  if (!Number.isFinite(ticketPrice) || ticketPrice <= 0)
    return new Response("ticketPrice буруу", { status: 400 });
  if (!drawAtRaw) return new Response("drawAt шаардлагатай", { status: 400 });

  const drawAt = new Date(drawAtRaw);
  if (Number.isNaN(drawAt.getTime()))
    return new Response("drawAt буруу форматтай", { status: 400 });

  const raffle = await prisma.raffle.create({
   data: { title, ticketPrice },

  });

  return NextResponse.json(raffle);
}
