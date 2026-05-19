"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RaffleData = {
  id: string;
  title: string | null;
  ticketPrice: number;
  totalTickets: number | null;
  payBankLabel: string | null;
  payAccount: string | null;
  fbUrl: string | null;
  imageUrl: string | null;
};

export default function EditRaffleClient({ raffle }: { raffle: RaffleData }) {
  const router = useRouter();

  const [title, setTitle] = useState(raffle.title ?? "");
  const [ticketPrice, setTicketPrice] = useState(String(raffle.ticketPrice));
  const [totalTickets, setTotalTickets] = useState(raffle.totalTickets != null ? String(raffle.totalTickets) : "");
  const [payBankLabel, setPayBankLabel] = useState(raffle.payBankLabel ?? "");
  const [payAccount, setPayAccount] = useState(raffle.payAccount ?? "");
  const [fbUrl, setFbUrl] = useState(raffle.fbUrl ?? "");
  const [imageUrl, setImageUrl] = useState(raffle.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function uploadImage(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      alert(data?.error || "Upload алдаа гарлаа");
      return;
    }
    setImageUrl(data.url);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const priceNum = Number(ticketPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError("Нэгж үнэ зөв тоо байх ёстой.");
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/admin/raffles/${raffle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim() || null,
        ticketPrice: priceNum,
        totalTickets: totalTickets.trim() ? Number(totalTickets) : null,
        payBankLabel: payBankLabel.trim() || null,
        payAccount: payAccount.trim() || null,
        fbUrl: fbUrl.trim() || null,
        imageUrl: imageUrl.trim() || null,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err?.message ?? "Хадгалах үед алдаа гарлаа");
      return;
    }

    router.push("/admin/raffles");
    router.refresh();
  }

  return (
    <div style={{ padding: 24, maxWidth: 820, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>Сугалаа засах</h1>
        <button
          type="button"
          onClick={() => router.push("/admin/raffles")}
          style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 800 }}
        >
          ← Буцах
        </button>
      </div>

      <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 12 }}>
        <Field label="Сугалааны нэр">
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={input} placeholder="Ж: Машин сугалаа" />
        </Field>

        <Field label="Нэгж үнэ (₮) *">
          <input value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)} style={input} inputMode="numeric" placeholder="5000" />
        </Field>

        <Field label="Нийт эрх">
          <input value={totalTickets} onChange={(e) => setTotalTickets(e.target.value)} style={input} inputMode="numeric" placeholder="2300" />
        </Field>

        <Field label="Дансны label">
          <input value={payBankLabel} onChange={(e) => setPayBankLabel(e.target.value)} style={input} placeholder="MN12000500" />
        </Field>

        <Field label="Дансны дугаар">
          <input value={payAccount} onChange={(e) => setPayAccount(e.target.value)} style={input} placeholder="5312776314" />
        </Field>

        <Field label="Facebook / дэлгэрэнгүй линк">
          <input value={fbUrl} onChange={(e) => setFbUrl(e.target.value)} style={input} placeholder="https://facebook.com/..." />
        </Field>

        <Field label="Зураг (Cloudinary)">
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await uploadImage(file);
            }}
            style={input}
          />
          {uploading && (
            <div style={{ marginTop: 6, color: "#555", fontWeight: 700 }}>
              Cloudinary-д upload хийж байна...
            </div>
          )}
          {!uploading && imageUrl && (
            <div style={{ marginTop: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="preview"
                referrerPolicy="no-referrer"
                style={{ width: "100%", maxWidth: 480, borderRadius: 12, border: "1px solid #eee" }}
              />
            </div>
          )}
        </Field>

        {error && (
          <div style={{ padding: "10px 14px", background: "#fff1f1", border: "1px solid #fca5a5", borderRadius: 10, color: "#b91c1c", fontWeight: 700 }}>
            {error}
          </div>
        )}

        <button disabled={saving || uploading} style={btn}>
          {saving ? "Хадгалж байна..." : "Хадгалах"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 800 }}>{label}</div>
      {children}
    </label>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
};

const btn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};
