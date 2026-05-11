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
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Admin · Сугалаанууд</h1>

        <Link href="/admin/raffles/new">
          + Шинэ сугалаа
        </Link>
      </div>

      <RafflesClient raffles={raffles} />
    </div>
  );
}