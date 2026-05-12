import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file" }, { status: 400 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      return NextResponse.json(
        { success: false, error: "Cloudinary config missing" },
        { status: 500 }
      );
    }

    const cloudinaryForm = new FormData();
    cloudinaryForm.append("file", file);
    cloudinaryForm.append("upload_preset", uploadPreset);
    cloudinaryForm.append("folder", "raffles");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: cloudinaryForm }
    );

    const data = await res.json();

    if (!res.ok || !data.secure_url) {
      console.error("Cloudinary error:", data);
      return NextResponse.json({ success: false, error: data.error?.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: data.secure_url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
