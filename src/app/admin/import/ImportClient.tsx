"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";

type Row = { purchasedAt?: any; amount?: any; phone?: any };

type SkippedPreviewRow = {
  row: number;
  reason: string;
  phoneRaw?: string;
  paid?: number;
  diff?: number;
  ticketPrice?: number;
};

type ImportResult = {
  ok?: boolean;
  error?: string;
  hint?: string;

  insertedPurchases?: number;
  insertedTickets?: number;

  overpaidCount?: number;
  skippedCount?: number;

  skippedPreview?: SkippedPreviewRow[];
};

export default function ImportClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const raffleId = sp.get("raffleId");

  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const pickFile = () => inputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFileName(f?.name ?? "");
    setResult(null);
  };

  async function readExcelRows(file: File): Promise<Row[]> {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });

    const norm = (v: any) =>
      String(v ?? "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();

    const looksLikePhone = (s: string) => {
      const t = s.replace(/[^\d+]/g, "");
      if (!t) return false;
      if (t.startsWith("+") && /\+\d{8,15}/.test(t)) return true;
      if (t.startsWith("976") && /^\d{11,15}$/.test(t)) return true;
      if (/^\d{8}$/.test(t)) return true;
      if (/\d{8}/.test(t)) return true;
      return false;
    };

    const sheetToRaw = (ws: XLSX.WorkSheet) =>
      XLSX.utils.sheet_to_json<any[]>(ws, {
        header: 1,
        defval: "",
        blankrows: false,
      });

    // ✅ Sheet сонгох: "утас мэт" мөр олон sheet-ийг авна
    let bestName = wb.SheetNames[0];
    let bestScore = -1;

    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      if (!ws) continue;

      const raw = sheetToRaw(ws);
      let score = 0;

      for (let i = 0; i < Math.min(raw.length, 200); i++) {
        const row = raw[i] || [];
        for (let j = 0; j < Math.min(row.length, 12); j++) {
          const s = norm(row[j]);
          if (s && looksLikePhone(s)) {
            score++;
            break;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestName = name;
      }
    }

    const ws = wb.Sheets[bestName];
    if (!ws) return [];

    const raw = sheetToRaw(ws);

    const pickAmount = (row: any[]) => {
      const b = norm(row?.[1]);
      const nb = Number(b.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(nb) && nb > 0) return nb;

      for (const cell of row) {
        const s = norm(cell);
        const n = Number(s.replace(/[^\d.-]/g, ""));
        if (Number.isFinite(n) && n > 0) return n;
      }
      return 0;
    };

    const pickDate = (row: any[]) => {
      const a = row?.[0];
      if (typeof a === "number") return a; // excel serial
      const sa = norm(a);
      return sa || "";
    };

    const pickPhoneCell = (row: any[]) => {
      const c = norm(row?.[2]);
      if (c && looksLikePhone(c)) return c;

      for (let i = 0; i < Math.min(row.length, 12); i++) {
        const s = norm(row[i]);
        if (!s) continue;
        if (looksLikePhone(s)) return s;
      }
      return c;
    };

    const rows: Row[] = [];
    for (let i = 0; i < raw.length; i++) {
      const r = raw[i];
      if (!r || r.length === 0) continue;

      const purchasedAt = pickDate(r);
      const amount = pickAmount(r);
      const phone = pickPhoneCell(r);

      if (norm(purchasedAt) === "" && norm(amount) === "" && norm(phone) === "") continue;

      rows.push({ purchasedAt, amount, phone });
    }

    console.log("[IMPORT] pickedSheet=", bestName, "score=", bestScore, "rows=", rows.length);
    return rows;
  }

  const doImport = async () => {
    if (!raffleId) return alert("raffleId алга байна");
    const file = inputRef.current?.files?.[0];
    if (!file) return alert("Excel/CSV файл сонгоно уу");

    setImporting(true);
    setResult(null);

    try {
      const rows = await readExcelRows(file);
      if (!rows.length) {
        alert("Excel дотор мөр олдсонгүй.");
        return;
      }

      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raffleId,
          sourceFile: file.name,
          rows,
        }),
      });

      const dataText = await res.text();
      let data: ImportResult;

      try {
        data = JSON.parse(dataText);
      } catch {
        data = { error: dataText || "Import failed (non-json)" };
      }

      if (!res.ok) {
        setResult(data);
        alert(data.error || "Import failed");
        return;
      }

      setResult(data);

      alert(
        `Import OK.\n` +
          `Purchases=${data.insertedPurchases ?? 0}\n` +
          `Tickets=${data.insertedTickets ?? 0}\n` +
          `Overpaid=${data.overpaidCount ?? 0}\n` +
          `Skipped=${data.skippedCount ?? 0}`
      );

      router.refresh();
    } catch (e: any) {
      setResult({ error: e?.message ?? "Import error" });
      alert(e?.message ?? "Import error");
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const fmt = (n?: number) =>
    typeof n === "number" ? new Intl.NumberFormat("mn-MN").format(n) : "-";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-baseline gap-3 flex-wrap">
        <h1 className="text-2xl font-black">Import purchase</h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="font-extrabold opacity-80 hover:opacity-100"
        >
          ← Буцах
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="font-bold">
          raffleId: <span className="font-mono">{raffleId ?? "(алга)"}</span>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          <button
            type="button"
            onClick={pickFile}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 font-extrabold"
          >
            Файл сонгох
          </button>
          <div className="opacity-80">{fileName ? `📄 ${fileName}` : "Файл сонгоогүй"}</div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={onFileChange}
        />

        <button
          type="button"
          onClick={doImport}
          disabled={importing}
          className="px-4 py-2 rounded-xl bg-black text-white font-black disabled:opacity-60"
        >
          {importing ? "Import хийж байна..." : "Import хийх"}
        </button>

        <div className="text-xs opacity-70 leading-relaxed">
          * A=Огноо, B=Дүн, C=Утас/текст гэж уншина.
        </div>
      </div>

      {result && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="font-black text-lg">Import үр дүн</div>

          {result.error && (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <div className="font-black text-red-200">Алдаа:</div>
              <div className="text-white/90">{result.error}</div>
              {result.hint && <div className="mt-2 text-white/70">Hint: {result.hint}</div>}
            </div>
          )}

          <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
            <div>
              Purchases: <b>{result.insertedPurchases ?? 0}</b>
            </div>
            <div>
              Tickets: <b>{result.insertedTickets ?? 0}</b>
            </div>
            <div>
              Overpaid: <b>{result.overpaidCount ?? 0}</b>
            </div>
            <div>
              Skipped: <b>{result.skippedCount ?? 0}</b>
            </div>
          </div>

          {(result.skippedPreview?.length ?? 0) > 0 && (
            <div className="mt-4">
              <div className="font-black">Ороогүй мөрүүд (эхний 500)</div>

              <div className="mt-2 overflow-auto rounded-xl border border-white/10">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-black/30">
                    <tr className="text-left">
                      <th className="p-2">ExcelRow</th>
                      <th className="p-2">Reason</th>
                      <th className="p-2">Phone/Raw</th>
                      <th className="p-2">Paid</th>
                      <th className="p-2">Diff</th>
                      <th className="p-2">TicketPrice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.skippedPreview!.map((s, idx) => (
                      <tr key={idx} className="border-t border-white/10">
                        <td className="p-2 font-mono">{s.row}</td>
                        <td className="p-2">{s.reason}</td>
                        <td className="p-2 font-mono">{s.phoneRaw ?? ""}</td>
                        <td className="p-2">{fmt(s.paid)}</td>
                        
                          {typeof s.diff === "number" ? (
                            <span
                              className={
                                s.diff >= 0
                                  ? "text-amber-200 font-bold"
                                  : "text-red-200 font-bold"
                              }
                            >
                              {s.diff >= 0 ? `+${fmt(s.diff)}` : `-${fmt(Math.abs(s.diff))}`}
                            </span>
                          ) : (
                            "-"
                          )}
                        
                        <td className="p-2">{fmt(s.ticketPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-2 text-xs opacity-70">
                Diff: <b className="text-amber-200">+</b> илүү, <b className="text-red-200">-</b>{" "}
                дутуу
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
