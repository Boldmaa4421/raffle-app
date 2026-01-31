"use client";

import { useEffect, useState } from "react";

export default function CopyAccountButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1400);
    return () => clearTimeout(t);
  }, [toast]);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Данс хууллаа ✓");
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setToast("Данс хууллаа ✓");
      } catch {
        setToast("Хуулах боломжгүй байна");
      }
    }
  }

  return (
    <>
      <button onClick={onCopy} className={className}>
        Данс хуулах
      </button>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[9999]">
          <div
            className="rounded-xl border border-white/10 bg-black/70 backdrop-blur-xl
              px-4 py-3 shadow-2xl text-white text-sm font-bold"
          >
            <span className="text-amber-300">●</span> {toast}
          </div>
        </div>
      )}
    </>
  );
}
