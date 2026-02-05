"use client";

import { useState } from "react";
import TicketPopup from "@/components/TicketPopup";



export default function CheckClient({
  raffleId = "",
  title = "Утасны дугаараар код шалгах",
  img = "/images/Blue and White Modern Message Conversation Facebook Post.png",
}: {
  raffleId?: string;
  title?: string;
  img?: string;
}) 
{
  const [phone, setPhone] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const p = phone.trim();
    if (!p) return;

    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p, raffleId: raffleId || null }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Хайлт амжилтгүй");

      setData(json);
    } catch (err: any) {
      setError(err?.message || "Алдаа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      {/* Header (phone-like) */}
      <div className="relative">
        <div className="h-[44vh] min-h-[260px] max-h-[420px] w-full overflow-hidden bg-black">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" className="h-full w-full object-cover opacity-90" />
          ) : (
            <div className="h-full w-full bg-gradient-to-b from-black/20 to-black" />
          )}
        </div>

        {/* overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black" />

        {/* top bar */}
        <div
          className="absolute left-0 right-0 top-0 px-4 pt-4"
          style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}
        >
          <div className="flex items-center justify-between">
            <a
              href="/"
              className="rounded-xl px-3 py-2 font-extrabold border border-white/10 bg-white/5 hover:bg-white/10"
            >
              Буцах
            </a>

            <div className="text-xs text-white/60">pp.miniihuleg.mn</div>

            <div className="w-[72px]" />
          </div>
        </div>

        {/* title block */}
        <div className="absolute left-0 right-0 bottom-0 px-4 pb-5">
          <div className="max-w-xl">
            <div className="text-sm font-extrabold text-white/80">Сугалааны код шалгах</div>
            <div className="mt-1 text-2xl font-extrabold">{title}</div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-black/55 backdrop-blur-xl shadow-2xl p-4">
              <form onSubmit={onSearch} className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Утасны дугаар"
                    inputMode="tel"
                    className="w-full flex-1 rounded-xl px-4 py-3 bg-white/5 border border-white/10 outline-none text-[16px]"
                  />

                  <button
                    type="submit"
                    disabled={loading || !phone.trim()}
                    className="w-full sm:w-auto rounded-xl px-5 py-3 font-extrabold
                      bg-emerald-500 text-black hover:bg-emerald-400 transition disabled:opacity-60"
                  >
                    {loading ? "..." : "Хайх"}
                  </button>
                </div>

                <div className="text-xs text-white/60">
                  Жишээ: <b>99112233</b> эсвэл <b>+97699112233</b>
                </div>

                {error && <div className="text-sm text-red-400">{error}</div>}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Results section */}
      <div className="px-4 py-5">
        <div className="mx-auto w-full max-w-xl">
          {/* Арынхаас ялгаруулах card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            {!data ? (
              <div className="text-white/60">
                Дугаараа оруулаад <b>Хайх</b> дээр дарна уу.
              </div>
            ) : (
              <TicketPopup open={true} onClose={() => setData(null)} phone={phone.trim()} data={data} />
            )}
          </div>

          <div style={{ height: "max(env(safe-area-inset-bottom), 16px)" }} />
        </div>
      </div>
    </div>
  );
}
