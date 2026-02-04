"use client";

import { useMemo, useRef, useState } from "react";
import TicketPopup from "@/components/TicketPopup";

type Props = {
  raffleId: string;
  raffleTitle?: string | null;
};

export default function RaffleLookupButton({ raffleId, raffleTitle }: Props) {
  const dlgRef = useRef<HTMLDialogElement | null>(null);

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const title = useMemo(() => raffleTitle ?? "Сугалаа", [raffleTitle]);

  function openDialog(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    setError("");
    setData(null);

    const dlg = dlgRef.current;
    if (!dlg) return;

    // dialog open
    if (typeof dlg.showModal === "function") {
      dlg.showModal();
    } else {
      // very old browsers fallback
      dlg.setAttribute("open", "true");
    }
  }

  function closeDialog() {
    const dlg = dlgRef.current;
    if (!dlg) return;

    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");

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

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={openDialog}
        className="w-full text-center rounded-xl px-3 py-2 font-extrabold
          border border-white/15 bg-emerald-400 text-black hover:bg-emerald-300 transition"
      >
        Код шалгах
      </button>

      {/* ✅ Native dialog */}
      <dialog
        ref={dlgRef}
        // @ts-ignore
        className="p-0 m-0 bg-transparent"
        onClick={(e) => {
          // backdrop click = close
          if (e.target === dlgRef.current) closeDialog();
        }}
      >
        {/* Backdrop styling for dialog */}
        <style jsx global>{`
          dialog::backdrop {
            background: rgba(0, 0, 0, 0.82);
          }
        `}</style>

        {/* Card */}
        <div
          className="
            w-[94vw] max-w-xl
            max-h-[86svh]
            rounded-2xl overflow-hidden
            bg-neutral-950
            border border-white/25
            ring-1 ring-white/15
            shadow-[0_26px_80px_rgba(0,0,0,0.9)]
            flex flex-col
          "
          style={{
            marginTop: "max(env(safe-area-inset-top), 12px)",
            marginBottom: "max(env(safe-area-inset-bottom), 12px)",
          }}
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
                onClick={closeDialog}
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

          {/* body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 overflow-x-hidden">
            <TicketPopup open={true} onClose={() => setData(null)} phone={phone.trim()} data={data} />
            <div className="h-10" />
          </div>

          {/* footer */}
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
      </dialog>
    </div>
  );
}
