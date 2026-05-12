import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  await prisma.raffle.update({
    where: {
      id: body.id,
    },
    data: {
      imageUrl: body.imageUrl,
    },
  });

  return NextResponse.json({
    success: true,
  });
}