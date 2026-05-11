"use client";

import { useState } from "react";

export default function ImageUpload({
  onUploaded,
}: {
  onUploaded: (url: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: form,
    });

    const data = await res.json();

    setLoading(false);

    if (data.url) {
      onUploaded(data.url);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="file" onChange={upload} />
      {loading && <p className="text-sm text-white/70">Uploading...</p>}
    </div>
  );
}