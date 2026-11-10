import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const img = await prisma.uploadedImage.findUnique({
    where: { id },
    select: { data: true, mimeType: true },
  });

  if (!img) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(img.data), {
    headers: {
      "Content-Type": img.mimeType,
      // Зураг өөрчлөгдөхгүй (шинэ upload = шинэ id) тул удаан cache хийнэ
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
