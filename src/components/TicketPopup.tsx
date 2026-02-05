"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  phone?: string;
  data?: any;
  // Хэрвээ title хэрэгтэй бол гаднаас өг
  title?: string;
  // Хэрвээ raffleId хэрэгтэй бол гаднаас өг (танайд хэрэггүй бол авч болно)
  raffleId?: string;
  // Хайлтын handler-аа гаднаас явуулах бол:
  onSearch?: (phone: string) => Promise<any> | any;
};

function prettyCode(code: string) {
  // танайд өөр байж болно
  return String(code).replace(/^.*-/, "");
}

function formatMNT(n: number) {
  try {
    return new Intl.NumberFormat("mn-MN").format(n) + "₮";
  } catch {
    return `${n}₮`;
  }
}

export default function TicketPopup({
  open,
  onClose,
  phone: initialPhone = "",
  data: initialData = null,
  title = "Сугалааны код шалгах",
  onSearch,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [phone, setPhone] = useState(initialPhone);
  const [data, setData] = useState<any>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Portal mount
  useEffect(() => setMounted(true), []);

  // open болох бүрд body scroll lock (iOS friendly)
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;

    // scrollbar jump багасгах (desktop)
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarW > 0) document.body.style.paddingRight = `${scrollbarW}px`;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  // initial props sync
  useEffect(() => {
    setPhone(initialPhone || "");
  }, [initialPhone]);

  useEffect(() => {
    setData(initialData ?? null);
  }, [initialData]);

  // iPhone дээр keyboard гарахгүй тохиолдолд:
  // - open болсны дараа шууд focus хийхийг оролдож болно
  // - ГЭХДЭЭ iOS зарим үед заавал user tap хэрэгтэй байдаг.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [open]);

  const close = () => {
    setError("");
    setLoading(false);
    onClose();
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const p = phone.trim();

    if (!p) return;

    setLoading(true);
    setError("");

    try {
      if (onSearch) {
        const res = await onSearch(p);
        setData(res);
      } else {
        // fallback: таны одоогийн API /api/check гэж үзье
        const res = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: p }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Хайлт амжилтгүй");
        setData(json);
      }
    } catch (err: any) {
      setError(err?.message || "Алдаа");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const modal = useMemo(() => {
    if (!open) return null;

    return (
      <div
        className="fixed inset-0 z-[1000]"
        aria-modal="true"
        role="dialog"
        // overlay дээр click хийвэл хаах
        onMouseDown={(e) => {
          // backdrop дээр дарсан үед л хаах (card дотор дарвал хаахгүй)
          if (e.target === e.currentTarget) close();
        }}
        onTouchStart={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Center wrapper */}
        <div className="absolute inset-0 flex items-center justify-center p-3">
          {/* Modal card */}
          <div
            className="
              w-full max-w-xl
              rounded-2xl
              border border-white/15
              bg-black/80
              shadow-2xl
              overflow-hidden
            "
            // iOS дээр “click дамжихгүй” байлгах
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
              <div className="min-w-0">
                <div className="text-xs text-white/60">Сугалааны код шалгах</div>
                <div className="text-base font-extrabold text-white truncate">{title}</div>
              </div>

              <button
                type="button"
                onClick={close}
                className="
                  shrink-0
                  rounded-xl px-4 py-2
                  border border-white/15
                  bg-white/5 hover:bg-white/10
                  font-extrabold text-white/85
                "
              >
                Хаах
              </button>
            </div>

            {/* Body: энд scroll ажиллана */}
            <div
              className="p-4 overflow-y-auto"
              style={{
                // iPhone дээр modal дотор scroll хийхэд зөөлөн болгоно
                WebkitOverflowScrolling: "touch",
                // Хэт урт кодтой үед дэлгэцнээс хэтрэхгүй
                maxHeight: "min(70vh, 520px)",
              }}
            >
              <form onSubmit={handleSearch} className="space-y-3">
                {/* input */}
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Утасны дугаар"
                    // ✅ iPhone keyboard зөв гаргах
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    enterKeyHint="search"
                    // ✅ iOS zoom хийхээс сэргийлнэ (font-size >=16)
                    className="
                      flex-1 rounded-xl px-4 py-3
                      bg-white/5 border border-white/10
                      outline-none text-white
                      text-[16px]
                    "
                  />

                  <button
                    type="submit"
                    disabled={loading || !phone.trim()}
                    className="
                      rounded-xl px-5 py-3 font-extrabold
                      bg-emerald-500 text-black
                      hover:bg-emerald-400 transition
                      disabled:opacity-60
                    "
                  >
                    {loading ? "..." : "Хайх"}
                  </button>
                </div>

                <div className="text-xs text-white/60">
                  Жишээ: <b>99112233</b> эсвэл <b>+97699112233</b>
                </div>

                {error && <div className="text-sm text-red-400">{error}</div>}
              </form>

              {/* RESULTS */}
              {data?.ok && (
                <div className="mt-4 space-y-3">
                  <div className="text-sm text-white/80">
                    Утас: <b className="text-white">{data.phone ?? phone.trim()}</b> · Худалдан авалт:{" "}
                    <b className="text-white">{data.purchases ?? "-"}</b> · Код:{" "}
                    <b className="text-emerald-300">{data.codes ?? "-"}</b>
                  </div>

                  <div className="space-y-3">
                    {(data.groups ?? []).map((g: any, idx: number) => {
                      const d = new Date(g.purchasedAt as any);

                      return (
                        <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-extrabold text-white">
                              Огноо:{" "}
                              <span className="text-white/85">
                                {d.toLocaleString("mn-MN", {
                                  timeZone: "Asia/Ulaanbaatar",
                                })}
                              </span>
                            </div>
                            <div className="font-extrabold text-emerald-300">
                              {formatMNT(Number(g.amount || 0))}
                            </div>
                          </div>

                          <div className="mt-2 text-sm text-white/70">
                            Үүссэн код: <b className="text-white">{(g.codes ?? []).length}</b>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {(g.codes ?? []).map((c: string) => (
                              <span
                                key={c}
                                className="
                                  rounded-full border border-emerald-500/25
                                  bg-emerald-500/10
                                  px-3 py-1 text-sm font-extrabold text-emerald-200
                                "
                                title={c}
                              >
                                {prettyCode(c)}
                              </span>
                            ))}

                            {(g.codes ?? []).length === 0 && (
                              <span className="text-white/60 text-sm">Код олдсонгүй</span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {(data.groups ?? []).length === 0 && (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/75">
                        Энэ сугалаанд энэ дугаараар purchase олдсонгүй.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer gap (safe-area) */}
              <div style={{ height: "max(env(safe-area-inset-bottom), 12px)" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }, [open, phone, loading, error, data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
