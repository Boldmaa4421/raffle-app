"use client";

import { useState } from "react";

type Raffle = { id: string; title: string | null };

type WinnerItem = {
  id: string;
  raffleId: string;
  displayName: string | null;
  phone: string | null;
  bio: string | null;
  imageUrl: string | null;
  facebookLiveUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  raffle: { id: string; title: string | null };
  ticket: { code: string } | null;
};

export default function WinnersClient({
  initialWinners,
  raffles,
}: {
  initialWinners: WinnerItem[];
  raffles: Raffle[];
}) {
  const [winners, setWinners] = useState<WinnerItem[]>(initialWinners);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [editingRaffleId, setEditingRaffleId] = useState<string | null>(null);

  const [raffleId, setRaffleId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [facebookLiveUrl, setFacebookLiveUrl] = useState("");

  function resetForm() {
    setRaffleId("");
    setDisplayName("");
    setPhone("");
    setCode("");
    setBio("");
    setImageUrl("");
    setFacebookLiveUrl("");
    setEditingRaffleId(null);
    setMsg("");
  }

  function startEdit(w: WinnerItem) {
    setRaffleId(w.raffleId);
    setDisplayName(w.displayName ?? "");
    setPhone(w.phone ?? "");
    setCode(w.ticket?.code ?? "");
    setBio(w.bio ?? "");
    setImageUrl(w.imageUrl ?? "");
    setFacebookLiveUrl(w.facebookLiveUrl ?? "");
    setEditingRaffleId(w.raffleId);
    setShowForm(true);
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.success) throw new Error("Upload амжилтгүй");
      setImageUrl(data.url);
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Зураг upload хийхэд алдаа"));
    } finally {
      setUploadLoading(false);
    }
  }

  async function refreshWinners() {
    const res = await fetch("/api/admin/winners", { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setWinners(data.winners);
  }

  async function save(publish: boolean) {
    if (!raffleId) { setMsg("❌ Сугалаа сонгоно уу"); return; }
    if (!code.trim()) { setMsg("❌ Ticket код оруулна уу"); return; }

    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/raffles/${raffleId}/winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), displayName, phone, bio, imageUrl, facebookLiveUrl, publish }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Алдаа");
      setMsg(publish ? "✅ Нийтлэгдлээ" : "✅ Draft хадгалагдлаа");
      await refreshWinners();
      setShowForm(false);
      resetForm();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Алдаа"));
    } finally {
      setLoading(false);
    }
  }

  async function deleteWinner(wRaffleId: string, raffleName: string) {
    if (!confirm(`"${raffleName}" сугалааны азтаны бичлэгийг устгах уу?`)) return;
    try {
      const res = await fetch(`/api/admin/raffles/${wRaffleId}/winner`, { method: "DELETE" });
      if (!res.ok) throw new Error("Устгахад алдаа");
      await refreshWinners();
    } catch (e: any) {
      alert(e?.message || "Алдаа");
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      {/* Add button */}
      <button
        onClick={() => { resetForm(); setShowForm(true); }}
        style={btnDark}
      >
        + Азтан нэмэх
      </button>

      {/* Form */}
      {showForm && (
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 20, background: "white", marginTop: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>🏆 {editingRaffleId ? "Азтан засах" : "Азтан нэмэх"}</h3>
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              style={{ ...btnLight, padding: "6px 12px" }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>Сугалаа *</label>
              <select
                value={raffleId}
                onChange={(e) => setRaffleId(e.target.value)}
                style={inp}
                disabled={!!editingRaffleId}
              >
                <option value="">— Сугалаа сонгох —</option>
                {raffles.map((r) => (
                  <option key={r.id} value={r.id}>{r.title ?? r.id}</option>
                ))}
              </select>
              {editingRaffleId && (
                <div style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>
                  Засах горимд сугалааг солих боломжгүй.
                </div>
              )}
            </div>

            <div>
              <label style={lbl}>Ялсан ticket код *</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={inp}
                placeholder="RAFF-000001"
              />
            </div>

            <div>
              <label style={lbl}>Азтаны нэр</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={inp}
                placeholder="Нэр"
              />
            </div>

            <div>
              <label style={lbl}>Утасны дугаар</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inp}
                placeholder="+97699..."
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>Тайлбар</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ ...inp, minHeight: 72, resize: "vertical" }}
                placeholder="Азтан шалгарсан тухай тайлбар..."
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>Зураг (Cloudinary upload)</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ marginBottom: 8 }} />
              {uploadLoading && (
                <div style={{ fontSize: 12, opacity: 0.65 }}>Upload хийж байна...</div>
              )}
              {imageUrl && (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={imageUrl}
                    alt="preview"
                    style={{ maxWidth: 300, borderRadius: 10, border: "1px solid #eee", display: "block" }}
                  />
                  <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4, wordBreak: "break-all" }}>{imageUrl}</div>
                </div>
              )}
              {!imageUrl && (
                <div style={{ marginTop: 4 }}>
                  <label style={{ ...lbl, marginBottom: 2 }}>эсвэл URL шууд оруулах</label>
                  <input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    style={inp}
                    placeholder="https://..."
                  />
                </div>
              )}
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>Facebook Live URL</label>
              <input
                value={facebookLiveUrl}
                onChange={(e) => setFacebookLiveUrl(e.target.value)}
                style={inp}
                placeholder="https://facebook.com/..."
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
            <button disabled={loading || uploadLoading} onClick={() => save(false)} style={btnLight}>
              💾 Draft хадгалах
            </button>
            <button disabled={loading || uploadLoading} onClick={() => save(true)} style={btnDark}>
              ✅ Нийтлэх
            </button>
            {msg && <span style={{ opacity: 0.85, fontSize: 14 }}>{msg}</span>}
          </div>
        </div>
      )}

      {/* Winners table */}
      <div style={{ marginTop: 24, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: 12, overflow: "hidden", border: "1px solid #eee" }}>
          <thead>
            <tr style={{ background: "#f7f7f7" }}>
              <th style={th}>Сугалаа</th>
              <th style={th}>Азтаны нэр</th>
              <th style={th}>Ticket код</th>
              <th style={th}>Утас</th>
              <th style={th}>Зураг</th>
              <th style={th}>Статус</th>
              <th style={th}>Үйлдэл</th>
            </tr>
          </thead>
          <tbody>
            {winners.map((w, i) => (
              <tr key={w.id} style={{ borderTop: i === 0 ? "none" : "1px solid #f0f0f0" }}>
                <td style={td}>{w.raffle.title ?? w.raffleId}</td>
                <td style={td}>{w.displayName ?? <span style={{ opacity: 0.4 }}>—</span>}</td>
                <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>
                  {w.ticket?.code ?? <span style={{ opacity: 0.4 }}>—</span>}
                </td>
                <td style={td}>{w.phone ?? <span style={{ opacity: 0.4 }}>—</span>}</td>
                <td style={td}>
                  {w.imageUrl ? (
                    <img
                      src={w.imageUrl}
                      alt=""
                      style={{ width: 52, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid #eee" }}
                    />
                  ) : (
                    <span style={{ opacity: 0.4 }}>—</span>
                  )}
                </td>
                <td style={td}>
                  {w.publishedAt ? (
                    <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 13 }}>✅ Нийтлэгдсэн</span>
                  ) : (
                    <span style={{ color: "#999", fontSize: 13 }}>Draft</span>
                  )}
                </td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => startEdit(w)}
                      style={{ ...btnLight, padding: "6px 10px", fontSize: 12 }}
                    >
                      Засах
                    </button>
                    <button
                      onClick={() => deleteWinner(w.raffleId, w.raffle.title ?? w.raffleId)}
                      style={{ ...btnDark, padding: "6px 10px", fontSize: 12, background: "#dc2626", borderColor: "#dc2626" }}
                    >
                      Устгах
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {winners.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...td, textAlign: "center", opacity: 0.45, padding: 32 }}>
                  Одоогоор азтан бүртгэгдээгүй байна.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 12, opacity: 0.7, display: "block", marginBottom: 6 };
const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", boxSizing: "border-box", fontSize: 14 };
const btnLight: React.CSSProperties = { padding: "10px 16px", borderRadius: 10, border: "1px solid #ddd", background: "white", fontWeight: 800, cursor: "pointer", fontSize: 14 };
const btnDark: React.CSSProperties = { padding: "10px 16px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "white", fontWeight: 900, cursor: "pointer", fontSize: 14 };
const th: React.CSSProperties = { padding: "10px 14px", textAlign: "left", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "10px 14px", fontSize: 13, verticalAlign: "middle" };
