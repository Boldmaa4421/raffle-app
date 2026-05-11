


import { prisma } from "@/lib/prisma";
import BulkImageEditor from "@/components/BulkImageEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";


export default async function Page() {
  const raffles = await prisma.raffle.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      imageUrl: true,
    },
  });

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">
        🖼 Бүх сугалааны зураг засах
      </h1>

      <BulkImageEditor raffles={raffles} />
    </div>
  );
}