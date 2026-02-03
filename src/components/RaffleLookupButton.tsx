"use client";

import { useMemo, useState } from "react";
import TicketPopup from "@/components/TicketPopup";

type Props = {
  raffleId: string;
  raffleTitle?: string | null;
};

export default function RaffleLookupButton({ raffleId, raffleTitle }: Props) {
  const [open, setOpen] = useState(false);

  // popup доторх state
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const title = useMemo(() => raffleTitle ?? "Сугалаа", [raffleTitle]);

  async function onSearch() {
    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ raffleId-г картнаас шууд өгнө => тухайн сугалаа л шалгана
        body: JSON.stringify({ phone, raffleId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Хайлт амжилтгүй");

      setData(json);
      // ✅ үр дүнгээ TicketPopup дээр харуулна
      setOpen(true);
    } catch (e: any) {
      setError(e?.message || "Алдаа");
    } finally {
      setLoading(false);
    }
  }

  function closeAll() {
    setOpen(false);
    setError("");
    setData(null);
    // phone-оо хадгалмаар байвал доорхоос арилга
    // setPhone("");
  }

  return (
    <div className="w-full">
      {/* ✅ карт дээрх товч */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-center rounded-xl px-3 py-2 font-extrabold
          border border-white/10 bg-white/5 hover:bg-white/10 transition"
      >
        Код шалгах
      </button>

      {/* ✅ Popup нээгдсэн үед: эхлээд phone input + хайх товч */}
      {open && (
        <div className="fixed inset-0 z-[60]">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/70"
            onClick={closeAll}
          />

          {/* modal */}
          <div className="absolute left-1/2 top-1/2 w-[94vw] max-w-xl -translate-x-1/2 -translate-y-1/2
            rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl shadow-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-amber-200/90 font-extrabold">
                  {title} · Код шалгах
                </div>
                <div className="mt-1 text-xs text-white/60">
                  Энэ сугалаанд бүртгэлтэй кодуудыг шалгана
                </div>
              </div>

              <button
                onClick={closeAll}
                className="rounded-xl px-3 py-2 font-extrabold border border-white/10 bg-white/5 hover:bg-white/10"
              >
                Хаах
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Утасны дугаар"
                className="flex-1 rounded-xl px-4 py-3 bg-white/5 border border-white/10 outline-none"
              />
              <button
                onClick={onSearch}
                disabled={loading || !phone.trim()}
                className="rounded-xl px-5 py-3 font-extrabold
                  bg-amber-300 text-black hover:bg-amber-200 transition disabled:opacity-60"
              >
                {loading ? "..." : "Хайх"}
              </button>
            </div>

            <div className="mt-2 text-xs text-white/60">
              Жишээ: <b>99112233</b> эсвэл <b>+97699112233</b>
            </div>

            {error && <div className="mt-2 text-sm text-red-400">{error}</div>}

            {/* ✅ хайлтын үр дүн байвал TicketPopup-оор харуулна */}
            {/* TicketPopup чинь open=true үед өөрөө UI гаргадаг бол энэ блок хэрэгтэй */}
            {data && (
              <div className="mt-4">
                <TicketPopup open={true} onClose={() => setData(null)} phone={phone} data={data} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
