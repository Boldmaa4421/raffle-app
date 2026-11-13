"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginClient() {
  const params = useSearchParams();
  const nextRaw = params.get("next") || "/admin/raffles";
  // Зөвхөн сайтын дотоод хаяг руу буцаана
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/admin/raffles";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDeviceCode("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        window.location.replace(next);
        return;
      }
      if (data?.deviceNotAllowed) setDeviceCode(data.deviceCode || "");
      setError(data?.error || "Нэвтрэх үед алдаа гарлаа.");
    } catch {
      setError("Сүлжээний алдаа. Дахин оролдоно уу.");
    }
    setLoading(false);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(deviceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-110 blur-[2px] brightness-[0.55]"
        style={{ backgroundImage: "url('/coverSugalaaWeb.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/50 to-black/90" />
      <div className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-amber-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-emerald-500/20 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-300 to-amber-500 text-xl font-black text-black shadow-[0_10px_40px_rgba(251,191,36,0.35)]">
              HC
            </div>
            <div className="mt-4 text-sm font-semibold tracking-wide text-white/70">
              Хурдан морь сугалаат худалдаа
            </div>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-white/15 bg-white/[0.07] p-6 sm:p-8 shadow-2xl shadow-black/60 backdrop-blur-xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Админ <span className="text-amber-300">нэвтрэх</span>
            </h1>
            <p className="mt-1.5 text-sm text-white/60">
              Зөвхөн зөвшөөрөгдсөн төхөөрөмжөөс нэвтрэх боломжтой.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/60">
                  Нэвтрэх нэр
                </span>
                <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-black/40 px-4 transition focus-within:border-amber-300/70 focus-within:ring-2 focus-within:ring-amber-300/20">
                  <UserIcon />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    className="w-full bg-transparent py-3.5 text-[16px] text-white outline-none placeholder:text-white/30"
                    placeholder="admin"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/60">
                  Нууц үг
                </span>
                <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-black/40 px-4 transition focus-within:border-amber-300/70 focus-within:ring-2 focus-within:ring-amber-300/20">
                  <LockIcon />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="w-full bg-transparent py-3.5 text-[16px] text-white outline-none placeholder:text-white/30"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-white/60 hover:bg-white/10 hover:text-white"
                    aria-label={showPass ? "Нууц үг нуух" : "Нууц үг харах"}
                  >
                    {showPass ? "Нуух" : "Харах"}
                  </button>
                </div>
              </label>

              {error && !deviceCode && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {deviceCode && (
                <div className="rounded-2xl border border-amber-300/40 bg-amber-400/10 p-4">
                  <div className="font-extrabold text-amber-200">🔒 {error}</div>
                  <p className="mt-1 text-sm text-white/70">
                    Энэ төхөөрөмжийн код. Админ зөвшөөрөх хүртэл нэвтрэх боломжгүй.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <code className="flex-1 rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-center font-mono text-lg font-black tracking-[0.2em] text-white">
                      {deviceCode}
                    </code>
                    <button
                      type="button"
                      onClick={copyCode}
                      className="rounded-xl bg-amber-300 px-3 py-2.5 text-sm font-extrabold text-black hover:bg-amber-200"
                    >
                      {copied ? "Хуулсан" : "Хуулах"}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-400 py-3.5 font-extrabold text-black shadow-[0_10px_30px_rgba(251,191,36,0.3)] transition hover:from-amber-200 hover:to-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                    Шалгаж байна...
                  </>
                ) : (
                  <>
                    Нэвтрэх
                    <span className="transition group-hover:translate-x-0.5">→</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <a href="/" className="text-sm font-semibold text-white/50 hover:text-white/80">
              ← Нүүр хуудас руу буцах
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-white/40" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-white/40" aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
  );
}
