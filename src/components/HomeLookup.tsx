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

  async function onSearch(p?: string) {
    const value = (p ?? phone).trim();
    if (!value) return;

    setLoading(true);
    setError("");
    setData(null);
    setOpen(true);

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: value, raffleId: raffleId || null }),
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

  return (
    <div>
      {/* ✅ Энэ хэсэг нь page дээр байгаа input/button — жижиг дэлгэц дээр бас stack */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Утасны дугаар"
          inputMode="tel"
          className="w-full sm:flex-1 min-w-0 rounded-xl px-4 py-3 bg-white/5 border border-white/10 outline-none"
        />
        <button
          onClick={() => onSearch()}
          disabled={loading || !phone.trim()}
          className="w-full sm:w-auto rounded-xl px-5 py-3 font-extrabold bg-emerald-500/90 hover:bg-emerald-500 text-black disabled:opacity-60"
        >
          {loading ? "..." : "Код шалгах"}
        </button>
      </div>

      <div className="mt-2 text-xs text-white/60">{hint}</div>

      <TicketPopup
        open={open}
        onClose={() => {
          setOpen(false);
          setError("");
          setData(null);
        }}
        phone={phone}
        data={data}
        loading={loading}
        error={error}
        onSearch={(p) => onSearch(p)}
        setPhone={setPhone}
      />
    </div>
  );
}
