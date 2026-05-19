import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();

    const { title, ticketPrice, totalTickets, payBankLabel, payAccount, fbUrl, imageUrl } = body;

    const priceNum = Number(ticketPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return NextResponse.json({ message: "Нэгж үнэ зөв байх ёстой" }, { status: 400 });
    }

    const updated = await prisma.raffle.update({
      where: { id },
      data: {
        title: title?.trim() || null,
        ticketPrice: priceNum,
        totalTickets: totalTickets ? Number(totalTickets) : null,
        payBankLabel: payBankLabel?.trim() || null,
        payAccount: payAccount?.trim() || null,
        fbUrl: fbUrl?.trim() || null,
        ...(imageUrl?.trim() ? { imageUrl: imageUrl.trim() } : {}),
      },
    });

    return NextResponse.json({ ok: true, raffle: updated });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Update failed" }, { status: 400 });
  }
}

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
