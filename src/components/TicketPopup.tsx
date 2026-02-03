"use client";

import React from "react";

type Group = {
  raffleId: string;
  raffleTitle: string;
  purchasedAt: string | Date;
  amount: number;
  codes: string[];
};

export default function TicketPopup({
  open,
  onClose,
  phone,
  data,
}: {
  open: boolean;
  onClose: () => void;
  phone: string;
  data: { phone: string; purchases: number; codes: number; groups: Group[] } | null;
}) {
  if (!open) return null;

  const fmt = (d: any) => {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? "" : dt.toLocaleString();
  };

  const codeLabel = (code: string) => {
    // "ABCD-000012" → "12"
    const withoutPrefix = code.replace(/^[A-Za-z0-9]+-/, "");
    const n = parseInt(withoutPrefix, 10);
    return Number.isFinite(n) ? String(n) : withoutPrefix.replace(/^0+/, "") || withoutPrefix;
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="absolute left-1/2 top-10 w-[min(980px,92vw)] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#0b0f14]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="text-lg font-extrabold text-white">Үр дүн</div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-bold text-white/85 hover:bg-white/10"
          >
            Хаах
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="text-white/80 text-sm">
            Утас: <b className="text-white">{data?.phone || phone}</b> • Худалдан авалт:{" "}
            <b className="text-white">{data?.purchases ?? 0}</b> • Код:{" "}
            <b className="text-amber-300">{data?.codes ?? 0}</b>
          </div>

          <div className="mt-4 space-y-3">
            {(data?.groups ?? []).map((g, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="font-extrabold text-white">{g.raffleTitle}</div>
                  <div className="text-sm text-white/70">{fmt(g.purchasedAt)}</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {g.codes.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-sm font-extrabold text-emerald-200"
                    >
                      {codeLabel(c)}
                    </span>
                  ))}
                </div>

                {(g.amount ?? 0) > 0 && (
                  <div className="mt-3 text-right font-extrabold text-amber-300">
                    {new Intl.NumberFormat("mn-MN").format(g.amount)}₮
                  </div>
                )}
              </div>
            ))}

            {(data?.groups?.length ?? 0) === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/75">
                Энэ дугаарт код олдсонгүй.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
