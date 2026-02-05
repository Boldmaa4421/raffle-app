"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TicketPopup from "@/components/TicketPopup";

export default function CheckClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const raffleId = sp.get("raffleId") || "";

  const [phone, setPhone] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hint = useMemo(
    () => (raffleId ? "Энэ сугалааны кодыг шалгана" : "Бүх сугалаанаас хайна"),
    [raffleId]
  );

  async function onSearch() {
    const p = phone.trim();
    if (!p) return;

    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p, raffleId: raffleId || null }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Хайлт амжилтгүй");

      setData(json);
    } catch (e: any) {
      setError(e?.message || "Алдаа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto max-w-xl px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-xl px-3 py-2 font-extrabold border border-white/10 bg-white/5 hover:bg-white/10"
          >
            Буцах
          </button>

          <div className="min-w-0 text-right">
            <div className="font-extrabold text-amber-200/90">Код шалгах</div>
            <div className="text-xs text-white/60 truncate">{hint}</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-xl px-4 py-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Утасны дугаар"
              inputMode="tel"
              className="w-full flex-1 rounded-xl px-4 py-3 bg-black/40 border border-white/10 outline-none text-[16px]"
            />
            <button
              onClick={onSearch}
              disabled={loading || !phone.trim()}
              className="w-full sm:w-auto rounded-xl px-5 py-3 font-extrabold
                bg-emerald-500 text-black hover:bg-emerald-400 transition disabled:opacity-60"
            >
              {loading ? "..." : "Хайх"}
            </button>
          </div>

          <div className="mt-2 text-xs text-white/60">
            Жишээ: <b>99112233</b> эсвэл <b>+97699112233</b>
          </div>

          {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
        </div>

        {/* Result (popup биш — page дээрээ гарна) */}
        <div className="mt-4">
          <TicketPopup open={true} onClose={() => setData(null)} phone={phone.trim()} data={data} />
        </div>

        <div className="h-24" />
      </div>
    </div>
  );
}
