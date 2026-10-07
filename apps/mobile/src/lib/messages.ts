import type { MyOrgType } from "./active-org";
import { supabase } from "./supabase";

/**
 * Conversations of the organization: one per proposal, between the company and one agency. Agencies
 * see the requests they received, companies one row per agency they wrote to. Latest message first.
 */
export async function fetchConversations(orgId: string, side: Exclude<MyOrgType, "supplier">) {
  const base = supabase
    .from("proposals")
    .select(
      `id, status, created_at, agency:organizations!proposals_agency_org_id_fkey(name),
       request:requests!inner(id, title, client_org_id, client:organizations!requests_client_org_id_fkey(name)),
       messages(body, internal, created_at, author_org_id)`,
    )
    .order("created_at", { referencedTable: "messages", ascending: false })
    .limit(1, { referencedTable: "messages" });
  const { data, error } = await (side === "agency" ? base.eq("agency_org_id", orgId) : base.eq("request.client_org_id", orgId));
  if (error) throw error;
  return data
    .map((p) => {
      const last = side === "client" ? p.messages.find((m) => !m.internal) : p.messages[0];
      return {
        proposalId: p.id,
        status: p.status,
        with: side === "agency" ? p.request.client.name : p.agency.name,
        requestTitle: p.request.title,
        last: last ?? null,
        mine: last ? last.author_org_id === orgId : false,
        at: last?.created_at ?? p.created_at,
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

export type Conversation = Awaited<ReturnType<typeof fetchConversations>>[number];

/** The conversation of one proposal, oldest first; the company never sees the agency's internal notes. */
export async function fetchThread(proposalId: string, orgId: string) {
  if (!/^[0-9a-f-]{36}$/.test(proposalId)) return null;
  const { data: p, error } = await supabase
    .from("proposals")
    .select(
      `id, agency_org_id, agency:organizations!proposals_agency_org_id_fkey(name),
       request:requests!inner(id, title, client_org_id, client:organizations!requests_client_org_id_fkey(name))`,
    )
    .eq("id", proposalId)
    .maybeSingle();
  if (error) throw error;
  if (!p || (p.agency_org_id !== orgId && p.request.client_org_id !== orgId)) return null;
  const isAgency = p.agency_org_id === orgId;
  let q = supabase
    .from("messages")
    .select("id, body, internal, created_at, author_org_id, author:profiles(full_name)")
    .eq("proposal_id", proposalId)
    .order("created_at");
  if (!isAgency) q = q.eq("internal", false);
  const { data: messages, error: e2 } = await q;
  if (e2) throw e2;
  return {
    isAgency,
    with: isAgency ? p.request.client.name : p.agency.name,
    requestId: p.request.id,
    requestTitle: p.request.title,
    messages,
  };
}

export type Thread = NonNullable<Awaited<ReturnType<typeof fetchThread>>>;

export async function sendMessage(input: { proposalId: string; orgId: string; userId: string; body: string; internal: boolean }) {
  const { error } = await supabase.from("messages").insert({
    proposal_id: input.proposalId,
    author_id: input.userId,
    author_org_id: input.orgId,
    body: input.body,
    internal: input.internal,
  });
  if (error) throw error;
}
