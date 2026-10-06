/**
 * Push notifications through Expo's push service. The scheduled job claims the queued notifications, turns each
 * one into a message per phone, sends them in batches and settles every notification from the tickets Expo returns.
 */

export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Expo accepts at most 100 messages per request. */
export const EXPO_PUSH_BATCH = 100;
/** The Android channel the app creates at start; pushes land there. */
export const PUSH_CHANNEL_ID = "default";

/** What the app receives with a push, to open the right screen in the right organization. */
export type PushData = { notificationId: string; orgId: string; kind: string; link: string | null };

export type PushRow = {
  id: string;
  org_id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  tokens: string[];
  unread: number;
};

export type ExpoMessage = {
  to: string;
  title: string;
  body?: string;
  data: PushData;
  sound: "default";
  badge: number;
  channelId: string;
  priority: "high";
};

export type ExpoTicket = { status: "ok"; id: string } | { status: "error"; message?: string; details?: { error?: string } };

/** One message for each phone of each person, remembering which notification it carries. */
export function buildPushMessages(rows: PushRow[]): { notificationId: string; message: ExpoMessage }[] {
  return rows.flatMap((r) =>
    r.tokens.map((to) => ({
      notificationId: r.id,
      message: {
        to,
        title: r.title,
        ...(r.body ? { body: r.body } : {}),
        data: { notificationId: r.id, orgId: r.org_id, kind: r.kind, link: r.link },
        sound: "default" as const,
        badge: r.unread,
        channelId: PUSH_CHANNEL_ID,
        priority: "high" as const,
      },
    })),
  );
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * What happened to one message. `dead`: the app was uninstalled, drop the phone. `retry`: Expo or the network
 * failed for a while, try again on the next run. `error`: Expo refused it, do not retry.
 */
export type PushOutcome = "ok" | "dead" | "retry" | "error";

/** Outcomes for a batch, from the HTTP status and the tickets Expo returned in the same order as the messages. */
export function batchOutcomes(count: number, httpStatus: number | null, tickets: ExpoTicket[] | null): PushOutcome[] {
  if (httpStatus === null || httpStatus === 429 || httpStatus >= 500) return Array(count).fill("retry");
  if (httpStatus >= 400 || !tickets) return Array(count).fill("error");
  return Array.from({ length: count }, (_, i): PushOutcome => {
    const t = tickets[i];
    if (!t) return "retry";
    if (t.status === "ok") return "ok";
    if (t.details?.error === "DeviceNotRegistered") return "dead";
    if (t.details?.error === "MessageRateExceeded") return "retry";
    return "error";
  });
}

/**
 * Settles each notification: sent if at least one phone took it, pending again if a phone can still take it later,
 * failed otherwise. Also lists the phones to forget.
 */
export function settlePushes(results: { notificationId: string; token: string; outcome: PushOutcome }[]): {
  sent: string[];
  retry: string[];
  failed: string[];
  deadTokens: string[];
} {
  const byId = new Map<string, PushOutcome[]>();
  for (const r of results) byId.set(r.notificationId, [...(byId.get(r.notificationId) ?? []), r.outcome]);
  const sent: string[] = [];
  const retry: string[] = [];
  const failed: string[] = [];
  for (const [id, outcomes] of byId) {
    if (outcomes.includes("ok")) sent.push(id);
    else if (outcomes.includes("retry")) retry.push(id);
    else failed.push(id);
  }
  const deadTokens = [...new Set(results.filter((r) => r.outcome === "dead").map((r) => r.token))];
  return { sent, retry, failed, deadTokens };
}

/** The data of a push the app received, or null if it is not one of ours. */
export function parsePushData(data: unknown): PushData | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.notificationId !== "string" || typeof d.orgId !== "string") return null;
  return {
    notificationId: d.notificationId,
    orgId: d.orgId,
    kind: typeof d.kind === "string" ? d.kind : "",
    link: typeof d.link === "string" ? d.link : null,
  };
}
