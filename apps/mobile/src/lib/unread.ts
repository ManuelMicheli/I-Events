import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { supabase } from "./supabase";

/** Unread notifications for the tab bar badge, shared by every screen that changes them. */
let count = 0;
const listeners = new Set<() => void>();

export async function refreshUnread() {
  const { count: n, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  if (error) return;
  count = n ?? 0;
  for (const l of listeners) l();
}

export function useUnreadCount(): number {
  useEffect(() => {
    refreshUnread();
    const sub = AppState.addEventListener("change", (s) => s === "active" && refreshUnread());
    return () => sub.remove();
  }, []);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => count,
  );
}
