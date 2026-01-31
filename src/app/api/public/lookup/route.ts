import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizePhone(input: string) {
  const digits = (input || "").replace(/\D/g, "");
  // Mongolia: 8 digits -> +976XXXXXXXX
  if (digits.length === 8) return `+976${digits}`;
  // If already includes country code 976...
  if (digits.startsWith("976") && digits.length === 11) return `+${digits}`;
  // If starts with +...
  if (input.trim().startsWith("+")) return input.trim();
  // fallback: try +digits
  return digits ? `+${digits}` : "";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone") ?? "";
  const phoneE164 = normalizePhone(phone);

  if (!phoneE164) {
    return NextResponse.json({ ok: false, message: "Утас оруулна уу." }, { status: 400 });
  }

  const purchases = await prisma.purchase.findMany({
    where: { phoneE164 },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      qty: true,
      amount: true,
      tickets: { select: { code: true }, orderBy: { createdAt: "asc" } as any },
      raffle: { select: { id: true, title: true, ticketPrice: true } },
    },
  });

  const totalCodes = purchases.reduce((acc, p) => acc + p.tickets.length, 0);

  return NextResponse.json({
    ok: true,
    phoneE164,
    totalPurchases: purchases.length,
    totalCodes,
    purchases: purchases.map((p) => ({
      id: p.id,
      createdAt: p.createdAt,
      qty: p.qty,
      amount: p.amount,
      raffle: p.raffle,
      codes: p.tickets.map((t) => t.code),
    })),
  });
}
