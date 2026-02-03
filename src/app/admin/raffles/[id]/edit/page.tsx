"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EditRaffleForm({ raffle }: { raffle: any }) {
  const router = useRouter();
  const [form, setForm] = useState(raffle);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function onChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSave() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/admin/raffles/${raffle.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      setError("Хадгалах үед алдаа гарлаа");
      setLoading(false);
      return;
    }

    router.push(`/admin/raffles/${raffle.id}`);
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>Сугалаа засах</h2>

      <input name="title" value={form.title ?? ""} onChange={onChange} placeholder="Нэр" />
      <input name="imageUrl" value={form.imageUrl ?? ""} onChange={onChange} placeholder="Зураг URL" />
      <input name="ticketPrice" type="number" value={form.ticketPrice} onChange={onChange} />
      <input name="totalTickets" type="number" value={form.totalTickets ?? ""} onChange={onChange} />
      <input name="payBankLabel" value={form.payBankLabel ?? ""} onChange={onChange} placeholder="Банк" />
      <input name="payAccount" value={form.payAccount ?? ""} onChange={onChange} placeholder="Данс" />
      <input name="fbUrl" value={form.fbUrl ?? ""} onChange={onChange} placeholder="Facebook link" />

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button onClick={onSave} disabled={loading}>
        {loading ? "Хадгалж байна..." : "Хадгалах"}
      </button>
    </div>
  );
}
