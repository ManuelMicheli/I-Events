import AsyncStorage from "@react-native-async-storage/async-storage";
import { checkinSyncOutcome, dbErrorMessage, dequeueCheckins, enqueueCheckin, parseCheckinQueue, type PendingCheckin } from "@i-events/core";
import * as Network from "expo-network";
import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { supabase } from "./supabase";

/**
 * Check-ins made on the phone, saved on it before anything else so they survive no signal, a closed app or a dead
 * battery, and sent to the server whenever there is a connection. One entry per person: the latest tap wins.
 */

const PREFIX = "ie-checkins-";

export type CheckinQueueState = {
  queue: PendingCheckin[];
  /** Why the server refused the last check-ins, if it did. */
  error: string | null;
  /** The people whose last check-in the server refused, with the reason. */
  refused: Record<string, string>;
  syncing: boolean;
};

const EMPTY: CheckinQueueState = { queue: [], error: null, refused: {}, syncing: false };
const states = new Map<string, CheckinQueueState>();
const loading = new Map<string, Promise<void>>();
const flushing = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

const get = (eventId: string) => states.get(eventId) ?? EMPTY;

function set(eventId: string, patch: Partial<CheckinQueueState>) {
  const next = { ...get(eventId), ...patch };
  states.set(eventId, next);
  if (patch.queue) {
    const write = next.queue.length === 0 ? AsyncStorage.removeItem(PREFIX + eventId) : AsyncStorage.setItem(PREFIX + eventId, JSON.stringify(next.queue));
    write.catch(() => {});
  }
  for (const l of listeners) l();
}

function load(eventId: string): Promise<void> {
  let p = loading.get(eventId);
  if (!p) {
    p = AsyncStorage.getItem(PREFIX + eventId)
      .then((raw) => {
        if (!states.has(eventId)) set(eventId, { queue: parseCheckinQueue(raw) });
      })
      .catch(() => {});
    loading.set(eventId, p);
  }
  return p;
}

/** Records an arrival (or undoes it with `at` null) and tries to send it straight away. */
export async function recordCheckin(eventId: string, entry: PendingCheckin): Promise<void> {
  await load(eventId);
  const { [entry.id]: _, ...refused } = get(eventId).refused;
  set(eventId, { queue: enqueueCheckin(get(eventId).queue, entry), error: null, refused });
  void flushCheckins(eventId);
}

/**
 * Sends what is queued for an event, including taps made while sending. Entries the server could not take for now
 * stay for the next try; without a connection it stops at the first failure.
 */
export function flushCheckins(eventId: string): Promise<void> {
  const running = flushing.get(eventId);
  if (running) return running;
  const p = (async () => {
    await load(eventId);
    const tried = new Set<string>();
    const key = (e: PendingCheckin) => `${e.id}|${e.at}`;
    let offline = false;
    while (!offline) {
      const entries = get(eventId).queue.filter((e) => !tried.has(key(e)));
      if (entries.length === 0) break;
      set(eventId, { syncing: true });
      const done: PendingCheckin[] = [];
      let error: string | null = null;
      const refused = { ...get(eventId).refused };
      for (const e of entries) {
        tried.add(key(e));
        const res = await supabase.from("event_crew").update({ checked_in_at: e.at }).eq("id", e.id).eq("event_id", eventId);
        const outcome = checkinSyncOutcome(res.status);
        if (outcome === "retry") {
          offline = res.status === 0;
          if (offline) break;
          continue;
        }
        done.push(e);
          if (outcome === "refused") {
          error = res.error ? dbErrorMessage(res.error) : "Il server non l'ha accettato.";
          refused[e.id] = error;
        }
      }
      set(eventId, { queue: dequeueCheckins(get(eventId).queue, done), refused, ...(error ? { error } : {}) });
    }
    if (get(eventId).syncing) set(eventId, { syncing: false });
  })().finally(() => flushing.delete(eventId));
  flushing.set(eventId, p);
  return p;
}

/** Sends the check-ins of every event still waiting on this phone. */
export async function flushAllCheckins(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    await Promise.all(keys.map((k) => flushCheckins(k.slice(PREFIX.length))));
  } catch {
    // Storage unavailable: nothing was saved either.
  }
}

/** The queue of one event, kept up to date as taps are recorded and sent. */
export function useCheckinQueue(eventId: string): CheckinQueueState {
  useEffect(() => {
    void load(eventId);
  }, [eventId]);
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => get(eventId),
  );
}

export function clearCheckinError(eventId: string) {
  if (get(eventId).error) set(eventId, { error: null });
}

/**
 * While signed in, sends waiting check-ins of any event when the app starts, comes back to the foreground or finds
 * the connection again, even if the event day screen is closed.
 */
export function useCheckinAutoSync() {
  useEffect(() => {
    void flushAllCheckins();
    const app = AppState.addEventListener("change", (s) => s === "active" && void flushAllCheckins());
    let wasOnline = true;
    const net = Network.addNetworkStateListener((s) => {
      const online = s.isConnected !== false && s.isInternetReachable !== false;
      if (online && !wasOnline) void flushAllCheckins();
      wasOnline = online;
    });
    return () => {
      app.remove();
      net.remove();
    };
  }, []);
}
