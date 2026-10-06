import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDigest } from "@i-events/core";
import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

/**
 * Sends one email digest per person with their pending notifications. Called by the scheduler
 * (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`). Without an email provider configured it
 * does nothing, so notifications stay pending until one is.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return Response.json({ error: "email provider not configured" }, { status: 503 });
  const apiUrl = process.env.RESEND_API_URL ?? "https://api.resend.com";

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase.rpc("claim_notification_emails", { p_limit: 500 });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const byUser = new Map<string, typeof rows>();
  for (const r of rows) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);

  let sent = 0;
  let failed = 0;
  for (const items of byUser.values()) {
    const first = items[0]!;
    const ids = items.map((i) => i.id);
    const digest = buildDigest(
      { fullName: first.full_name, locale: first.locale, items: items.map((i) => ({ id: i.id, title: i.title, body: i.body, createdAt: i.created_at })) },
      env.siteUrl,
    );
    const res = await fetch(`${apiUrl}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `digest-${[...ids].sort()[0]}-${ids.length}` },
      body: JSON.stringify({ from, to: [first.email], subject: digest.subject, html: digest.html, text: digest.text }),
    }).catch(() => null);
    const ok = res?.ok ?? false;
    // A temporary provider error leaves the rows pending for the next run; a rejected address does not retry forever.
    const status = ok ? "sent" : res && res.status >= 400 && res.status < 500 && res.status !== 429 ? "failed" : "pending";
    await supabase.rpc("finish_notification_emails", { p_ids: ids, p_status: status });
    if (ok) sent += 1;
    else failed += 1;
  }
  return Response.json({ people: byUser.size, notifications: rows.length, sent, failed });
}
