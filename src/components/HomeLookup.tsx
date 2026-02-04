"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import TicketPopup from "./TicketPopup";

export default function HomeLookup() {
  const sp = useSearchParams();
  const raffleId = sp.get("raffleId") || "";

  const [phone, setPhone] = useState("");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hint = useMemo(
    () => (raffleId ? "Энэ сугалааны кодыг шалгана" : "Бүх сугалаанаас хайна"),
    [raffleId]
  );

  async function onSearch() {
    const p = phone.trim();
    if (!p) return;

    setLoading(true);
    setError("");
    setData(null);
    setOpen(true); // ✅ эхлээд popup нээгээд loading харуулна

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p, raffleId: raffleId || null }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Хайлт амжилтгүй");

      setData(json);
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
  }

  return (
    <>
      <div>
        <div className="flex gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
            placeholder="Утасны дугаар"
            inputMode="tel"
            className="flex-1 rounded-xl px-4 py-3 bg-white/5 border border-white/10 outline-none"
          />
          <button
            onClick={onSearch} // ✅ ЭНД гол fix
            disabled={loading || !phone.trim()}
            className="rounded-xl px-5 py-3 font-extrabold bg-emerald-500/90 hover:bg-emerald-500 text-black disabled:opacity-60"
          >
            {loading ? "..." : "Код шалгах"}
          </button>
        </div>

        <div className="mt-2 text-xs text-white/60">{hint}</div>
        {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
      </div>

      <TicketPopup open={open} onClose={closeAll} phone={phone.trim()} data={data} />
    </>
  );
}
