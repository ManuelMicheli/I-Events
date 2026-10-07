"use client";

import type { Flash, FlashTone } from "@/lib/flash";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Toast (Carta item 12): Grafite on Carta (inverted in dark mode), radius 12, 360 wide, icon on the
 * left, optional text action. One at a time: a new one replaces the one on screen. It stays 4 s (6 s
 * with an action) and waits while pointed at or focused.
 */
type Toast = { id: string; text: string; tone: FlashTone; action?: { label: string; onClick: () => void } };
type ToastInput = Omit<Toast, "id" | "tone"> & { tone?: FlashTone };

const ToastContext = createContext<(t: ToastInput) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ flash, tabBar = false, children }: { flash: Flash | null; tabBar?: boolean; children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [held, setHeld] = useState(false);
  const [flashSeen, setFlashSeen] = useState<string | null>(null);

  // A flash from a server action shows once; the cookie goes so a reload doesn't show it again.
  if (flash && flash.id !== flashSeen) {
    setFlashSeen(flash.id);
    setLeaving(false);
    setToast({ id: flash.id, text: flash.text, tone: flash.tone });
  }
  useEffect(() => {
    if (flash) document.cookie = "ie_toast=; Max-Age=0; path=/; SameSite=Lax";
  }, [flash]);

  const show = useCallback((t: ToastInput) => {
    setLeaving(false);
    setToast({ id: crypto.randomUUID(), tone: "neutral", ...t });
  }, []);

  useEffect(() => {
    if (!toast || held || leaving) return;
    const t = setTimeout(() => setLeaving(true), toast.action ? 6000 : 4000);
    return () => clearTimeout(t);
  }, [toast, held, leaving]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setToast(null), 160);
    return () => clearTimeout(t);
  }, [leaving]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 ${
          tabBar ? "bottom-[calc(56px+env(safe-area-inset-bottom)+12px)] lg:bottom-6" : "bottom-[calc(env(safe-area-inset-bottom)+16px)] sm:bottom-6"
        }`}
      >
        {toast && (
          <div
            key={toast.id}
            onPointerEnter={() => setHeld(true)}
            onPointerLeave={() => setHeld(false)}
            onFocus={() => setHeld(true)}
            onBlur={() => setHeld(false)}
            className={`toast pointer-events-auto flex w-full max-w-[360px] items-start gap-3 rounded-ui bg-text px-4 py-3 text-sm text-app shadow-3 ${leaving ? "is-leaving" : ""}`}
          >
            {toast.tone !== "neutral" && <ToneIcon tone={toast.tone} />}
            <p className="min-w-0 flex-1 break-words">{toast.text}</p>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  setLeaving(true);
                }}
                className="toast-action -my-1 -mr-2 min-h-8 shrink-0 rounded-[8px] px-2 font-medium"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

function ToneIcon({ tone }: { tone: FlashTone }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="shrink-0">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      {tone === "success" ? (
        <path className="toast-tick" d="M6.75 10.25l2.25 2.25 4.25-4.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <path d="M10 6.25v4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="13.5" r="0.9" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
