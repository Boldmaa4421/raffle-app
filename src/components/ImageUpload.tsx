"use client";

import { useState } from "react";

export default function ImageUpload({
  raffleId,
}: {
  raffleId: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setLoading(true);

    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onloadend = async () => {
      try {
        // cloudinary upload
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: JSON.stringify({
            image: reader.result,
          }),
        });

        const uploadData = await uploadRes.json();

        // db update
        await fetch("/api/admin/update-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: raffleId,
            imageUrl: uploadData.url,
          }),
        });

        alert("Зураг амжилттай шинэчлэгдлээ");

        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("Алдаа гарлаа");
      }

      setLoading(false);
    };
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFile}
      />

      {loading && (
        <div style={{ marginTop: 8 }}>
          Upload хийж байна...
        </div>
      )}
    </div>
  );
}