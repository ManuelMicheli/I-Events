import { isCronRequest } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  batchOutcomes,
  buildPushMessages,
  chunk,
  EXPO_PUSH_BATCH,
  EXPO_PUSH_URL,
  settlePushes,
  type ExpoTicket,
  type PushOutcome,
} from "@i-events/core";

export const dynamic = "force-dynamic";

/**
 * Sends the pending notifications to the phones where the mobile app is signed in, through Expo's push service.
 * Called by the scheduler every minute (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`).
 * `EXPO_ACCESS_TOKEN` is needed only if push security is turned on for the project in Expo.
 */
export async function GET(request: Request) {
  if (!isCronRequest(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  const pushUrl = process.env.EXPO_PUSH_URL ?? EXPO_PUSH_URL;

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase.rpc("claim_notification_pushes", { p_limit: 500 });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const messages = buildPushMessages(rows);
  const results: { notificationId: string; token: string; outcome: PushOutcome }[] = [];
  for (const batch of chunk(messages, EXPO_PUSH_BATCH)) {
    const res = await fetch(pushUrl, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(batch.map((b) => b.message)),
    }).catch(() => null);
    const tickets = res?.ok ? (((await res.json().catch(() => null)) as { data?: ExpoTicket[] } | null)?.data ?? null) : null;
    const outcomes = batchOutcomes(batch.length, res ? res.status : null, tickets);
    batch.forEach((b, i) => results.push({ notificationId: b.notificationId, token: b.message.to, outcome: outcomes[i]! }));
  }

  const settled = settlePushes(results);
  await Promise.all([
    settled.sent.length > 0 && supabase.rpc("finish_notification_pushes", { p_ids: settled.sent, p_status: "sent" }),
    settled.retry.length > 0 && supabase.rpc("finish_notification_pushes", { p_ids: settled.retry, p_status: "pending" }),
    settled.failed.length > 0 && supabase.rpc("finish_notification_pushes", { p_ids: settled.failed, p_status: "failed" }),
    settled.deadTokens.length > 0 && supabase.rpc("remove_push_tokens", { p_tokens: settled.deadTokens }),
  ]);
  return Response.json({
    notifications: rows.length,
    messages: messages.length,
    sent: settled.sent.length,
    retry: settled.retry.length,
    failed: settled.failed.length,
    removedPhones: settled.deadTokens.length,
  });
}
