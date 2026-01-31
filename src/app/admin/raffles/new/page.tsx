"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewRafflePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [ticketPrice, setTicketPrice] = useState<string>("5000");
  const [totalTickets, setTotalTickets] = useState<string>("");
  const [payBankLabel, setPayBankLabel] = useState<string>("");
  const [payAccount, setPayAccount] = useState<string>("");
  const [fbUrl, setFbUrl] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");

  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const priceNum = Number(ticketPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      alert("Нэгж үнэ заавал зөв тоо байх ёстой.");
      return;
    }

    if (!imageUrl.trim()) {
      alert("Зураг (imageUrl) оруулна уу. (Одоохондоо URL байдлаар)");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/admin/raffles", {
      method: "POST",
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
      alert(err?.message ?? "Алдаа гарлаа");
      return;
    }

    const data = await res.json();
    // ✅ үүссэний дараа detail руу оруулъя (эсвэл list рүү буцааж болно)
    router.push("/admin/raffles");
router.refresh();

  }

  return (
    <div style={{ padding: 24, maxWidth: 820, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>Шинэ сугалаа нэмэх</h1>
        <button
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

        <Field label="Нийт эрх (сонголтоор)">
          <input value={totalTickets} onChange={(e) => setTotalTickets(e.target.value)} style={input} inputMode="numeric" placeholder="2300" />
        </Field>

        <Field label="Дансны label (сонголтоор)">
          <input value={payBankLabel} onChange={(e) => setPayBankLabel(e.target.value)} style={input} placeholder="MN12000500" />
        </Field>

        <Field label="Дансны дугаар (сонголтоор)">
          <input value={payAccount} onChange={(e) => setPayAccount(e.target.value)} style={input} placeholder="5312776314" />
        </Field>

        <Field label="Facebook / дэлгэрэнгүй линк (сонголтоор)">
          <input value={fbUrl} onChange={(e) => setFbUrl(e.target.value)} style={input} placeholder="https://facebook.com/..." />
        </Field>

        <Field label="Зураг (URL) *">
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={input} placeholder="https://..." />
          {imageUrl.trim() ? (
            <div style={{ marginTop: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl.trim()} alt="preview" style={{ width: "100%", maxWidth: 480, borderRadius: 12, border: "1px solid #eee" }} />
            </div>
          ) : null}
        </Field>

        <button disabled={saving} style={btn}>
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
};
