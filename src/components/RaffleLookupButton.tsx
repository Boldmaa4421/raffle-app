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

  // ✅ iOS/Messenger дээр body scroll түгжих нь заримдаа modal-ыг “алга” болгодог.
  // Тиймээс бид зөвхөн background scroll-ыг багасгах, гэхдээ хүчээр overflow=hidden хийхгүй.
  useEffect(() => {
    if (!open) return;
    // input focus үед viewport үсэрдэг тул жижигхэн хамгаалалт
    window.scrollTo({ top: window.scrollY, behavior: "instant" as any });
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
          className="fixed inset-0 z-[99999] flex items-center justify-center"
          // ✅ iOS дээр 100svh хамгийн тогтвортой
          style={{
            height: "100svh",
            paddingTop: "max(env(safe-area-inset-top), 10px)",
            paddingBottom: "max(env(safe-area-inset-bottom), 10px)",
          }}
        >
          {/* ✅ backdrop: заавал modal-оос доор байрлуулна */}
          <div
            className="absolute inset-0 bg-black/80"
            onClick={closeAll}
            style={{ WebkitTapHighlightColor: "transparent" }}
          />

          {/* ✅ MODAL: z-10 заавал өгнө (backdrop дээр гарч ирнэ) */}
          <div
            className="
              relative z-10
              w-[calc(100vw-24px)] max-w-xl
              max-h-[calc(100svh-24px)]
              rounded-2xl overflow-hidden
              bg-neutral-950
              border border-white/25
              shadow-[0_24px_70px_rgba(0,0,0,0.9)]
              ring-1 ring-white/10
              flex flex-col
            "
          >
            {/* Header */}
            <div className="shrink-0 p-4 border-b border-white/10 bg-neutral-950">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-amber-200/90 font-extrabold truncate">
                    {title} · Сугалааны код шалгах
                  </div>
                  <div className="mt-1 text-xs text-white/60">
                    Энэ сугалаанд бүртгэлтэй кодуудыг шалгана
                  </div>
                </div>

                <button
                  onClick={closeAll}
                  className="shrink-0 rounded-xl px-3 py-2 font-extrabold
                    border border-white/20 bg-white/5 hover:bg-white/10"
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

            {/* Body (scroll) */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 overflow-x-hidden">
              <TicketPopup open={true} onClose={() => setData(null)} phone={phone.trim()} data={data} />
              <div className="h-16" />
            </div>

            {/* Footer (input+button) — жижиг утсанд stack */}
            <div className="shrink-0 p-4 border-t border-white/10 bg-neutral-950">
              <div className="flex flex-col gap-2">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Утасны дугаар"
                  inputMode="tel"
                  className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 outline-none text-[16px]"
                />
                <button
                  onClick={onSearch}
                  disabled={loading || !phone.trim()}
                  className="w-full rounded-xl px-5 py-3 font-extrabold
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
