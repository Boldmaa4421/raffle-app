"use client";

type Group = {
  purchaseId: string;
  purchaseCreatedAt: string;
  raffleId: string;
  raffleTitle: string;
  ticketPrice: number;
  ticketCount: number;
  codes: { code: string; createdAt: string }[];
};


export default function TicketPopup({
  open,
  onClose,
  phone,
  data, 
}: {
  open: boolean;
  onClose: () => void;
  phone: string;
  data: { phone: string; groups: Group[] } | null;
}) {
  if (!open) return null;

  const groups = data?.groups ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <div className="text-lg font-bold">Таны сугалааны кодууд</div>
            
            <div className="text-sm text-gray-500">{phone}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm font-medium hover:bg-gray-100"
          >
            Хаах
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto p-5">
          {groups.length === 0 ? (
            <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-600">
              Энэ дугаараар код олдсонгүй.
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g.purchaseId} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold">{g.raffleTitle}</div>
                      <div className="text-sm text-gray-500">
                        1 код = {g.ticketPrice.toLocaleString()}₮ • Нийт:{" "}
                        <span className="font-medium">{g.ticketCount}</span> код
                      </div>
                    </div>

                    <div className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold">
                      {g.ticketCount}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {g.codes.map((item) => (
  <div
    key={item.code}
    className="rounded-xl border bg-gray-50 px-3 py-2 text-center"
  >
    <div className="font-mono text-sm">{item.code}</div>
    <div className="text-xs text-gray-500">
      {new Date(item.createdAt).toLocaleString()}
    </div>
  </div>
))}

                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 text-xs text-gray-400">
            Кодын жагсаалт нь үүссэн хугацааны дарааллаар харагдана.
          </div>
        </div>
      </div>
    </div>
  );
}
