import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RafflesClient from "./RafflesClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AdminRafflesPage() {
  const raffles = await prisma.raffle.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { tickets: true, purchases: true } },
    },
  });

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Admin · Сугалаанууд</h1>

        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/admin/winners" style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #ddd", background: "white", fontWeight: 700, textDecoration: "none", color: "#111" }}>
            🏆 Азтангууд
          </Link>
          <Link href="/admin/raffles/new" style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #111", background: "#111", fontWeight: 700, textDecoration: "none", color: "white" }}>
            + Шинэ сугалаа
          </Link>
        </div>
      </div>

      <RafflesClient raffles={raffles} />
    </div>
  );
}