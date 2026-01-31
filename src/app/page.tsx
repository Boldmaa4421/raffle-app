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

  return (
    <main className="relative min-h-screen text-white overflow-hidden bg-black">
      {/* BG IMAGE */}
      {/* BG IMAGE – center focus */}
<div
  className="
    absolute inset-0
    bg-cover bg-[center_35%]
    scale-105
    brightness-[0.88]
    contrast-[1.08]
    saturate-[1.02]
  "
  style={{ backgroundImage: "url('/coverSugalaaWeb.jpg')" }}
/>

{/* dark overlay – зөөлөн */}
<div className="absolute inset-0 bg-black/45" />

{/* warm cinematic tint */}
<div className="absolute inset-0 bg-amber-950/10" />

{/* bottom readability */}
<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />


      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 lg:py-12">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 grid place-items-center rounded-xl border border-white/10 bg-white/5 backdrop-blur font-extrabold">
              HC
            </div>
            <div className="font-extrabold tracking-tight"> Хурдан морь сугалаат худалдаа</div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-4 py-2 text-sm font-bold text-white/85">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Шууд шалгах — 24/7
          </div>
        </div>

        {/* HERO */}
        <div className="mt-10 grid lg:grid-cols-2 gap-10 items-start">
          {/* left */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
              Утасны дугаараар <br />
              <span className="text-amber-300 drop-shadow-[0_10px_30px_rgba(251,191,36,0.22)]">
                код шалгах
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-white/80 leading-relaxed">
              Та өөрийн дугаараа оруулаад авсан сугалааны кодуудаа шууд шалгаарай. Ил тод,
              найдвартай систем.
            </p>

            <div className="mt-7 flex gap-3 flex-wrap">
              <Badge>Нээлттэй</Badge>
              <Badge>Аюулгүй</Badge>
              <Badge>Шууд</Badge>
            </div>
          </div>

          {/* right */}
          <div
            id="lookup"
            className="rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl shadow-2xl p-6"
          >
            <div className="text-amber-200/90 font-extrabold">Код шалгах</div>
            <div className="mt-2 text-sm text-white/75">Утасны дугаараа оруулна уу</div>

            <div className="mt-4">
              <HomeLookup />
            </div>

            <div className="mt-3 text-xs text-white/60">
              Жишээ: <b>99112233</b> эсвэл <b>+97699112233</b>
            </div>
          </div>
        </div>

        {/* INFO BOXES */}
        <div className="mt-8 grid lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-5">
            <div className="text-lg font-extrabold text-amber-200">Сугалааны мэдээлэл</div>
            <ul className="mt-3 space-y-2 text-white/80">
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

          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-5">
            <div className="text-lg font-extrabold text-amber-200">Сугалаа буцааж болох уу?</div>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
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
        <div className="mt-10">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-extrabold">
              🚗 Одоогоор манайд идэвхтэй сугалаанууд
            </h2>
            <div className="text-sm text-white/70">
              САНАМЖ: код шалгах хэсэгт гүйлгээний утга дээр бичсэн утасны дугаараа оруулна.
            </div>
          </div>

          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {raffles.map((r) => {
           const total = typeof r.totalTickets === "number" ? Math.max(1, r.totalTickets) : null;
const sold = r._count.tickets;

const remaining = total !== null ? Math.max(0, total - sold) : null;
const remainingPct =
  total !== null && remaining !== null
    ? Math.max(0, Math.min(100, Math.round((remaining / total) * 100)))
    : null;



              return (
                <div
                  key={r.id}
                  className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden shadow-xl"
                >
                  {/* image */}
                  <div className="h-44 bg-black/40">
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
                   <div className="text-center font-extrabold text-lg leading-snug">
  {r.title ?? "Сугалаа"}
</div>


                    <div className="mt-3 flex items-center justify-between gap-3">
                     <div className="text-white/70 text-sm">Нэг сугалаа</div>
                      <div className="font-extrabold text-amber-300">
                        {formatMNT(r.ticketPrice)}
                      </div>
                    </div>

                   
{remainingPct !== null && total !== null && remaining !== null && (
  <div className="mt-3">
    <div className="flex items-center justify-between text-xs text-white/70">
      <div>
        Эрх үлдлээ:{" "}
        <span className="text-white font-bold">
          {remaining} / {total}
        </span>
      </div>
      <div className="font-extrabold text-amber-300">{remainingPct}%</div>
    </div>

    <div className="mt-2 h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-2.5 rounded-full bg-amber-400/70"
        style={{ width: `${remainingPct}%` }}
      />
    </div>
  </div>
)}




                   <div className="mt-4 flex gap-2">
  {r.payAccount ? (
    <CopyAccountButton
      text={r.payAccount}
      className="flex-1 text-center rounded-xl px-3 py-2 font-extrabold
        bg-amber-300 text-black hover:bg-amber-200 transition"
    />
  ) : (
    <button
      disabled
      className="flex-1 text-center rounded-xl px-3 py-2 font-extrabold
        bg-white/10 border border-white/10 text-white/60 cursor-not-allowed"
    >
      Данс байхгүй
    </button>
  )}

  {r.fbUrl ? (
    <a
      href={r.fbUrl}
      target="_blank"
      rel="noreferrer"
      className="flex-1 text-center rounded-xl px-3 py-2 font-extrabold
        border border-white/10 bg-white/5 hover:bg-white/10 transition"
    >
      Дэлгэрэнгүй
    </a>
  ) : (
    <button
      disabled
      className="flex-1 text-center rounded-xl px-3 py-2 font-extrabold
        border border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
    >
      Дэлгэрэнгүй
    </button>
  )}
</div>


                    {(r.payBankLabel || r.payAccount) && (
                      <div className="mt-3 text-xs text-white/60 space-y-1">
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

        <div className="mt-12 border-t border-white/10 pt-6">
  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/60">
    <div>
      © {new Date().getFullYear()} Хурдан морь сугалаат худалдаа. Бүх эрх хуулиар хамгаалагдсан.
    </div>

    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur">
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
    <span className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold
      border border-white/10 bg-white/5 backdrop-blur">
      {children}
    </span>
  );
}
