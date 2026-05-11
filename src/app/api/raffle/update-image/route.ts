import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { id, imageUrl } = await req.json();

  await prisma.raffle.update({
    where: { id },
    data: { imageUrl },
  });

  return Response.json({ ok: true });
}