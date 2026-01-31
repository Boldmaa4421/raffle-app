"use client";

import { useEffect, useState } from "react";

export default function WinnerBox({ raffleId }: { raffleId: string }) {
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState<any>(null);

  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [facebookLiveUrl, setFacebookLiveUrl] = useState("");
  const [msg, setMsg] = useState<string>("");

  async function load() {
    const res = await fetch(`/api/admin/raffles/${raffleId}/winner`, { cache: "no-store" });
    const data = await res.json();
    if (data?.winner) {
      setExisting(data.winner);
      setCode(data.winner?.ticket?.code ?? "");
      setDisplayName(data.winner?.displayName ?? "");
      setBio(data.winner?.bio ?? "");
      setImageUrl(data.winner?.imageUrl ?? "");
      setFacebookLiveUrl(data.winner?.facebookLiveUrl ?? "");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raffleId]);

  async function save(publish: boolean) {
    try {
      setLoading(true);
      setMsg("");

      const res = await fetch(`/api/admin/raffles/${raffleId}/winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, displayName, bio, imageUrl, facebookLiveUrl, publish }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Алдаа гарлаа");

      setMsg(publish ? "✅ Ялагч нийтлэгдлээ" : "✅ Draft хадгалагдлаа");
      await load();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Алдаа"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, background: "white", marginTop: 14 }}>
      <h3 style={{ margin: 0 }}>🏆 Азтан (Winner)</h3>

      {existing?.publishedAt ? (
        <div style={{ marginTop: 8, opacity: 0.85 }}>
          Нийтэлсэн: <b>{new Date(existing.publishedAt).toLocaleString()}</b>
        </div>
      ) : (
        <div style={{ marginTop: 8, opacity: 0.7 }}>Одоогоор нийтлээгүй (Draft байж болно)</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        <div>
          <label style={lbl}>Ялсан код</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} style={inp} placeholder="ABCD-000001" />
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            Код оруулаад хадгалахад тухайн ticket-тэй холбоно.
          </div>
        </div>

        <div>
          <label style={lbl}>Азтаны нэр (optional)</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inp} placeholder="Нэр / гарчиг" />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={lbl}>Танилцуулга (optional)</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} style={{ ...inp, minHeight: 80 }} placeholder="Азтан шалгарсан тухай тайлбар..." />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={lbl}>Зураг URL (optional)</label>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={inp} placeholder="https://i.imgur.com/xxxxx.jpg" />
          {imageUrl ? (
            <img src={imageUrl} alt="winner" style={{ marginTop: 8, maxWidth: 320, borderRadius: 10, border: "1px solid #eee" }} />
          ) : null}
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={lbl}>Facebook live линк (optional)</label>
          <input value={facebookLiveUrl} onChange={(e) => setFacebookLiveUrl(e.target.value)} style={inp} placeholder="https://facebook.com/...." />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <button disabled={loading} onClick={() => save(false)} style={btnLight}>
          💾 Draft хадгалах
        </button>
        <button disabled={loading} onClick={() => save(true)} style={btnDark}>
          ✅ Publish (Нийтлэх)
        </button>
        <div style={{ alignSelf: "center", opacity: 0.8 }}>{loading ? "..." : msg}</div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 12, opacity: 0.75, display: "block", marginBottom: 6 };
const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" };
const btnLight: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "white", fontWeight: 800 };
const btnDark: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "white", fontWeight: 900 };
