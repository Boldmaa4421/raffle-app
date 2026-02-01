export const dynamic = "force-dynamic";

import HomeLookup from "../components/HomeLookup";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CopyAccountButton from "@/components/CopyAccountButton";

function formatMNT(n: number) {
  return new Intl.NumberFormat("mn-MN").format(n) + "₮";
}

export default async function HomePage() {
  const raffles = await prisma.raffle.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      title: true,
      ticketPrice: true,
      imageUrl: true,
      totalTickets: true,
      payBankLabel: true,
      payAccount: true,
      fbUrl: true,
      createdAt: true,
      _count: { select: { tickets: true } },
    },
  });
const sortedRaffles = [...raffles].sort((a, b) => {
  const ta = typeof a.totalTickets === "number" && a.totalTickets > 0 ? a.totalTickets : null;
  const tb = typeof b.totalTickets === "number" && b.totalTickets > 0 ? b.totalTickets : null;

  // total байхгүй бол хамгийн сүүлд
  if (ta === null && tb === null) return 0;
  if (ta === null) return 1;
  if (tb === null) return -1;

  const fa = (a._count.tickets / ta) * 100;
  const fb = (b._count.tickets / tb) * 100;

  // ✅ дүүргэлт багаас нь эхлүүлнэ
  return fa - fb;
});

  return (
    <main className="relative min-h-screen text-white overflow-hidden bg-black">
      {/* BG IMAGE (mobile дээр “холдуулах” + overlay) */}
      <div
        className="
          absolute inset-0
          bg-cover bg-no-repeat
          bg-[position:center_48%] sm:bg-[position:center_42%] lg:bg-[position:center_35%]
          scale-100 sm:scale-105
          brightness-[0.82] contrast-[1.06] saturate-[1.02]
        "
        style={{ backgroundImage: "url('/coverSugalaaWeb.jpg')" }}
      />

      {/* overlays */}
      <div className="absolute inset-0 bg-black/55 sm:bg-black/45" />
      <div className="absolute inset-0 bg-amber-950/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-12">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 grid place-items-center rounded-xl border border-white/10 bg-white/5 backdrop-blur font-extrabold">
              HC
            </div>
            <div className="font-extrabold tracking-tight text-sm sm:text-base">
              Хурдан морь сугалаат худалдаа
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-xs sm:text-sm font-bold text-white/85">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Шууд шалгах — 24/7
          </div>
        </div>

        {/* HERO */}
        <div className="mt-8 sm:mt-10 grid lg:grid-cols-2 gap-7 sm:gap-10 items-start">
          {/* left */}
          <div>
            <h1 className="font-extrabold tracking-tight leading-[1.08] text-[30px] sm:text-5xl lg:text-6xl">
              Утасны дугаараар{" "}
              <br className="hidden sm:block" />
              <span className="text-amber-300 drop-shadow-[0_10px_30px_rgba(251,191,36,0.22)]">
                код шалгах
              </span>
            </h1>

            <p className="mt-4 sm:mt-5 max-w-xl text-white/80 leading-relaxed text-sm sm:text-base">
              Та өөрийн дугаараа оруулаад авсан сугалааны кодуудаа шууд шалгаарай. Ил тод,
              найдвартай систем.
            </p>

            <div className="mt-6 sm:mt-7 flex gap-2 sm:gap-3 flex-wrap">
              <Badge>Нээлттэй</Badge>
              <Badge>Аюулгүй</Badge>
              <Badge>Шууд</Badge>
            </div>
          </div>

          {/* right */}
          <div
            id="lookup"
            className="rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl shadow-2xl p-4 sm:p-6"
          >
            <div className="text-amber-200/90 font-extrabold text-base sm:text-lg">
              Сугалааны код шалгах
            </div>
            <div className="mt-2 text-xs sm:text-sm text-white/75">
              Утасны дугаараа оруулна уу
            </div>

            <div className="mt-4">
              <HomeLookup />
            </div>

            <div className="mt-3 text-[11px] sm:text-xs text-white/60">
              Жишээ: <b>99112233</b> эсвэл <b>+97699112233</b>
            </div>
          </div>
        </div>

        {/* INFO BOXES */}
        <div className="mt-7 sm:mt-8 grid lg:grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-4 sm:p-5">
            <div className="text-base sm:text-lg font-extrabold text-amber-200">
              Сугалааны мэдээлэл
            </div>
            <ul className="mt-3 space-y-2 text-white/80 text-sm sm:text-base">
              <li className="flex gap-2">
                <span className="text-amber-300">✓</span> Таныг азын тэнгэр ивээх болтугай
              </li>
              <li className="flex gap-2">
                <span className="text-amber-300">✓</span> Гүйлгээний утга зөвхөн утасны дугаар бичнэ
              </li>
              <li className="flex gap-2">
                <span className="text-amber-300">✓</span> Сугалаанд оролцох код таны утасны дугаарт SMS-ээр очно
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-4 sm:p-5">
            <div className="text-base sm:text-lg font-extrabold text-amber-200">
              Сугалаа буцааж болох уу?
            </div>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed text-sm sm:text-base">
              <p>
                <b className="text-white">Сугалаа буцааж болох уу?</b> — Боломжгүй. Таны авсан сугалаа
                бүртгэгдсэн тохиолдолд буцаах боломжгүй.
              </p>
              <p>
                <b className="text-white">Сугалаа шилжүүлж болох уу?</b> — Боломжгүй. Сугалаа тухайн
                дугаартай шууд холбогдоно.
              </p>
            </div>
          </div>
        </div>

        {/* RAFFLES LIST */}
        <div className="mt-9 sm:mt-10">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <h2 className="text-lg sm:text-2xl font-extrabold">
              🚗 Одоогоор манайд идэвхтэй сугалаанууд
            </h2>
            <div className="text-xs sm:text-sm text-white/70">
              САНАМЖ: код шалгах хэсэгт гүйлгээний утга дээр бичсэн утасны дугаараа оруулна.
            </div>
          </div>

          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {sortedRaffles.map((r) => {
             const total = typeof r.totalTickets === "number" ? Math.max(1, r.totalTickets) : null;
const sold = r._count.tickets;

const remaining = total !== null ? Math.max(0, total - sold) : null;

// ✅ дүүргэлтийн хувь (sold/total)
const fillPct =
  total !== null ? Math.max(0, Math.min(100, Math.round((sold / total) * 100))) : null;


              return (
                <div
                  key={r.id}
                  className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden shadow-xl"
                >
                  {/* image */}
                  <div className="h-40 sm:h-44 bg-black/40">
                    {r.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.imageUrl}
                        alt={r.title ?? "raffle"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-white/50 text-sm">
                        Зураг байхгүй
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="text-center font-extrabold text-base sm:text-lg leading-snug">
                      {r.title ?? "Сугалаа"}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="text-white/70 text-sm">Нэг сугалаа</div>
                      <div className="font-extrabold text-amber-300">
                        {formatMNT(r.ticketPrice)}
                      </div>
                    </div>

                    {fillPct !== null && total !== null && remaining !== null && (
  <div className="mt-3">
    <div className="flex items-center justify-between text-xs text-white/70">
      <div>
        Эрх үлдлээ:{" "}
        <span className="text-white font-bold">
          {remaining} / {total}
        </span>
      </div>
      <div className="font-extrabold text-amber-300">{fillPct}%</div>
    </div>

    <div className="mt-2 h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-2.5 rounded-full bg-amber-400/70"
        style={{ width: `${fillPct}%` }}
      />
    </div>
  </div>
)}


                    {/* Buttons: mobile дээр 2 мөр болж багтана */}
                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                      {r.payAccount ? (
                        <CopyAccountButton
                          text={r.payAccount}
                          className="w-full sm:flex-1 text-center rounded-xl px-3 py-2 font-extrabold bg-amber-300 text-black hover:bg-amber-200 transition"
                        />
                      ) : (
                        <button
                          disabled
                          className="w-full sm:flex-1 text-center rounded-xl px-3 py-2 font-extrabold bg-white/10 border border-white/10 text-white/60 cursor-not-allowed"
                        >
                          Данс байхгүй
                        </button>
                      )}

                      {r.fbUrl ? (
                        <a
                          href={r.fbUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full sm:flex-1 text-center rounded-xl px-3 py-2 font-extrabold border border-white/10 bg-white/5 hover:bg-white/10 transition"
                        >
                          Дэлгэрэнгүй
                        </a>
                      ) : (
                        <button
                          disabled
                          className="w-full sm:flex-1 text-center rounded-xl px-3 py-2 font-extrabold border border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                        >
                          Дэлгэрэнгүй
                        </button>
                      )}
                    </div>

                    {(r.payBankLabel || r.payAccount) && (
                      <div className="mt-3 text-xs text-white/60 space-y-1 break-words">
                        {r.payBankLabel && <div>Банк: {r.payBankLabel}</div>}
                        {r.payAccount && <div>Данс: {r.payAccount}</div>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {raffles.length === 0 && (
              <div className="text-white/70">Одоогоор сугалаа алга.</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 sm:mt-12 border-t border-white/10 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-white/60">
            <div>
              © {new Date().getFullYear()} Хурдан морь сугалаат худалдаа. Бүх эрх хуулиар хамгаалагдсан.
            </div>

            <div className="text-center sm:text-left flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur">
              <span className="opacity-70">Хүссэн website-аар захиалга хийнэ:</span>
              <span className="font-bold text-white">94682298,88242298</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-xl px-4 py-2 text-xs sm:text-sm font-bold border border-white/10 bg-white/5 backdrop-blur whitespace-nowrap">
      {children}
    </span>
  );
}
