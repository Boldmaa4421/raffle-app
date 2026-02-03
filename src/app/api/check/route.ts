import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhoneE164 } from "@/lib/phone";

type Body = {
  phone: string;
  raffleId?: string | null;
};

function cleanPhone(raw: string) {
  return String(raw ?? "").replace(/\s+/g, "").trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const phoneInput = cleanPhone(body.phone || "");
    const raffleId = (body.raffleId || "").trim() || null;

    if (!phoneInput) {
      return NextResponse.json({ error: "Утасны дугаар оруулна уу" }, { status: 400 });
    }

    // MN 8-digit → E164
    let phoneE164 =
      phoneInput.startsWith("+") ? phoneInput : normalizePhoneE164(phoneInput) || "";

    if (!phoneE164) {
      return NextResponse.json({ error: "Утасны дугаар буруу байна" }, { status: 400 });
    }

    const purchases = await prisma.purchase.findMany({
      where: {
        phoneE164,
        ...(raffleId ? { raffleId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        raffle: { select: { id: true, title: true, ticketPrice: true } },
        tickets: { select: { code: true, createdAt: true } },
      },
      take: 200,
    });

    const groups = purchases.map((p) => ({
      raffleId: p.raffleId,
      raffleTitle: p.raffle?.title ?? "Сугалаа",
      purchasedAt: p.createdAt,
      amount: p.amount,
      codes: (p.tickets ?? []).map((t) => t.code),
    }));

    const codesCount = groups.reduce((acc, g) => acc + g.codes.length, 0);

    return NextResponse.json({
      ok: true,
      phone: phoneE164,
      raffleId,
      purchases: purchases.length,
      codes: codesCount,
      groups,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
