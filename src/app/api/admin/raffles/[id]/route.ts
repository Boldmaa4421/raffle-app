import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    // /api/admin/raffles/<id> → pathname split
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts[parts.length - 1]; // хамгийн сүүлийн segment

    if (!id || id === "raffles") {
      return new NextResponse("Missing raffle id in route params", { status: 400 });
    }

    await prisma.$transaction([
      prisma.ticket.deleteMany({ where: { raffleId: id } }),
      prisma.purchase.deleteMany({ where: { raffleId: id } }),
      prisma.winner.deleteMany({ where: { raffleId: id } }),
      prisma.raffleCounter.deleteMany({ where: { raffleId: id } }),
      prisma.raffle.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Delete failed", { status: 400 });
  }
}
