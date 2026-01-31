import { Suspense } from "react";
import ImportClient from "./ImportClient";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <ImportClient />
    </Suspense>
  );
}
