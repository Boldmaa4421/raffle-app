"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import TicketPopup from "@/components/TicketPopup";

export default function HomeLookup() {
  const sp = useSearchParams();
  const raffleId = sp.get("raffleId") || "";

  const [phone, setPhone] = useState("");
  const [open, setOpen] = useState(false);
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
    setOpen(true); // ✅ эхлээд popup-оо нээгээд loading харуулна

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

  function closeAll() {
    setOpen(false);
    setError("");
    setData(null);
  }

  return (
    <>
      {/* ✅ Page дээрх input + button */}
      <div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Утасны дугаар"
            inputMode="tel"
            className="w-full flex-1 rounded-xl px-4 py-3 bg-white/5 border border-white/10 outline-none text-[16px]"
          />
          <button
            onClick={onSearch}
            disabled={loading || !phone.trim()}
            className="w-full sm:w-auto rounded-xl px-5 py-3 font-extrabold
              bg-emerald-500/90 hover:bg-emerald-500 text-black disabled:opacity-60"
          >
            {loading ? "..." : "Код шалгах"}
          </button>
        </div>

        <div className="mt-2 text-xs text-white/60">{hint}</div>
        {error && !open && <div className="mt-2 text-sm text-red-400">{error}</div>}
      </div>

      {/* ✅ POPUP wrapper — жижиг утсанд багтана, scroll-той */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center p-3 sm:p-5"
          style={{
            paddingTop: "max(env(safe-area-inset-top), 12px)",
            paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
          }}
        >
          {/* backdrop */}
          <button
            aria-label="Close"
            onClick={closeAll}
            className="absolute inset-0 bg-black/75"
            style={{ WebkitTapHighlightColor: "transparent" }}
          />

          {/* modal */}
          <div
            className="
              relative w-[94vw] max-w-xl
              rounded-2xl overflow-hidden
              border border-white/20
              bg-neutral-950/90
              backdrop-blur-xl shadow-2xl
              ring-1 ring-white/10
              max-h-[86dvh] flex flex-col
            "
          >
            {/* header */}
            <div className="sticky top-0 z-10 p-4 border-b border-white/10 bg-neutral-950/95">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-amber-200/90 font-extrabold truncate">
                    Сугалааны код шалгах
                  </div>
                  <div className="mt-1 text-xs text-white/60">{hint}</div>
                </div>

                <button
                  onClick={closeAll}
                  className="shrink-0 rounded-xl px-3 py-2 font-extrabold
                    border border-white/15 bg-white/5 hover:bg-white/10"
                >
                  Хаах
                </button>
              </div>

              <div className="mt-2 text-xs text-white/60">
                Жишээ: <b>99112233</b> эсвэл <b>+97699112233</b>
              </div>

              {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
              {loading && <div className="mt-2 text-sm text-white/60">Уншиж байна...</div>}
            </div>

            {/* body scroll */}
            <div className="max-h-[75dvh] overflow-y-auto p-5 [webkit-overflow-scrolling:touch]">
              {/* ✅ TicketPopup зөвхөн 4 prop */}
              <TicketPopup
                open={true}
                onClose={closeAll}
                phone={phone.trim()}
                data={data}
              />

              <div className="h-16" />
            </div>

            {/* footer sticky (утсанд хажуу тийш гулгахгүй) */}
            <div className="sticky bottom-0 z-10 p-4 border-t border-white/10 bg-neutral-950/95">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Утасны дугаар"
                  inputMode="tel"
                  className="w-full flex-1 rounded-xl px-4 py-3 bg-white/5 border border-white/10 outline-none text-[16px]"
                />
                <button
                  onClick={onSearch}
                  disabled={loading || !phone.trim()}
                  className="w-full sm:w-auto rounded-xl px-5 py-3 font-extrabold
                    bg-emerald-400 text-black hover:bg-emerald-300 transition disabled:opacity-60"
                >
                  {loading ? "..." : "Хайх"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
