"use client";

import { useState } from "react";

export default function BulkImageEditor({ raffles }: any) {
  const [data, setData] = useState(raffles);

  const uploadImage = async (file: File) => {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: form,
    });

    return await res.json();
  };

  const updateImage = async (id: string, url: string) => {
    await fetch("/api/raffle/update-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, imageUrl: url }),
    });
  };

  const handleChange = async (id: string, file: File) => {
    const uploaded = await uploadImage(file);

    await updateImage(id, uploaded.url);

    setData((prev: any[]) =>
      prev.map((r) =>
        r.id === id ? { ...r, imageUrl: uploaded.url } : r
      )
    );
  };

  return (
    <div className="space-y-4">
      {data.map((r: any) => (
        <div
          key={r.id}
          className="flex items-center gap-4 bg-white/10 p-3 rounded"
        >
          {/* preview */}
          <img
            src={r.imageUrl || "/placeholder.png"}
            className="w-20 h-14 object-cover rounded"
          />

          {/* title */}
          <div className="w-40">{r.title}</div>

          {/* upload */}
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleChange(r.id, file);
            }}
          />

          <span className="text-green-400 text-sm">
            {r.imageUrl ? "OK" : "No image"}
          </span>
        </div>
      ))}
    </div>
  );
}