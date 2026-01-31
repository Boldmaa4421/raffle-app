"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";

type Row = { purchasedAt?: any; amount?: any; phone?: any };

type SkippedRow = {
  row: number;
  reason: string;
  raw?: any;
};

type ImportResult = {
  ok?: boolean;
  insertedPurchases?: number;
  insertedTickets?: number;
  skippedLowAmount?: number;
  skipped?: SkippedRow[];
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
  };

  async function readExcelRows(file: File): Promise<Row[]> {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return [];

    const raw = XLSX.utils.sheet_to_json<any[]>(ws, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    const rows: Row[] = [];

    for (let i = 0; i < raw.length; i++) {
      const r = raw[i];
      if (!r || r.length < 3) continue;

      const purchasedAt = r[0];
      const amount = r[1];
      const phone = r[2];

      if (
        String(purchasedAt).trim() === "" &&
        String(amount).trim() === "" &&
        String(phone).trim() === ""
      ) {
        continue;
      }

      rows.push({ purchasedAt, amount, phone });
    }

    return rows;
  }

  function downloadSkippedCSV(skipped: SkippedRow[]) {
    const escape = (v: any) => {
      const s = String(v ?? "");
      const q = s.replace(/"/g, '""');
      return `"${q}"`;
    };

    const header = ["excelRow", "reason", "purchasedAt", "amount", "phoneRaw"].join(",");
    const lines = skipped.map((s) => {
      const r = s.raw ?? {};
      const purchasedAt = r.purchasedAt ?? "";
      const amount = r.amount ?? "";
      const phoneRaw = r.phone ?? r.phoneRaw ?? "";
      return [s.row, s.reason, purchasedAt, amount, phoneRaw].map(escape).join(",");
    });

    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `import_skipped_${raffleId ?? "raffle"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const doImport = async () => {
    if (!raffleId) return alert("raffleId алга байна");
    const file = inputRef.current?.files?.[0];
    if (!file) return alert("Excel файл сонгоно уу");

    setImporting(true);
    setResult(null);

    try {
      const rows = await readExcelRows(file);
      if (!rows.length) {
        alert("Excel дотор мөр олдсонгүй. (Header шаардлагагүй, A/B/C багана байхад болно.)");
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
      if (!res.ok) {
        alert(dataText || "Import failed");
        return;
      }

      const data = JSON.parse(dataText) as ImportResult;
      setResult(data);

      const skippedCount = data.skipped?.length ?? 0;

      alert(
        `Import OK.\ncreatedPurchases=${data.insertedPurchases ?? 0}\ncreatedTickets=${data.insertedTickets ?? 0}\nskippedLowAmount=${data.skippedLowAmount ?? 0}\nnotImportedRows=${skippedCount}`
      );
    } catch (e: any) {
      alert(e?.message ?? "Import error");
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
      setFileName("");
    }
  };

  const skipped = result?.skipped ?? [];

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>Import purchase</h1>
        <button
          type="button"
          onClick={() => router.back()}
          style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 800 }}
        >
          ← Буцах
        </button>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 800 }}>
          raffleId: <span style={{ fontFamily: "monospace" }}>{raffleId ?? "(алга)"}</span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={pickFile} style={btnLight}>
            Файл сонгох
          </button>
          <div style={{ opacity: 0.85 }}>{fileName ? `📄 ${fileName}` : "Файл сонгоогүй"}</div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: "none" }}
          onChange={onFileChange}
        />

        <button type="button" onClick={doImport} disabled={importing} style={btnDark}>
          {importing ? "Import хийж байна..." : "Import хийх"}
        </button>

        <div style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.4 }}>
          * Танай Excel header-гүй тул A=Огноо, B=Дүн, C=Утас/текст гэж уншина.
        </div>
      </div>

      {result ? (
        <div style={{ marginTop: 18, border: "1px solid #eee", borderRadius: 12, padding: 12, background: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Import үр дүн</div>
            {skipped.length ? (
              <button type="button" style={btnWarn} onClick={() => downloadSkippedCSV(skipped)}>
                ⬇ Ороогүй мөрүүд CSV
              </button>
            ) : null}
          </div>

          <div style={{ marginTop: 8, lineHeight: 1.7 }}>
            createdPurchases: <b>{result.insertedPurchases ?? 0}</b> <br />
            createdTickets: <b>{result.insertedTickets ?? 0}</b> <br />
            skippedLowAmount: <b>{result.skippedLowAmount ?? 0}</b> <br />
            notImportedRows: <b>{skipped.length}</b>
          </div>

          <div style={{ marginTop: 14, fontWeight: 900 }}>Ороогүй мөрүүд</div>

          {skipped.length === 0 ? (
            <div style={{ marginTop: 6, opacity: 0.7 }}>Ороогүй мөр алга.</div>
          ) : (
            <div style={{ marginTop: 8, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={th}>Excel мөр</th>
                    <th style={th}>Шалтгаан</th>
                    <th style={th}>Огноо</th>
                    <th style={th}>Дүн</th>
                    <th style={th}>Утас/текст</th>
                  </tr>
                </thead>
                <tbody>
                  {skipped.slice(0, 500).map((s, idx) => {
                    const r = s.raw ?? {};
                    const purchasedAt = r.purchasedAt ?? "";
                    const amount = r.amount ?? "";
                    const phoneRaw = r.phone ?? r.phoneRaw ?? "";

                    return (
                      <tr key={idx}>
                        <td style={td}>{s.row}</td>
                        <td style={td}>{s.reason}</td>
                        <td style={td}>{String(purchasedAt)}</td>
                        <td style={td}>{String(amount)}</td>
                        <td style={td}>{String(phoneRaw).slice(0, 80)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
                * Их олон алгасалттай үед эхний 500 мөрийг л дэлгэцэнд харуулна (CSV дээр бүгд гарна).
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

const btnLight: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const btnDark: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const btnWarn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #f4c400",
  background: "#f4c400",
  color: "#111",
  fontWeight: 900,
  cursor: "pointer",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
  fontWeight: 900,
};

const td: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid #f3f3f3",
  verticalAlign: "top",
};
