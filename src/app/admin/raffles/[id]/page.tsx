import Link from "next/link";
import { prisma } from "@/lib/prisma";
import WinnerBox from "./WinnerBox";
import DeleteRaffleButton from "../../../../components/DeleteRaffleButton";



function formatMNT(n: number) {
  return new Intl.NumberFormat("mn-MN").format(n) + "₮";
}

export default async function AdminRaffleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const raffleId = params.id;

  const raffle = await prisma.raffle.findUnique({
  where: { id: raffleId },
  select: {
    id: true,
    title: true,
    ticketPrice: true,
    imageUrl: true,
    totalTickets: true,
    payBankLabel: true,
    payAccount: true,
    fbUrl: true,
    createdAt: true,
  },
})


  if (!raffle) {
    return (
      <div style={{ padding: 24 }}>
        <p>Сугалаа олдсонгүй.</p>
        <Link href="/admin/raffles">← Буцах</Link>
      </div>
    );
  }

  const [ticketsCount, purchasesCount, sumAmount, lastImportAt] = await Promise.all([
    prisma.ticket.count({ where: { raffleId } }),
    prisma.purchase.count({ where: { raffleId } }),
    prisma.purchase.aggregate({ where: { raffleId }, _sum: { amount: true } }),
    prisma.purchase.aggregate({ where: { raffleId }, _max: { createdAt: true } }),
  ]);

  
  const latestPurchases = await prisma.purchase.findMany({
    where: { raffleId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      phoneE164: true,
      phoneRaw: true,
      qty: true,
      amount: true,
      createdAt: true,
      uniqueKey: true,

       // ✅ нэм
    smsStatus: true,
    smsSentAt: true,
    smsError: true,
    },
  });
  const winner = await prisma.winner.findUnique({
    where: { raffleId },
    include: { ticket: { select: { code: true } } }, // ✅ phoneE164 устгав
  });

  const last = lastImportAt._max.createdAt
    ? new Date(lastImportAt._max.createdAt).toLocaleString()
    : "—";

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <Link href="/admin/raffles" style={{ textDecoration: "none" }}>
            ← Буцах
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: "10px 0 0" }}>{raffle.title}</h1>
          <p style={{ opacity: 0.8, marginTop: 6 }}>
            Created: <b>{new Date(raffle.createdAt).toLocaleString()}</b>
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a
            href={`/api/admin/raffles/${raffle.id}/export`}
            style={{
              display: "inline-block",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "white",
              color: "#111",
              textDecoration: "none",
              height: "fit-content",
              fontWeight: 700,
            }}
          >
            ⬇ Export codes (CSV)
          </a>

          <Link
            href={`/admin/import?raffleId=${raffle.id}`}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "white",
              textDecoration: "none",
              height: "fit-content",
            }}
          >
            Import хийх
          </Link>
        </div>
      </div>

      {/* ✅ WinnerBox-оо энд render хий */}
      <div style={{ marginTop: 14 }}>
        <WinnerBox raffleId={raffle.id} />
      </div>

      {/* (Хэрвээ winner info-г энд харуулахыг хүсвэл) */}
      {winner && (
  <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
    <div style={{ fontWeight: 900 }}>Winner</div>
    <div style={{ marginTop: 6 }}>
      Code: <b>{winner.ticket?.code ?? "—"}</b>
    </div>
    {winner.displayName && (
      <div>
        Name: <b>{winner.displayName}</b>
      </div>
    )}
    {winner.phone && (
      <div>
        Phone: <b>{winner.phone}</b>
      </div>
    )}
  </div>
)}


      {/* ... үлдсэн код чинь хэвээрээ ... */}
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <Stat title="Нэгж үнэ" value={formatMNT(raffle.ticketPrice)} />
        <Stat title="Нийт код" value={String(ticketsCount)} />
        <Stat title="Нийт purchase" value={String(purchasesCount)} />
        <Stat title="Нийт орлого" value={formatMNT(sumAmount._sum.amount ?? 0)} />
        <Stat title="Сүүлийн импорт" value={last} />
      </div>
<div style={{ fontFamily: "monospace", opacity: 0.7 }}>
  raffle.id: {raffle.id}
</div>

      <h3 style={{ marginTop: 18 }}>Сүүлийн purchase-ууд</h3>
      <div style={{ overflow: "auto", border: "1px solid #eee", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={th}>Огноо</th>
              <th style={th}>Утас</th>
              <th style={th}>Qty</th>
              <th style={th}>Дүн</th>
              <th style={th}>uniqueKey</th>
              <th style={th}>SMS</th>

            </tr>
          </thead>
          <tbody>
            {latestPurchases.map((p) => (
              <tr key={p.id}>
                <td style={td}>{new Date(p.createdAt).toLocaleString()}</td>
                <td style={td}>
                  <div style={{ fontWeight: 800 }}>{p.phoneE164}</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>{p.phoneRaw}</div>
                </td>
                <td style={td}>{p.qty}</td>
                <td style={td}>{formatMNT(p.amount)}</td>
                <td style={{ ...td, fontFamily: "monospace", fontSize: 12, opacity: 0.8 }}>
                  {p.uniqueKey}
                  <td style={td}>
  {p.smsStatus === "sent" ? (
    <span style={{
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      border: "1px solid rgba(34,197,94,.35)",
      background: "rgba(34,197,94,.12)",
      fontWeight: 800,
      fontSize: 12,
    }}>
      ✅ Явсан
     {p.smsSentAt ? (
    <span style={{ opacity: 0.75, fontWeight: 800 }}>
      {new Date(p.smsSentAt).toLocaleString()}
    </span>
  ) : null}
</span>
  ) : p.smsStatus === "failed" ? (
    <span style={{
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      border: "1px solid rgba(239,68,68,.35)",
      background: "rgba(239,68,68,.12)",
      fontWeight: 800,
      fontSize: 12,
    }}
    title={p.smsError ?? ""}
    >
      ❌ Амжилтгүй
    </span>
  ) : (
    <span style={{
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,.12)",
      background: "rgba(255,255,255,.06)",
      fontWeight: 800,
      fontSize: 12,
      opacity: 0.8,
    }}>
      — Илгээгдээгүй
    </span>
  )}
</td>

                </td>
              </tr>
            ))}
            {latestPurchases.length === 0 && (
              <tr>
                <td style={td} colSpan={6}>
                  Одоогоор purchase алга.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, opacity: 0.75 }}>
        Дараагийн алхам: эндээс “Export codes”, “Winner сонгох”, “SMS илгээх” товчууд нэмнэ.
      </div>
    </div>
  );    
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, background: "white" }}>
      <div style={{ opacity: 0.75 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>{value}</div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 10,
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: 10,
  borderBottom: "1px solid #f3f3f3",
  verticalAlign: "top",
};
