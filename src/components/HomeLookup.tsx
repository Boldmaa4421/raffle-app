"use client";

import { useMemo, useState } from "react";

type LookupPurchase = {
  id: string;
  createdAt: string;
  qty: number;
  amount: number;
  raffle: { id: string; title: string | null };
  codes: string[];
};

type LookupResponse = {
  ok: boolean;
  phoneE164: string;
  totalPurchases: number;
  totalCodes: number;
  purchases: LookupPurchase[];
  message?: string;
};

function displayCode(code: string) {
  // CML0-000007 -> 7
  const m = code.match(/(\d+)\s*$/);
  if (!m) return code;
  return String(parseInt(m[1], 10));
}

export default function HomeLookup() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<LookupResponse | null>(null);

  const canSearch = useMemo(() => phone.trim().length >= 6, [phone]);

  async function onSearch() {
    if (!canSearch || loading) return;
    setLoading(true);
    setErr(null);
    setData(null);

    try {
      const res = await fetch(`/api/public/lookup?phone=${encodeURIComponent(phone.trim())}`);
      const json = (await res.json()) as LookupResponse;

      if (!res.ok || !json?.ok) {
        setErr(json?.message || "Алдаа гарлаа. Дахин оролдоно уу.");
        setOpen(true);
        return;
      }

      setData(json);
      setOpen(true);
    } catch (e) {
      setErr("Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex gap-3">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Утасны дугаар"
          className="flex-1 px-4 py-3 rounded-xl
            bg-white/10 border border-white/10
            text-white placeholder-white/50
            focus:outline-none focus:ring-2 focus:ring-amber-400/60"
        />

        <button
          disabled={!canSearch || loading}
          onClick={onSearch}
          className="px-6 py-3 rounded-xl font-extrabold
            bg-amber-300 hover:bg-amber-200 text-black transition
            shadow-lg shadow-amber-300/20
            disabled:opacity-50 disabled:cursor-wait"
        >
          {loading ? "..." : "Хайх"}
        </button>
      </div>

      {/* Popup */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[80vh] overflow-auto
              rounded-2xl border border-white/10 bg-black/55
              backdrop-blur-xl shadow-2xl p-4 text-white"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-extrabold text-lg">Үр дүн</div>
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold"
              >
                Хаах
              </button>
            </div>

            {err && (
              <div className="mt-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-white">
                {err}
              </div>
            )}

            {data?.ok && (
              <div className="mt-4">
                <div className="text-white/80">
                  Утас: <span className="font-bold text-white">{data.phoneE164}</span>
                  {"  "}• Худалдан авалт:{" "}
                  <span className="font-bold text-white">{data.totalPurchases}</span>
                  {"  "}• Код:{" "}
                  <span className="font-bold text-amber-300">{data.totalCodes}</span>
                </div>

                <div className="mt-4 grid gap-3">
                  {data.purchases?.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex justify-between gap-3 flex-wrap">
                        <div className="font-extrabold">
                          {p.raffle.title ?? "Сугалаа"}{" "}
                          <span className="text-white/60 font-semibold">
                            ({new Date(p.createdAt).toLocaleString("mn-MN")})
                          </span>
                        </div>

                        <div className="font-extrabold text-amber-300">
                          {new Intl.NumberFormat("mn-MN").format(p.amount)}₮
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {p.codes.map((c) => (
                          <span
                            key={c}
                            title={c}
                            className="font-mono font-extrabold text-sm
                              px-3 py-1 rounded-full
                              border border-amber-400/20 bg-amber-950/25"
                          >
                            {displayCode(c)}
                          </span>
                        ))}
                        {p.codes.length === 0 && (
                          <span className="text-white/70">Код олдсонгүй</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {data.totalCodes === 0 && (
                  <div className="mt-4 text-white/70">
                    Энэ дугаарт бүртгэл олдсонгүй. Дугаараа зөв оруулсан эсэхээ шалгаарай.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
