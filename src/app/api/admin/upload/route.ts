import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export const runtime = "nodejs"; // fs ашиглахын тулд

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "file алга" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";

    const name = `${crypto.randomUUID()}.${safeExt}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    await fs.writeFile(path.join(uploadDir, name), bytes);

    return NextResponse.json({ ok: true, url: `/uploads/${name}` });
  } catch (e: any) {
    console.error("UPLOAD_ERROR:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Upload error" }, { status: 500 });
  }
}
