"use client";

import React from "react";

type Props = {
  raffleId: string;
  raffleTitle?: string | null;
  imageUrl?: string | null;
};

export default function RaffleLookupButton({ raffleId, raffleTitle, imageUrl }: Props) {
  const qs = new URLSearchParams();
  qs.set("raffleId", raffleId);
  if (raffleTitle) qs.set("title", raffleTitle);
  if (imageUrl) qs.set("img", imageUrl);

  return (
    <a
      href={`/check?${qs.toString()}`}
      className="w-full text-center rounded-xl px-3 py-2 font-extrabold
        border border-white/10 bg-white/5 hover:bg-white/10 transition block"
    >
      Код шалгах
    </a>
  );
}
