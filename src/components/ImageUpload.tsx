"use client";

import { useState } from "react";

export default function ImageUpload({
  onUploaded,
}: {
  onUploaded: (url: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    setLoading(false);

    if (data.url) {
      onUploaded(data.url);
    }
  };

  return (
    <div>
      <input type="file" onChange={upload} />
      {loading && <p>Uploading...</p>}
    </div>
  );
}