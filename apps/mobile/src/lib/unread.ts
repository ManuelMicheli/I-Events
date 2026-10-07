import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { setAppBadge } from "./push";
import { supabase } from "./supabase";

/** Unread notifications for the tab bar badge, shared by every screen that changes them. */
let count = 0;
/** How many times the count has grown since the first read: each one is an arrival (the bell rings). */
let arrivals = 0;
let loaded = false;
const listeners = new Set<() => void>();

export async function refreshUnread() {
  const { count: n, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  if (error) return;
  if (loaded && (n ?? 0) > count) arrivals += 1;
  count = n ?? 0;
  loaded = true;
  setAppBadge(count);
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

/** Grows by one each time new notifications arrive (not on the first read after launch). */
export function useUnreadArrivals(): number {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => arrivals,
  );
}
