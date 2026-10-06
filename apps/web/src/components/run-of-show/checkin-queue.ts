"use client";

import { dequeueCheckins, enqueueCheckin, parseCheckinQueue, type PendingCheckin } from "@i-events/core";

/**
 * Check-ins waiting to reach the server, kept on the device so they survive a dropped connection
 * or a closed tab. One entry per person: the latest tap wins.
 */
export type { PendingCheckin };

const key = (eventId: string) => `ie-checkins-${eventId}`;
const listeners = new Set<() => void>();

export function readQueue(eventId: string): string {
  try {
    return localStorage.getItem(key(eventId)) ?? "[]";
  } catch {
    return "[]";
  }
}

export const parseQueue = parseCheckinQueue;

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
  writeQueue(eventId, enqueueCheckin(parseQueue(readQueue(eventId)), entry));
}

/** Drops the entries that were sent, unless they changed in the meantime. */
export function dequeue(eventId: string, sent: PendingCheckin[]) {
  writeQueue(eventId, dequeueCheckins(parseQueue(readQueue(eventId)), sent));
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
