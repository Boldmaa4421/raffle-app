import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WinnersPage() {
  const winners = await prisma.winner.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    include: {
      raffle: { select: { title: true } },
      ticket: { select: { code: true } },
    },
  });

  return (
    <main className="relative min-h-screen text-white overflow-hidden bg-black">
      <div
        className="absolute inset-0 bg-cover bg-center scale-105 brightness-[0.82] contrast-[1.05]"
        style={{ backgroundImage: "url('/coverSugalaaWeb.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 lg:py-12">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 grid place-items-center rounded-xl border border-white/10 bg-white/5 backdrop-blur font-extrabold">
              HC
            </div>
            <div className="font-extrabold tracking-tight">
              Хурдан морь сугалаат худалдаа
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-4 py-2 text-sm font-bold text-white/85 hover:bg-white/10 transition"
          >
            ← Нүүр хуудас
          </Link>
        </div>

        {/* Heading */}
        <div className="mt-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            🏆 <span className="text-amber-300">Азтангууд</span>
          </h1>
          <p className="mt-3 text-white/70 max-w-xl">
            Манай сугалааны ялагчдын жагсаалт. Баяр хүргэе!
          </p>
        </div>

        {/* Winners grid */}
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {winners.map((w) => (
            <div
              key={w.id}
              className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden shadow-xl flex flex-col"
            >
              {w.imageUrl ? (
                <div className="aspect-[16/10] w-full bg-black/40 overflow-hidden">
                  <img
                    src={w.imageUrl}
                    alt={w.displayName ?? "Азтан"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="aspect-[16/10] w-full bg-white/5 grid place-items-center text-4xl">
                  🏆
                </div>
              )}

              <div className="p-5 flex flex-col flex-1">
                <div className="text-lg font-extrabold leading-snug">
                  {w.displayName ?? "Азтан"}
                </div>
                <div className="mt-1 text-sm font-bold text-amber-300">
                  {w.raffle.title ?? "Сугалаа"}
                </div>

                {w.bio && (
                  <p className="mt-3 text-sm text-white/75 leading-relaxed flex-1">
                    {w.bio}
                  </p>
                )}

                {w.ticket?.code && (
                  <div className="mt-3 font-mono text-xs text-white/45 bg-white/5 rounded-lg px-3 py-1.5 self-start">
                    {w.ticket.code}
                  </div>
                )}

                {w.facebookLiveUrl && (
                  <a
                    href={w.facebookLiveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-extrabold text-sm bg-green-600 hover:bg-green-500 transition text-white"
                  >
                    ▶ Live үзэх
                  </a>
                )}
              </div>
            </div>
          ))}

          {winners.length === 0 && (
            <div className="col-span-full text-center py-20 text-white/50 text-lg">
              Одоогоор нийтлэгдсэн азтан байхгүй байна.
            </div>
          )}
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-sm text-white/60">
          © {new Date().getFullYear()} Хурдан морь сугалаат худалдаа. Бүх эрх хуулиар хамгаалагдсан.
        </div>
      </div>
    </main>
  );
}
