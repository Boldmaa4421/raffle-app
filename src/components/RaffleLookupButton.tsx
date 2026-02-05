"use client";

import { useRouter } from "next/navigation";
import React from "react";

type Props = {
  raffleId: string;
  raffleTitle?: string | null;
};

export default function RaffleLookupButton({ raffleId }: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/check?raffleId=${encodeURIComponent(raffleId)}`)}
      className="w-full text-center rounded-xl px-3 py-2 font-extrabold
        border border-white/10 bg-white/5 hover:bg-white/10 transition"
    >
      Код шалгах
    </button>
  );
}
