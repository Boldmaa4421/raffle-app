"use client";

import { useState } from "react";

export default function ImageUploadEdit({
  raffleId,
  currentUrl,
}: {
  raffleId: string;
  currentUrl?: string | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(currentUrl);

  const upload = async () => {
    if (!file) return alert("Зураг сонгоно уу");

    const formData = new FormData();
    formData.append("file", file);

    // 1. upload хийх
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    // 2. DB update хийх
    await fetch("/api/raffle/update-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: raffleId,
        imageUrl: data.url,
      }),
    });

    setPreview(data.url);

    alert("Зураг амжилттай солигдлоо");
  };

  return (
    <div className="mt-2 space-y-2">
      {/* preview */}
      {preview && (
        <img
          src={preview}
          className="w-40 h-24 object-cover rounded border"
        />
      )}

      {/* file input */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      {/* button */}
      <button
        onClick={upload}
        className="bg-amber-400 text-black px-3 py-1 rounded"
      >
        Upload & Save
      </button>
    </div>
  );
}