"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteRaffleButton({ raffleId }: { raffleId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    if (!raffleId || typeof raffleId !== "string") {
      alert("raffleId дамжуулагдаагүй байна");
      return;
    }

    const ok = confirm(`Энэ сугалааг устгах уу?\nID: ${raffleId}`);
    if (!ok) return;

    setLoading(true);
    try {
      const url = `/api/admin/raffles/${encodeURIComponent(raffleId)}`;
      const res = await fetch(url, { method: "DELETE" });

      const text = await res.text();
      if (!res.ok) {
        alert(text || "Delete failed");
        return;
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={loading}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #e5484d",
        background: "#e5484d",
        color: "white",
        fontWeight: 900,
        cursor: "pointer",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? "Устгаж байна…" : "Устгах"}
    </button>
  );
}
