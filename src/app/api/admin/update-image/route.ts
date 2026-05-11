import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { id, imageUrl } = await req.json();

  await prisma.raffle.update({
    where: { id },
    data: { imageUrl },
  });

  return NextResponse.json({ success: true });
}