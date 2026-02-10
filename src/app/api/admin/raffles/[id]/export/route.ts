import { prisma } from "@/lib/prisma";

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ✅ Date-г Монголын цагаар CSV-д "YYYY-MM-DD HH:mm:ss" болгож бичнэ
function formatCsvDateMN(dt: Date | string | null | undefined) {
  if (!dt) return "";
  const d = dt instanceof Date ? dt : new Date(dt);
  if (isNaN(d.getTime())) return "";

  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  // sv-SE parts => YYYY-MM-DD + HH:mm:ss
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
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
    // ✅ UTC ISO биш — Монголын цагаар бичнэ
    const purchasedAt = formatCsvDateMN(t.purchase?.createdAt ?? null);
    const ticketCreatedAt = formatCsvDateMN(t.createdAt);

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
