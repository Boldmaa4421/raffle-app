"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import TicketPopup from "@/components/TicketPopup";

type Props = {
  raffleId: string;
  raffleTitle?: string | null;
};

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

export default function RaffleLookupButton({ raffleId, raffleTitle }: Props) {
  const [open, setOpen] = useState(false);

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const title = useMemo(() => raffleTitle ?? "Сугалаа", [raffleTitle]);

  // ✅ ESC close (desktop)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  function closeAll() {
    setOpen(false);
    setError("");
    setData(null);
  }

  return (
    <div className="w-full">
      {/* ✅ Товч — аль ч background дээр харагдахуйц болголоо */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-center rounded-xl px-3 py-2 font-extrabold
          border border-white/15 bg-emerald-400 text-black hover:bg-emerald-300 transition"
      >
        Код шалгах
      </button>

      {open && (
        <Portal>
          {/* ✅ Overlay: body дээр гарна => iPhone/Messenger дээр fixed эвдрэхгүй */}
          <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5"
            style={{
              paddingTop: "max(env(safe-area-inset-top), 12px)",
              paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
            }}
          >
            {/* backdrop */}
            <button
              aria-label="Close"
              onClick={closeAll}
              className="absolute inset-0 bg-black/80"
              style={{ WebkitTapHighlightColor: "transparent" }}
            />

            {/* ✅ Modal card (always above backdrop) */}
            <div
              className="
                relative z-10
                w-[94vw] max-w-xl
                max-h-[86svh]
                rounded-2xl overflow-hidden
                bg-neutral-950
                border border-white/25
                ring-1 ring-white/15
                shadow-[0_26px_80px_rgba(0,0,0,0.9)]
                flex flex-col
              "
            >
              {/* header */}
              <div className="shrink-0 p-4 border-b border-white/10 bg-neutral-950">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-amber-200/95 font-extrabold truncate">
                      {title} · Сугалааны код шалгах
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      Энэ сугалаанд бүртгэлтэй кодуудыг шалгана
                    </div>
                  </div>

                  <button
                    onClick={closeAll}
                    className="shrink-0 rounded-xl px-3 py-2 font-extrabold
                      border border-white/20 bg-white/5 hover:bg-white/10 text-white"
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
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 overflow-x-hidden">
                <TicketPopup
                  open={true}
                  onClose={() => setData(null)}
                  phone={phone.trim()}
                  data={data}
                />
                <div className="h-16" />
              </div>

              {/* footer (✅ жижиг утсанд stack => товч хажуу тийш орохгүй) */}
              <div className="shrink-0 p-4 border-t border-white/10 bg-neutral-950">
                <div className="flex flex-col gap-2">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Утасны дугаар"
                    inputMode="tel"
                    className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/15 outline-none text-[16px] text-white"
                  />
                  <button
                    onClick={onSearch}
                    disabled={loading || !phone.trim()}
                    className="w-full rounded-xl px-5 py-3 font-extrabold
                      bg-amber-300 text-black hover:bg-amber-200 transition disabled:opacity-60"
                  >
                    {loading ? "..." : "Хайх"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
