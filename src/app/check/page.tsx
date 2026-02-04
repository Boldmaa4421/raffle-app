import CheckClient from "./checkClient";

export default function Page({
  searchParams,
}: {
  searchParams: { raffleId?: string; title?: string; img?: string };
}) {
  const raffleId = searchParams.raffleId || "";
  const title = searchParams.title || "Сугалаа";
  const img = searchParams.img || "";

  return <CheckClient raffleId={raffleId} title={title} img={img} />;
}
