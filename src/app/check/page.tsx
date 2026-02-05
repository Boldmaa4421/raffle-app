import { Suspense } from "react";
import CheckClient from "./checkClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-white/70">Уншиж байна…</div>}>
      <CheckClient raffleId="" title="Утасны дугаараар код шалгах" img="/images/Blue and White Modern Message Conversation Facebook Post.png" />
    </Suspense>
  );
}
