"use client";

import React, { useMemo } from "react";

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
    const withoutPrefix = code.replace(/^[A-Za-z0-9]+-/, "");
    const n = parseInt(withoutPrefix, 10);
    return Number.isFinite(n) ? String(n) : withoutPrefix.replace(/^0+/, "") || withoutPrefix;
  };

  const groups = data?.groups ?? [];
  const totalPurchases = data?.purchases ?? 0;
  const totalCodes = data?.codes ?? 0;

  return (
    <div className="relative">
      <div className="text-sm text-white/80">
        <span className="font-semibold">Утас:</span>{" "}
        <span className="font-extrabold">{data?.phone || phone}</span>
        <span className="text-white/50"> · </span>
        <span className="font-semibold">Худалдан авалт:</span>{" "}
        <span className="font-extrabold">{totalPurchases}</span>
        <span className="text-white/50"> · </span>
        <span className="font-semibold">Код:</span>{" "}
        <span className="font-extrabold">{totalCodes}</span>
      </div>

      {groups.length === 0 ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4 text-white/70">
          Код олдсонгүй.
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {groups.map((g, idx) => (
            <div
              key={`${g.raffleId}-${idx}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-extrabold text-white truncate">{g.raffleTitle}</div>
                  <div className="mt-1 text-xs text-white/60">
                    Огноо: <span className="font-semibold">{fmt(g.purchasedAt)}</span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-emerald-300 font-extrabold">
                    {Intl.NumberFormat("mn-MN").format(g.amount)}₮
                  </div>
                  <div className="text-xs text-white/60">
                    Код: <span className="font-extrabold text-white">{g.codes.length}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {g.codes.map((c) => (
                  <span
                    key={c}
                    className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-200 font-extrabold"
                  >
                    {codeLabel(c)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* close hook */}
      <button className="sr-only" onClick={onClose} aria-label="close" />
    </div>
  );
}
