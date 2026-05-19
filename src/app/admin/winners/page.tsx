import Link from "next/link";
import { prisma } from "@/lib/prisma";
import WinnersClient from "./WinnersClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminWinnersPage() {
  const [winners, raffles] = await Promise.all([
    prisma.winner.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        raffle: { select: { id: true, title: true } },
        ticket: { select: { code: true } },
      },
    }),
    prisma.raffle.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Admin · Азтангууд</h1>
        <Link href="/admin/raffles" style={{ color: "#666", textDecoration: "none" }}>
          ← Буцах
        </Link>
      </div>

      <WinnersClient initialWinners={winners as any} raffles={raffles} />
    </div>
  );
}
