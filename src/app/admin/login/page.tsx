import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const metadata = { title: "Админ нэвтрэх" };

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
