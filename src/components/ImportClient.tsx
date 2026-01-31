"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { useSearchParams } from "next/navigation";

type RawRow = Record<string, any>;

export default function ImportClient() {
  const sp = useSearchParams();
  const raffleId = sp.get("raffleId") || "";

  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setResult(null);

    const f = e.target.files?.[0];
    if (!f) return;

    setFileName(f.name);

    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    const arr = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
    const cleaned = arr.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));

    const json = cleaned.map((r) => ({
      purchasedAt: r[0],
      amount: r[1],
      phone: r[2],
    }));

    setRawRows(json);
  }

  async function onImport() {
    setError("");
    setResult(null);
    setLoading(true);

    try {
      if (!raffleId) throw new Error("raffleId алга байна. URL дээр ?raffleId=... гэж өгнө үү.");
      if (!rawRows.length) throw new Error("Excel мөр олдсонгүй");

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raffleId,
          sourceFile: fileName,
          rows: rawRows,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error || "Import failed");

      setResult(data);

      if (data?.skipped?.length) {
        const rows = data.skipped
          .map((s: any) => s.row)
          .slice(0, 10)
          .join(", ");
        alert(
          `⚠️ Import дууслаа.\n\n` +
            `DB-руу ороогүй мөр: ${data.skipped.length}.\n` +
            `Жишээ мөрүүд: ${rows}${data.skipped.length > 10 ? "..." : ""}\n\n` +
            `Доор дэлгэрэнгүй жагсаалт харагдана.`
        );
      }
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Import Excel</h1>

      <p style={{ opacity: 0.8 }}>
        RaffleId: <b>{raffleId || "(URL дээр raffleId өгнө)"}</b>
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
        <input type="file" accept=".xlsx,.xls" onChange={onFile} />
        {fileName ? <span style={{ opacity: 0.7 }}>{fileName}</span> : null}
      </div>

      {rawRows.length > 0 && (
        <>
          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={onImport}
              disabled={loading}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #ddd",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Import хийж байна..." : "Import"}
            </button>

            <span style={{ opacity: 0.8 }}>
              Rows: <b>{rawRows.length}</b>
            </span>
          </div>

          <h3 style={{ marginTop: 16 }}>Raw sample (эхний 20 мөр)</h3>
          <pre
            style={{
              marginTop: 8,
              background: "#0b1020",
              color: "white",
              padding: 12,
              borderRadius: 10,
              overflow: "auto",
              maxHeight: 320,
            }}
          >
            {JSON.stringify(rawRows.slice(0, 20), null, 2)}
          </pre>
        </>
      )}

      {error && <p style={{ marginTop: 12, color: "crimson" }}>{error}</p>}

      {result && (
        <>
          <h3 style={{ marginTop: 16 }}>Import result</h3>
          <pre
            style={{
              marginTop: 8,
              background: "#0b1020",
              color: "white",
              padding: 12,
              borderRadius: 10,
              overflow: "auto",
              maxHeight: 320,
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </>
      )}

      {result?.skipped?.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ color: "crimson" }}>DB-руу ороогүй мөрүүд ({result.skipped.length})</h3>

          <div style={{ overflow: "auto", border: "1px solid #eee", borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fff5f5" }}>
                  <th style={th}>Row</th>
                  <th style={th}>Шалтгаан</th>
                  <th style={th}>Огноо</th>
                  <th style={th}>Дүн</th>
                  <th style={th}>Утас</th>
                </tr>
              </thead>
              <tbody>
                {result.skipped.map((s: any, i: number) => (
                  <tr key={i}>
                    <td style={td}>{s.row}</td>
                    <td style={{ ...td, color: "crimson" }}>{s.reason}</td>
                    <td style={td}>{String(s.raw?.purchasedAt ?? "")}</td>
                    <td style={td}>{String(s.raw?.amount ?? "")}</td>
                    <td style={td}>{String(s.raw?.phone ?? "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 10,
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: 10,
  borderBottom: "1px solid #f3f3f3",
  verticalAlign: "top",
};
