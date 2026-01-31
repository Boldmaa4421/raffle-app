import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RafflesClient from "./RafflesClient";

export const dynamic = "force-dynamic";

export default async function AdminRafflesPage() {
  const raffles = await prisma.raffle.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tickets: true, purchases: true } } }, // purchases байхгүй бол энэ мөрийг ав
  });

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>Admin · Сугалаанууд</h1>

        <Link href="/admin/raffles/new" style={{ textDecoration: "none", fontWeight: 900 }}>
          + Шинэ сугалаа
        </Link>
      </div>

      <RafflesClient raffles={raffles} />
    </div>
  );
}
