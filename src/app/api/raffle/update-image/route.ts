import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();

  await prisma.raffle.update({
    where: { id: body.id },
    data: { imageUrl: body.imageUrl },
  });

  return Response.json({ ok: true });
}