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

  const money = (n: number) =>
    new Intl.NumberFormat("mn-MN").format(Number(n || 0)) + "₮";

  const codeLabel = (code: string) => {
    // "ABCD-000012" → "12"
    const withoutPrefix = code.replace(/^[A-Za-z0-9]+-/, "");
    const n = parseInt(withoutPrefix, 10);
    return Number.isFinite(n)
      ? String(n)
      : withoutPrefix.replace(/^0+/, "") || withoutPrefix;
  };

  const groups = data?.groups ?? [];
  const purchases = data?.purchases ?? 0;
  const totalCodes = data?.codes ?? 0;

  return (
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
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
        style={{ WebkitTapHighlightColor: "transparent" }}
      />

      {/* modal card */}
      <div className="relative w-[94vw] max-w-xl rounded-2xl border border-white/10 bg-black/75 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* header (sticky) */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 p-4 border-b border-white/10 bg-black/70">
          <div className="min-w-0">
            <div className="text-amber-200/90 font-extrabold truncate">
              Сугалааны код шалгах
            </div>
            <div className="mt-1 text-xs text-white/60 break-words">
              Утас: <b className="text-white/80">{phone || data?.phone || ""}</b>
            </div>
            <div className="mt-1 text-xs text-white/60">
              Худалдан авалт: <b className="text-white/80">{purchases}</b> · Код:{" "}
              <b className="text-emerald-300">{totalCodes}</b>
            </div>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 rounded-xl px-3 py-2 font-extrabold border border-white/10 bg-white/5 hover:bg-white/10"
          >
            Хаах
          </button>
        </div>

        {/* body scroll */}
        <div className="max-h-[78dvh] overflow-y-auto overscroll-contain p-4">
          {!data ? (
            <div className="text-sm text-white/60">Уншиж байна...</div>
          ) : groups.length === 0 ? (
            <div className="text-sm text-white/60">
              Энэ дугаарт бүртгэлтэй код олдсонгүй.
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((g, idx) => (
                <div
                  key={`${g.raffleId}-${idx}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="text-white font-extrabold break-words">
                    {g.raffleTitle || "Сугалаа"}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/60">
                    <div>
                      Огноо: <b className="text-white/80">{fmt(g.purchasedAt)}</b>
                    </div>
                    <div>
                      Дүн: <b className="text-emerald-300">{money(g.amount)}</b>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-white/60">
                    Үүссэн код: <b className="text-emerald-300">{g.codes?.length || 0}</b>
                  </div>

                  {/* codes grid (wrap + responsive) */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(g.codes || []).map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-extrabold text-emerald-200"
                      >
                        {codeLabel(c)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* bottom safe space for mobile keyboards */}
          <div className="h-24" />
        </div>
      </div>
    </div>
  );
}
