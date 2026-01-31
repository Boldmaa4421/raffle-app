"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteRaffleButton({ raffleId }: { raffleId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    const ok = confirm("Энэ сугалааг бүр мөсөн устгах уу? (purchase, ticket, winner бүгд устна)");
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/raffles/${raffleId}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        alert(json?.error || "Устгах үед алдаа гарлаа");
        return;
      }

      alert("✅ Сугалаа устлаа");
      router.refresh();              // list дээр бол refresh хангалттай
      // router.push("/admin/raffles"); // detail page дээр ашиглах бол энэ мөрийг нэмж болно
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onDelete}
      disabled={loading}
      className="rounded-xl px-3 py-2 font-extrabold border border-white/10 bg-red-500/15 hover:bg-red-500/25 text-white disabled:opacity-50"
    >
      {loading ? "..." : "🗑 Устгах"}
    </button>
  );
}
