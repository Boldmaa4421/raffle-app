import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

// Компьютероос ирсэн зургийг DB-д хадгалаад /api/images/<id> хаяг буцаана
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "Зөвхөн зураг upload хийнэ" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, error: "Зураг 10MB-аас бага байх ёстой" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const img = await prisma.uploadedImage.create({
      data: { data: bytes, mimeType: file.type },
      select: { id: true },
    });

    return NextResponse.json({ success: true, url: `/api/images/${img.id}` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Upload алдаа" }, { status: 500 });
  }
}
