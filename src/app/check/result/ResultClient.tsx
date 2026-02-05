"use client";

import { useEffect, useState } from "react";

export default function ResultClient({
  phone,
  raffleId,
}: {
  phone: string;
  raffleId?: string;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!phone) {
        setError("Утасны дугаар алга байна.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setData(null);

      try {
        const res = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, raffleId: raffleId || null }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Хайлт амжилтгүй");

        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Алдаа");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [phone, raffleId]);

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <a
            href="/check"
            className="rounded-xl px-3 py-2 font-extrabold border border-white/10 bg-white/5 hover:bg-white/10"
          >
            Буцах
          </a>
          <div className="text-xs text-white/60">Үр дүн</div>
          <div className="w-[72px]" />
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/60">Утас:</div>
          <div className="text-xl font-extrabold">{phone}</div>

          <div className="mt-4">
            {loading && <div className="text-white/70">Уншиж байна…</div>}
            {error && <div className="text-red-400">{error}</div>}

            {!loading && !error && (
              <pre className="text-xs whitespace-pre-wrap break-words text-white/80">
                {JSON.stringify(data, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
