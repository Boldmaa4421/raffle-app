"use client";

import { useState } from "react";

type ApiResponse = {
  phoneE164: string;
  totalTickets: number;
  groups: {
    raffleId: string;
    raffleTitle: string;
    ticketPrice?: number;
    ticketCount: number;
    codes: string[];
  }[];
  error?: string;
};

export default function CheckPage() {
  const [phone, setPhone] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [err, setErr] = useState("");

  async function onCheck() {
    setErr("");
    setLoading(true);
    setData(null);

    try {
      const res = await fetch(`/api/tickets?phone=${encodeURIComponent(phone)}`);
      const json = (await res.json()) as ApiResponse;

      if (!res.ok) {
        setErr(json.error ?? "Алдаа гарлаа");
        setOpen(true);
        return;
      }

      setData(json);
      setOpen(true);
    } catch (e) {
      setErr("Сервертэй холбогдож чадсангүй");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow">
        <h1 className="text-xl font-bold">Сугалааны код шалгах</h1>
        <p className="mt-2 text-sm text-slate-600">
          Монгол дугаар бол 8 оронтой бичиж болно. Гадаад дугаар заавал + улсын кодтой байна.
        </p>

        <input
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring"
          placeholder="Утасны дугаар (ж: 99112233 эсвэл +8210...)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <button
          className="mt-4 w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
          onClick={onCheck}
          disabled={loading || phone.trim().length === 0}
        >
          {loading ? "Шалгаж байна..." : "Шалгах"}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Таны коднууд</h2>
              <button
                className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
                onClick={() => setOpen(false)}
              >
                Хаах
              </button>
            </div>

            {err && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {err}
              </div>
            )}

            {data && (
              <div className="mt-4 space-y-4">
                <div className="text-sm text-slate-600">
                  Утас: <span className="font-medium">{data.phoneE164}</span> • Нийт код:{" "}
                  <span className="font-medium">{data.totalTickets}</span>
                </div>

                {data.groups.length === 0 ? (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    Энэ дугаараар код олдсонгүй.
                  </div>
                ) : (
                  data.groups.map((g) => (
                    <div key={g.raffleId} className="rounded-xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{g.raffleTitle}</div>
                          <div className="text-xs text-slate-600">
                            Кодын тоо: {g.ticketCount}
                            {typeof g.ticketPrice === "number"
                              ? ` • Тасалбар: ${g.ticketPrice}`
                              : ""}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {g.codes.map((c) => (
                          <div
                            key={c}
                            className="rounded-lg bg-slate-100 px-2 py-2 text-center font-mono text-sm"
                          >
                            {c}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
