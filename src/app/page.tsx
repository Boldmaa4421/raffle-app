import HomeLookup from "../components/HomeLookup";
import RaffleCheckButton from "@/components/RaffleCheckButton";
import RaffleLookupButton from "@/components/RaffleLookupButton";
import CopyAccountButton from "@/components/CopyAccountButton";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function formatMNT(n: number) {
  return new Intl.NumberFormat("mn-MN").format(n) + "₮";
}

// ✅ IMAGE SAFETY HELPERS
const normalizeImageUrl = (url?: string | null) => {
  if (!url) return null;

  // Facebook / group links block
  if (url.includes("facebook.com")) return null;

  // Imgur album block
  if (url.includes("imgur.com/gallery")) return null;

  return url;
};

const isValidImage = (url?: string | null) => {
  if (!url) return false;
  return /^https?:\/\//.test(url);
};

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
      <div
        className="absolute inset-0 bg-cover bg-center scale-105 brightness-[0.82] contrast-[1.05] saturate-[1.0]"
        style={{ backgroundImage: "url('/coverSugalaaWeb.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 lg:py-12">
        {/* TOP */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 grid place-items-center rounded-xl border border-white/10 bg-white/5 backdrop-blur font-extrabold">
              HC
            </div>
            <div className="font-extrabold tracking-tight">
              Хурдан морь сугалаат худалдаа
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-4 py-2 text-sm font-bold text-white/85">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Шууд шалгах — 24/7
          </div>
        </div>

        {/* HERO */}
        <div className="mt-10 grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
              Утасны дугаараар <br />
              <span className="text-amber-300">
                код шалгах
              </span>
            </h1>
          </div>
        </div>

        {/* RAFFLES */}
        <div className="mt-10">
          <h2 className="text-xl sm:text-2xl font-extrabold">
            🚗 Одоогоор манайд идэвхтэй сугалаанууд
          </h2>

          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {raffles.map((r) => {
              const total =
                typeof r.totalTickets === "number" ? Math.max(1, r.totalTickets) : null;

              const sold = r._count.tickets ?? 0;
              const soldPct =
                total ? Math.max(0, Math.min(100, Math.round((sold / total) * 100))) : null;

              const imgUrl = normalizeImageUrl(r.imageUrl);

              return (
                <div
                  key={r.id}
                  className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden shadow-xl"
                >
                  {/* IMAGE FIXED */}
                  <div className="relative aspect-[16/10] w-full bg-black/40">
                    {isValidImage(imgUrl) ? (
                      <img
                        src={imgUrl!}
                        alt={r.title ?? "raffle"}
                        className="absolute inset-0 h-full w-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-white/50 text-sm">
                        Зураг ачаалагдсангүй
                      </div>
                    )}

                    <div className="mt-3">
                      <RaffleLookupButton
                        raffleId={r.id}
                        raffleTitle={r.title}
                      />
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="p-4">
                    <div className="text-center font-extrabold text-lg">
                      {r.title ?? "Сугалаа"}
                    </div>

                    <div className="mt-3 text-amber-300 font-bold text-center">
                      {formatMNT(r.ticketPrice)}
                    </div>

                    <RaffleCheckButton
                      raffleId={r.id}
                      raffleTitle={r.title ?? "Сугалаа"}
                    />
                  </div>
                </div>
              );
            })}

            {raffles.length === 0 && (
              <div className="text-white/70">Одоогоор сугалаа алга.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold border border-white/10 bg-white/5 backdrop-blur">
      {children}
    </span>
  );
}