"use client";

import { useMemo, useState, useEffect } from "react";
import TicketPopup from "@/components/TicketPopup";

type Props = {
  raffleId: string;
  raffleTitle?: string | null;
};

export default function RaffleLookupButton({ raffleId, raffleTitle }: Props) {
  const [open, setOpen] = useState(false);

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const title = useMemo(() => raffleTitle ?? "Сугалаа", [raffleTitle]);

  function closeAll() {
    setOpen(false);
    setError("");
    setData(null);
  }

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
        body: JSON.stringify({ phone: p, raffleId }),
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

  // ESC to close (desktop)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-center rounded-xl px-3 py-2 font-extrabold
          border border-white/10 bg-white/5 hover:bg-white/10 transition"
      >
        Код шалгах
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center p-3 sm:p-5"
          style={{
            paddingTop: "max(env(safe-area-inset-top), 12px)",
            paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
          }}
        >
          {/* ✅ BACKDROP (илүү харанхуй болгож ялгаруулна) */}
          <button
            aria-label="Close"
            onClick={closeAll}
            className="absolute inset-0 bg-black/75"
            style={{ WebkitTapHighlightColor: "transparent" }}
          />

          {/* ✅ MODAL */}
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
            {/* HEADER */}
            <div className="sticky top-0 z-10 p-4 border-b border-white/10 bg-neutral-950/95">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-amber-200/90 font-extrabold truncate">
                    {title} · Код шалгах
                  </div>
                  <div className="mt-1 text-xs text-white/60">
                    Энэ сугалаанд бүртгэлтэй кодуудыг шалгана
                  </div>
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
            </div>

            {/* BODY (scroll) */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4">
              {data ? (
                <TicketPopup
                  open={true}
                  onClose={() => setData(null)}
                  phone={phone.trim()}
                  data={data}
                />
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/70">
                  Утасны дугаараа оруулаад <b>Хайх</b> дарна уу.
                </div>
              )}

              {loading && (
                <div className="mt-3 text-sm text-white/60">
                  Уншиж байна...
                </div>
              )}

              {/* extra space for small phones */}
              <div className="h-16" />
            </div>

            {/* FOOTER (sticky) — ✅ жижиг утсанд stack */}
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
    </div>
  );
}
