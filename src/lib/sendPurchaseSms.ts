import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";

export async function sendPurchaseSms(purchaseId: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      tickets: {
        select: { code: true },
        orderBy: { code: "asc" },
      },
    },
  });

  if (!purchase) return;
  if (!purchase.phoneE164) return;

  const codes = purchase.tickets.map((t) => t.code);
  if (codes.length === 0) return;

  const message = `Хурдан морь сугалаат худалдаа 🐎

Таны сугалааны код:
${codes.join(", ")}

Амжилт хүсье!`;

  try {
    const r = await sendSms(purchase.phoneE164, message);

    if (!r.ok) {
      console.error("SMS failed:", {
        purchaseId,
        phone: purchase.phoneE164,
        statusCode: r.statusCode,
        error: r.error,
      });
      return;
    }

    // ✅ schema дээр smsStatus талбар байхгүй тул DB update хийхгүй
    return;
  } catch (err: any) {
    console.error("SMS exception:", {
      purchaseId,
      phone: purchase.phoneE164,
      error: String(err?.message || err),
    });
  }
}
