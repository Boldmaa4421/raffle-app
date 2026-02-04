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
  loading,
  error,
  onSearch,
  setPhone,
}: {
  open: boolean;
  onClose: () => void;
  phone: string;
  data: { phone: string; purchases: number; codes: number; groups: Group[] } | null;
  loading: boolean;
  error: string;
  onSearch: (p: string) => void;
  setPhone: (v: string) => void;
}) {
  if (!open) return null;

  const fmt = (d: any) => {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? "" : dt.toLocaleString("mn-MN");
  };

  const codeLabel = (code: string) => {
    const withoutPrefix = code.replace(/^[A-Za-z0-9]+-/, "");
    const n = parseInt(withoutPrefix, 10);
    return Number.isFinite(n) ? String(n) : withoutPrefix.replace(/^0+/, "") || withoutPrefix;
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-stretch sm:items-center justify-center"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 12px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
      }}
    >
      {/* ✅ backdrop — илүү ялгаралт */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-[2px]"
        style={{ WebkitTapHighlightColor: "transparent" }}
      />

      {/* ✅ card */}
      <div className="relative w-[96vw] sm:max-w-xl h-[92dvh] sm:h-auto sm:max-h-[86dvh] overflow-hidden rounded-2xl border border-white/20 bg-[#070b0a]/95 shadow-[0_25px_90px_rgba(0,0,0,0.7)] outline outline-1 outline-white/10">
        {/* header */}
        <div className="sticky top-0 z-20 flex items-start justify-between gap-3 p-4 border-b border-white/10 bg-[#070b0a]/95">
          <div className="min-w-0">
            <div className="text-amber-200/95 font-extrabold truncate">
              Сугалааны код шалгах
            </div>
            <div className="mt-1 text-xs text-white/70 truncate">
              Жишээ: <b className="text-white/90">99112233</b> эсвэл <b className="text-white/90">+97699112233</b>
            </div>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 rounded-xl px-3 py-2 font-extrabold border border-white/10 bg-white/10 hover:bg-white/15 text-white"
          >
            Хаах
          </button>
        </div>

        {/* body scroll */}
        <div className="max-h-[calc(92dvh-70px)] sm:max-h-[calc(86dvh-70px)] overflow-y-auto overscroll-contain p-4">
          {/* ✅ input + button — жижиг дэлгэц дээр заавал босоо */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Утасны дугаар"
              inputMode="tel"
              className="w-full sm:flex-1 min-w-0 rounded-xl px-4 py-3 bg-white/5 border border-white/15 outline-none"
            />
            <button
              onClick={() => onSearch(phone)}
              disabled={loading || !phone.trim()}
              className="w-full sm:w-auto rounded-xl px-5 py-3 font-extrabold bg-emerald-500 text-black hover:bg-emerald-400 transition disabled:opacity-60"
            >
              {loading ? "..." : "Хайх"}
            </button>
          </div>

          {/* ✅ error */}
          {error ? <div className="mt-3 text-sm text-red-400">{error}</div> : null}

          {/* ✅ loading */}
          {loading && !data ? (
            <div className="mt-4 text-sm text-white/70">Уншиж байна...</div>
          ) : null}

          {/* ✅ result */}
          {data ? (
            <div className="mt-4 space-y-4">
              <div className="text-sm text-white/80">
                Утас: <b className="text-white">{data.phone}</b> · Гүйлгээ:{" "}
                <b className="text-white">{data.purchases}</b> · Код:{" "}
                <b className="text-white">{data.codes}</b>
              </div>

              {data.groups?.length ? (
                data.groups.map((g, idx) => (
                  <div
                    key={`${g.raffleId}-${idx}`}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-extrabold text-white/95 truncate">
                          {g.raffleTitle || "Сугалаа"}
                        </div>
                        <div className="mt-1 text-xs text-white/60">
                          Огноо: <b className="text-white/80">{fmt(g.purchasedAt)}</b>
                        </div>
                      </div>

                      <div className="shrink-0 text-emerald-300 font-extrabold">
                        {new Intl.NumberFormat("mn-MN").format(g.amount)}₮
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-white/60">
                      Кодны тоо: <b className="text-white/85">{g.codes?.length ?? 0}</b>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {(g.codes || []).map((c) => (
                        <span
                          key={c}
                          className="px-3 py-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 font-bold text-sm"
                        >
                          {codeLabel(c)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-white/70">Код олдсонгүй.</div>
              )}
            </div>
          ) : null}

          <div className="h-24" />
        </div>
      </div>
    </div>
  );
}
