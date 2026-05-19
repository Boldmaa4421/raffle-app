import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditRaffleClient from "./EditRaffleClient";

export const dynamic = "force-dynamic";

export default async function EditRafflePage({ params }: { params: { id: string } }) {
  const raffle = await prisma.raffle.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      ticketPrice: true,
      totalTickets: true,
      payBankLabel: true,
      payAccount: true,
      fbUrl: true,
      imageUrl: true,
    },
  });

  if (!raffle) notFound();

  return <EditRaffleClient raffle={raffle} />;
}
