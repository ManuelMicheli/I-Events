"use client";

/**
 * Check-ins waiting to reach the server, kept on the device so they survive a dropped connection
 * or a closed tab. One entry per person: the latest tap wins.
 */
export type PendingCheckin = { id: string; at: string | null };

const key = (eventId: string) => `ie-checkins-${eventId}`;
const listeners = new Set<() => void>();

export function readQueue(eventId: string): string {
  try {
    return localStorage.getItem(key(eventId)) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseQueue(raw: string): PendingCheckin[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((e) => typeof e?.id === "string" && (e.at === null || typeof e.at === "string")) : [];
  } catch {
    return [];
  }
}

function writeQueue(eventId: string, entries: PendingCheckin[]) {
  try {
    if (entries.length === 0) localStorage.removeItem(key(eventId));
    else localStorage.setItem(key(eventId), JSON.stringify(entries));
  } catch {
    // Private mode or storage full: the tap still goes straight to the server when online.
  }
  for (const l of listeners) l();
}

export function enqueue(eventId: string, entry: PendingCheckin) {
  writeQueue(eventId, [...parseQueue(readQueue(eventId)).filter((e) => e.id !== entry.id), entry]);
}

/** Drops the entries that were sent, unless they changed in the meantime. */
export function dequeue(eventId: string, sent: PendingCheckin[]) {
  writeQueue(
    eventId,
    parseQueue(readQueue(eventId)).filter((e) => !sent.some((s) => s.id === e.id && s.at === e.at)),
  );
}

export function subscribeQueue(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
