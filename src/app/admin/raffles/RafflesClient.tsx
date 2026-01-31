"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import DeleteRaffleButton from "./DeleteRaffleButton";

type RaffleRow = {
  id: string;
  title: string | null;
  ticketPrice: number;
  totalTickets: number | null;
  imageUrl: string | null;
  _count: { tickets?: number; purchases?: number };
};

export default function RafflesClient({ raffles }: { raffles: RaffleRow[] }) {
  const router = useRouter();

  return (
    <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
      {raffles.map((raffle) => {
        const sold = raffle._count.tickets ?? 0;
        const total = typeof raffle.totalTickets === "number" ? raffle.totalTickets : 0;
        const remaining = total > 0 ? Math.max(0, total - sold) : null;

        return (
          <div key={raffle.id} style={{ border: "1px solid #eee", borderRadius: 14, overflow: "hidden", background: "white" }}>
            {raffle.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={raffle.imageUrl} alt={raffle.title ?? "raffle"} style={{ width: "100%", height: 140, objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: 140, background: "#f4f4f4" }} />
            )}

            <div style={{ padding: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{raffle.title ?? "Untitled"}</div>

              <div style={{ marginTop: 6, opacity: 0.85 }}>
                Үнэ: <b>{formatMNT(raffle.ticketPrice)}</b>
              </div>

              <div style={{ marginTop: 6, opacity: 0.85 }}>
                Олгосон код: <b>{sold}</b>
                {total ? (
                  <>
                    {" "}
                    / {total} · Үлдсэн: <b>{remaining}</b>
                  </>
                ) : null}
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href={`/admin/raffles/${raffle.id}`} style={btnLight}>
                  Дэлгэрэнгүй
                </Link>

                <button type="button" onClick={() => router.push(`/admin/import?raffleId=${raffle.id}`)} style={btnWarn}>
                  Import
                </button>

                <a href={`/api/admin/raffles/${raffle.id}/export`} style={btnLight}>
                  ⬇ Export CSV
                </a>

                <Link href={`/admin/raffles/${raffle.id}/edit`} style={btnDark}>
                  Засах
                </Link>

                <DeleteRaffleButton raffleId={raffle.id} />
              </div>
            </div>
          </div>
        );
      })}

      {raffles.length === 0 ? <div style={{ opacity: 0.7 }}>Сугалаа алга.</div> : null}
    </div>
  );
}

function formatMNT(n: number) {
  return new Intl.NumberFormat("mn-MN").format(n) + "₮";
}

const btnLight: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "white",
  color: "#111",
  textDecoration: "none",
  fontWeight: 800,
};

const btnWarn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #f4c400",
  background: "#f4c400",
  color: "#111",
  fontWeight: 900,
  cursor: "pointer",
};

const btnDark: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "white",
  textDecoration: "none",
  fontWeight: 800,
};
