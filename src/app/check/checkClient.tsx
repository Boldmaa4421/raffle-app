"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CheckClient({
  raffleId = "",
  title = "Утасны дугаараар код шалгах",
  img = "/images/Blue and White Modern Message Conversation Facebook Post.png",
}: {
  raffleId?: string;
  title?: string;
  img?: string;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState("");

  function onSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const p = phone.trim();
    if (!p) return;

    const qs = new URLSearchParams();
    qs.set("phone", p);
    if (raffleId) qs.set("raffleId", raffleId);

    router.push(`/check/result?${qs.toString()}`);
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      {/* ... (header/image чинь хэвээр) ... */}

      <form onSubmit={onSearch} className="flex flex-col gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Утасны дугаар"
          inputMode="tel"
          className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 outline-none text-[16px]"
        />

        <button
          type="submit"
          disabled={!phone.trim()}
          className="rounded-xl px-5 py-3 font-extrabold bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-60"
        >
          Хайх
        </button>
      </form>

      {/* popup хэсгийг бүр мөсөн авна */}
    </div>
  );
}
