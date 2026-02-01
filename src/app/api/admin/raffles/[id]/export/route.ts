import { prisma } from "@/lib/prisma";

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: raffleId } = await ctx.params;

  const tickets = await prisma.ticket.findMany({
    where: { raffleId },
    orderBy: { code: "asc" },
    select: {
      code: true,
      createdAt: true,
      purchase: {
        select: {
          createdAt: true,
          phoneE164: true,
          phoneRaw: true,
          amount: true,
          qty: true,
        },
      },
    },
  });

  const header = [
    "code",
    "phoneE164",
    "phoneRaw",
    "purchasedAt",
    "ticketCreatedAt",
    "purchaseAmount",
    "purchaseQty",
  ];

  const lines = [header.join(",")];

  for (const t of tickets) {
    const purchasedAt = t.purchase?.createdAt ? new Date(t.purchase.createdAt).toISOString() : "";
    const ticketCreatedAt = t.createdAt ? new Date(t.createdAt).toISOString() : "";

    lines.push(
      [
        csvEscape(t.code),
        csvEscape(t.purchase?.phoneE164 ?? ""),
        csvEscape(t.purchase?.phoneRaw ?? ""),
        csvEscape(purchasedAt),
        csvEscape(ticketCreatedAt),
        csvEscape(t.purchase?.amount ?? ""),
        csvEscape(t.purchase?.qty ?? ""),
      ].join(",")
    );
  }

  // ✅ BOM + UTF-8
  const bom = "\uFEFF";
  const csv = bom + lines.join("\n");

  // filename ASCII-safe + RFC5987
  const fname = `raffle-${raffleId}-codes.csv`;
  const fnameStar = `UTF-8''${encodeURIComponent(fname)}`;

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fname}"; filename*=${fnameStar}`,
      "cache-control": "no-store",
    },
  });
}
