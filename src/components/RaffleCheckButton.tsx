"use client";

import { useMemo, useState } from "react";

function formatMNT(n: number) {
  return new Intl.NumberFormat("mn-MN").format(n) + "₮";
}

function cleanPhone(raw: string) {
  return String(raw ?? "").replace(/\s+/g, "").trim();
}

function prettyCode(code: string) {
  // ж: ABCD-000123 -> 123
  return code.replace(/^[A-Z0-9]+-0*/i, "");
}

type ApiGroup = {
  raffleId: string;
  raffleTitle: string;
  purchasedAt: string | Date;
  amount: number;
  codes: string[];
};

type ApiResp = {
  ok: boolean;
  phone: string;
  raffleId: string | null;
  purchases: number;
  codes: number;
  groups: ApiGroup[];
};

export default function RaffleCheckButton({
  raffleId,
  raffleTitle,
}: {
  raffleId: string;
  raffleTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ApiResp | null>(null);

  const title = useMemo(() => raffleTitle || "Сугалаа", [raffleTitle]);

  async function onSearch() {
    setError("");
    setData(null);

    const p = cleanPhone(phone);
    if (!p) {
      setError("Утасны дугаар оруулна уу");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p, raffleId }),
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(json?.error || "Хайлт амжилтгүй");

      setData(json as ApiResp);
    } catch (e: any) {
      setError(e?.message || "Алдаа");
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setError("");
    setData(null);
    // phone-г арилгахгүй байя (хэрэглэгч олон дахин шалгаж магадгүй)
  }

  return (
    <>
      {/* Ногоон товч */}
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-2 text-center rounded-xl px-3 py-2 font-extrabold
          bg-emerald-500/90 hover:bg-emerald-500 text-black transition"
      >
        Код шалгах
      </button>

      {/* POPUP */}
      {open && (
       <div className="fixed inset-0 z-50">
          {/* overlay */}
         <div
    className="absolute inset-0 bg-black/70"
    onClick={close}
  />

  {/* modal */}
<div className="fixed inset-0 z-[9999]">
  {/* backdrop */}
  <div
    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
    onClick={close}
  />

  {/* modal container */}
  <div className="relative h-full flex items-center justify-center p-4">

    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-2xl overflow-hidden">

      {/* sticky header */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 bg-black/90 backdrop-blur">
        <div>
          <div className="text-sm text-white/70">Сугалааны код шалгах</div>
          <div className="text-lg font-extrabold text-white">{title}</div>
        </div>

        <button
          onClick={close}
          className="shrink-0 rounded-xl px-3 py-2 font-extrabold
            border border-white/20 bg-white/10 hover:bg-white/15 text-white"
        >
          Хаах
        </button>
      </div>

      <div className="p-5 overflow-y-auto flex-1">

        {/* input row */}
        <div className="flex flex-col sm:flex-row gap-2">
        <input
  value={phone}
  onChange={(e) => setPhone(e.target.value)}
  placeholder="Утасны дугаар"
  inputMode="numeric"
  type="tel"
  pattern="[0-9+ ]*"
  autoComplete="tel"
  enterKeyHint="search"
  className="flex-1 rounded-xl px-4 py-3 bg-white/5 border border-white/10 outline-none text-white text-[16px]"
/>


          <button
            onClick={onSearch}
            disabled={loading || !phone.trim()}
            className="rounded-xl px-5 py-3 font-extrabold
              bg-emerald-500 text-black hover:bg-emerald-400
              disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "..." : "Хайх"}
          </button>
        </div>

        <div className="mt-2 text-xs text-white/60">
          Жишээ: <b>99112233</b> эсвэл <b>+97699112233</b>
        </div>

        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

        {/* RESULTS */}
        {data?.ok && (
          <div className="mt-5">
            <div className="text-sm text-white/80">
              Утас: <b className="text-white">{data.phone}</b> · Худалдан авалт:{" "}
              <b className="text-white">{data.purchases}</b> · Код:{" "}
              <b className="text-emerald-300">{data.codes}</b>
            </div>

            <div className="mt-4 space-y-3">
              {data.groups.map((g, idx) => {
                const d = new Date(g.purchasedAt as any);

                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-extrabold text-white">
                        Огноо:{" "}
                        <span className="text-white/85">
                          {d.toLocaleString("mn-MN", { timeZone: "Asia/Ulaanbaatar" })}
                        </span>
                      </div>
                      <div className="font-extrabold text-emerald-300">
                        {formatMNT(g.amount)}
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-white/70">
                      Үүссэн код: <b className="text-white">{g.codes.length}</b>
                    </div>

                    <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">

                      {g.codes.map((c) => (
                        <span
                          key={c}
                          title={c}
                          className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-extrabold text-emerald-200 text-center"

                        >
                          {prettyCode(c)}
                        </span>
                      ))}
                      {g.codes.length === 0 && (
                        <span className="text-white/60 text-sm">Код олдсонгүй</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {data.groups.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/75">
                  Энэ сугалаанд энэ дугаараар худалдан авалт олдсонгүй.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
</div>

        </div>
      )}
    </>
  );
}
