import { cookies } from "next/headers";
import {
  DEVICE_COOKIE,
  SESSION_COOKIE,
  allowedDevices,
  formatDeviceId,
  verifySession,
} from "@/lib/adminAuth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const device = jar.get(DEVICE_COOKIE)?.value;
  const loggedIn = await verifySession(jar.get(SESSION_COOKIE)?.value, device);

  return (
    <>
      {loggedIn && device && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            flexWrap: "wrap",
            padding: "8px 16px",
            background: "#111",
            color: "#ddd",
            fontSize: 12,
          }}
        >
          {allowedDevices().length === 0 && (
            <span style={{ color: "#fbbf24", fontWeight: 700 }}>
              ⚠ Төхөөрөмжийн хязгаарлалт идэвхгүй
            </span>
          )}
          <span>
            Энэ төхөөрөмж:{" "}
            <b style={{ fontFamily: "monospace", letterSpacing: 1, color: "white" }}>
              {formatDeviceId(device)}
            </b>
          </span>
          <form action="/api/auth/logout" method="post" style={{ margin: 0 }}>
            <button
              type="submit"
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                border: "1px solid #444",
                background: "#222",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Гарах
            </button>
          </form>
        </div>
      )}
      {children}
    </>
  );
}
