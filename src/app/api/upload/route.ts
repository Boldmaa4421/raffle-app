import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return Response.json({ error: "No file" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filename = `${Date.now()}-${file.name}`;

  const filepath = path.join(
    process.cwd(),
    "public/uploads",
    filename
  );

  await writeFile(filepath, buffer);

  return Response.json({
    url: `/uploads/${filename}`,
  });
}