import ResultClient from "./ResultClient";

export default function Page({
  searchParams,
}: {
  searchParams: { phone?: string; raffleId?: string };
}) {
  const phone = (searchParams.phone ?? "").trim();
  const raffleId = (searchParams.raffleId ?? "").trim();

  return <ResultClient phone={phone} raffleId={raffleId} />;
}
