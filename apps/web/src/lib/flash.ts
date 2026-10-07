import "server-only";
import { cookies } from "next/headers";

/**
 * A toast to show on the next page the user sees (Carta item 12), set by a server action that
 * redirects or refreshes. The shell reads it and the Toaster shows it once, then clears the cookie.
 */
export const FLASH_COOKIE = "ie_toast";

export type FlashTone = "neutral" | "success" | "error";
export type Flash = { id: string; text: string; tone: FlashTone };

export async function flash(text: string, tone: FlashTone = "success") {
  const value: Flash = { id: crypto.randomUUID(), text, tone };
  (await cookies()).set(FLASH_COOKIE, JSON.stringify(value), { sameSite: "lax", path: "/", maxAge: 60 });
}

export async function readFlash(): Promise<Flash | null> {
  const raw = (await cookies()).get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<Flash>;
    return typeof v.id === "string" && typeof v.text === "string" ? { id: v.id, text: v.text.slice(0, 160), tone: v.tone === "error" || v.tone === "neutral" ? v.tone : "success" } : null;
  } catch {
    return null;
  }
}
