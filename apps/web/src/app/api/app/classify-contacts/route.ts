import { env } from "@/lib/env";
import { getServiceClassifier } from "@/lib/service-classifier";
import type { Database } from "@i-events/db";
import { contactSchema } from "@i-events/core";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const dynamic = "force-dynamic";

const body = z.object({
  orgId: z.uuid(),
  contacts: z.array(contactSchema).max(5000),
  hints: z.array(z.string().max(500).optional()).max(5000).optional(),
});

/**
 * Proposed services for contacts the mobile app is importing, with the same classifier as the web import (Jev when
 * configured, keyword rules otherwise). The app sends its Supabase session as `Authorization: Bearer <access token>`
 * and the organization it imports into, which must be an agency the person belongs to.
 */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createClient<Database>(env.supabaseUrl, env.supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: user } = await supabase.auth.getUser(token);
  if (!user.user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid body" }, { status: 400 });
  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id, organizations!inner(type)")
    .eq("user_id", user.user.id)
    .eq("org_id", parsed.data.orgId)
    .eq("organizations.type", "agency")
    .maybeSingle();
  if (!membership) return Response.json({ error: "forbidden" }, { status: 403 });

  const services = await getServiceClassifier().classify(parsed.data.contacts, parsed.data.hints);
  return Response.json({ services });
}
