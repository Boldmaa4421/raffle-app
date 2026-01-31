import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";

export async function sendPurchaseSms(purchaseId: string) {
  // 1) Purchase + tickets авах
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

  // Давхар SMS явуулахгүй
  if (purchase.smsStatus === "sent") return;

  const codes = purchase.tickets.map((t) => t.code);
  if (codes.length === 0) return;

  // 2) SMS текст
  const message = `Хурдан морь сугалаат худалдаа 🐎

Таны сугалааны код:
${codes.join(", ")}

Амжилт хүсье!`;

  try {
    // 3) SMS илгээх
    const r = await sendSms(purchase.phoneE164, message);

    // ✅ ok:false-г заавал шалгана (энэ хамгийн чухал)
    if (!r.ok) {
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          smsStatus: "failed",
          smsError: `${r.statusCode ? `[${r.statusCode}] ` : ""}${r.error}`,
        },
      });
      return;
    }

    // 4) Амжилттай бол DB update
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        smsStatus: "sent",
        smsSentAt: new Date(),
        smsError: null,
      },
    });
  } catch (err: any) {
    // 5) Алдаа гарвал DB-д хадгална
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        smsStatus: "failed",
        smsError: String(err?.message || err),
      },
    });
  }
}
