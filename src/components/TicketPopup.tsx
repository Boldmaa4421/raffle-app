"use client";

import React, { useEffect } from "react";

type TicketPopupProps = {
  open: boolean;
  onClose: () => void;
  phone?: string;
  data?: any; // backend response shape өөр байж болох тул safe
};

export default function TicketPopup({ open, onClose, phone, data }: TicketPopupProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  // ---- data normalize (аль ч формат ирсэн OK) ----
  const purchases: any[] =
    (Array.isArray(data?.purchases) && data.purchases) ||
    (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data?.rows) && data.rows) ||
    [];

  const directCodes: string[] =
    (Array.isArray(data?.codes) && data.codes) ||
    (Array.isArray(data?.tickets) && data.tickets.map((t: any) => t?.code).filter(Boolean)) ||
    [];

  const totalPurchases =
    typeof data?.totalPurchases === "number"
      ? data.totalPurchases
      : typeof data?.purchasesCount === "number"
      ? data.purchasesCount
      : purchases.length;

  const totalTickets =
    typeof data?.totalTickets === "number"
      ? data.totalTickets
      : typeof data?.ticketsCount === "number"
      ? data.ticketsCount
      : (purchases.reduce((acc, p) => acc + (p?.tickets?.length || p?.codes?.length || 0), 0) || directCodes.length);

  const title = data?.raffleTitle || data?.title || "Сугалаа";

  function fmtDate(d: any) {
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return "";
      return dt.toLocaleString("mn-MN");
    } catch {
      return "";
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center p-3 sm:p-5"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 12px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop */}
      <button
        aria-label="Хаах"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
        style={{ WebkitTapHighlightColor: "transparent" }}
      />

      {/* modal */}
      <div className="relative w-[94vw] max-w-xl rounded-2xl border border-white/10 bg-black/80 shadow-2xl">
        {/* header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 p-4 border-b border-white/10 bg-black/60 backdrop-blur">
          <div className="min-w-0">
            <div className="text-amber-200/90 font-extrabold text-base sm:text-lg truncate">
              {title} · Сугалааны код
            </div>
            <div className="mt-1 text-xs text-white/60">
              {phone ? (
                <>
                  Утас: <span className="font-semibold text-white/80">{phone}</span>
                </>
              ) : (
                "Таны кодыг харуулна"
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 rounded-xl px-3 py-2 font-extrabold border border-white/10 bg-white/5 hover:bg-white/10"
          >
            Хаах
          </button>
        </div>

        {/* body (scrollable) */}
        <div className="max-h-[78vh] overflow-auto p-4">
          {/* summary */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-white/60 text-xs">Худалдан авалт</div>
              <div className="text-white font-extrabold text-lg">{totalPurchases || 0}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-white/60 text-xs">Код</div>
              <div className="text-white font-extrabold text-lg">{totalTickets || 0}</div>
            </div>
          </div>

          {/* content */}
          <div className="mt-4 space-y-3">
            {/* If API returned purchases */}
            {purchases.length > 0 ? (
              purchases.map((p, idx) => {
                const codes: string[] =
                  (Array.isArray(p?.tickets) && p.tickets.map((t: any) => t?.code).filter(Boolean)) ||
                  (Array.isArray(p?.codes) && p.codes.filter(Boolean)) ||
                  [];

                return (
                  <div key={p?.id || idx} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="text-white/80 text-sm font-bold">
                        Худалдан авалт #{idx + 1} {p?.createdAt ? <span className="text-white/50 font-normal">· {fmtDate(p.createdAt)}</span> : null}
                      </div>

                      {/* paid/overpay */}
                      <div className="text-xs text-white/70">
                        {typeof p?.paidAmount === "number" ? (
                          <>
                            Төлсөн: <b>{p.paidAmount}</b>
                            {typeof p?.overpayDiff === "number" && p.overpayDiff > 0 ? (
                              <>
                                {" "}
                                · Илүү: <b className="text-amber-200">{p.overpayDiff}</b>
                              </>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* codes */}
                    {codes.length > 0 ? (
                      <div className="mt-3 rounded-xl bg-black/40 border border-white/10 p-3">
                        <div className="text-xs text-white/60 mb-2">Таны сугалааны код</div>
                        <div className="text-sm text-white font-semibold break-words leading-relaxed">
                          {codes.join(", ")}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-white/60">Код олдсонгүй</div>
                    )}
                  </div>
                );
              })
            ) : directCodes.length > 0 ? (
              // If API returned direct codes array
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60 mb-2">Таны сугалааны код</div>
                <div className="text-sm text-white font-semibold break-words leading-relaxed">
                  {directCodes.join(", ")}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                Код олдсонгүй. Утасны дугаараа зөв оруулсан эсэхээ шалгана уу.
              </div>
            )}
          </div>

          {/* spacer for sticky footer */}
          <div className="h-16" />
        </div>

        {/* footer (always visible on small phones) */}
        <div
          className="sticky bottom-0 z-10 border-t border-white/10 bg-black/70 backdrop-blur p-3"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
        >
          <button
            onClick={onClose}
            className="w-full rounded-xl px-5 py-3 font-extrabold bg-amber-300 text-black hover:bg-amber-200 transition"
          >
            Хаах
          </button>
        </div>
      </div>
    </div>
  );
}
