import { ATTACHMENTS_BUCKET, type ProposalLine, type ProposalStatus, type RequestDraft } from "@i-events/core";
import { supabase } from "./supabase";

/** Proposals that are still being worked on by the agency. */
export const PROPOSAL_TO_REVIEW: ProposalStatus[] = ["invited", "reviewing", "clarification", "revision_requested"];
/** Proposals the company can compare: they carry figures. */
export const PROPOSAL_PRICED: ProposalStatus[] = ["submitted", "revision_requested", "accepted", "rejected"];
/** What the agency can still change. */
export const PROPOSAL_EDITABLE: ProposalStatus[] = ["invited", "reviewing", "clarification", "revision_requested", "withdrawn"];

const REQUEST_FIELDS = "id, title, kind, status, start_date, end_date, guests, city, campaign, submitted_at";

/** Every request sent to the agency, newest activity first, with the company that sent it. */
export async function fetchAgencyProposals(orgId: string) {
  const { data, error } = await supabase
    .from("proposals")
    .select(
      `id, status, total_amount, version, updated_at, request:requests!inner(${REQUEST_FIELDS}, client:organizations!requests_client_org_id_fkey(name))`,
    )
    .eq("agency_org_id", orgId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export type AgencyProposal = Awaited<ReturnType<typeof fetchAgencyProposals>>[number];

/** The company's sent requests with the agencies they went to and where each proposal stands. */
export async function fetchClientRequests(orgId: string) {
  const { data, error } = await supabase
    .from("requests")
    .select(
      `${REQUEST_FIELDS}, updated_at, proposals(id, status, total_amount, version, submitted_at, agency:organizations!proposals_agency_org_id_fkey(name))`,
    )
    .eq("client_org_id", orgId)
    .neq("status", "draft")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export type ClientRequest = Awaited<ReturnType<typeof fetchClientRequests>>[number];

/** The agency's tasks still open that are late or due within a week, soonest first. */
export async function fetchDueTasks(orgId: string, until: string) {
  const { data, error } = await supabase
    .from("event_tasks")
    .select("id, title, due_date, event:events(id, title)")
    .eq("org_id", orgId)
    .is("done_at", null)
    .lte("due_date", until)
    .order("due_date")
    .limit(20);
  if (error) throw error;
  return data;
}

export async function setTaskDone(id: string, done: boolean) {
  const { error } = await supabase
    .from("event_tasks")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

const opt = <T>(v: T | null): T | undefined => (v === null ? undefined : v);

/** A request with its stages and services, in the shape of the wizard's draft: what the brief shows. */
export async function fetchRequest(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data: r, error } = await supabase
    .from("requests")
    .select("*, organizations!requests_client_org_id_fkey(name), campaign_stages(*), request_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!r) return null;

  const stages = [...r.campaign_stages].sort((a, b) => a.position - b.position);
  const stageIndex = new Map(stages.map((s) => [s.id, s.position]));
  const campaign = r.campaign as {
    eventsCount: number;
    sameVenue: boolean;
    servicesMode: "shared" | "per_stage";
  } | null;
  const draft: RequestDraft = {
    kind: r.kind,
    basics: {
      title: r.title,
      objective: r.objective as RequestDraft["basics"]["objective"],
      startDate: opt(r.start_date),
      endDate: opt(r.end_date),
      guests: opt(r.guests),
      budgetMin: r.budget_min === null ? undefined : Number(r.budget_min),
      budgetMax: r.budget_max === null ? undefined : Number(r.budget_max),
      isPublic: r.is_public,
      audience: opt(r.audience),
      city: opt(r.city),
    },
    campaign: campaign
      ? {
          ...campaign,
          stages: stages.map((s) => ({
            city: opt(s.city),
            venueHint: opt(s.venue_hint),
            date: opt(s.date),
          })),
        }
      : undefined,
    items: r.request_items.map((i) => ({
      category: i.category_key,
      stageIndex: i.stage_id ? stageIndex.get(i.stage_id) : undefined,
      answers: (i.answers ?? {}) as Record<string, unknown>,
    })),
    freeText: opt(r.free_text),
  };
  return {
    id: r.id,
    row: r,
    status: r.status,
    clientOrgId: r.client_org_id,
    clientName: r.organizations.name,
    completeness: r.completeness,
    submittedAt: r.submitted_at,
    draft,
  };
}

export type LoadedRequest = NonNullable<Awaited<ReturnType<typeof fetchRequest>>>;

const PROPOSAL_FIELDS = "id, request_id, agency_org_id, status, summary, lines, total_amount, version, submitted_at, updated_at";

/** One proposal of the agency, with the request it answers; null when it is not theirs. */
export async function fetchAgencyProposal(id: string, orgId: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data: proposal, error } = await supabase.from("proposals").select(PROPOSAL_FIELDS).eq("id", id).eq("agency_org_id", orgId).maybeSingle();
  if (error) throw error;
  if (!proposal) return null;
  const request = await fetchRequest(proposal.request_id);
  if (!request) return null;
  const { data: events, error: e2 } =
    proposal.status === "accepted"
      ? await supabase.from("events").select("id, title").eq("proposal_id", proposal.id).order("start_date")
      : { data: [], error: null };
  if (e2) throw e2;
  return {
    proposal: { ...proposal, lines: (proposal.lines ?? []) as ProposalLine[] },
    request,
    events,
  };
}

/** One request of the company with every agency's proposal; null when it is not theirs. */
export async function fetchClientRequest(id: string, orgId: string) {
  const request = await fetchRequest(id);
  if (!request || request.clientOrgId !== orgId) return null;
  const [{ data: proposals, error: e1 }, { data: events, error: e2 }] = await Promise.all([
    supabase
      .from("proposals")
      .select(`${PROPOSAL_FIELDS}, agency:organizations!proposals_agency_org_id_fkey(name, city)`)
      .eq("request_id", id)
      .order("created_at"),
    supabase.from("events").select("id, title, status, start_date, city").eq("request_id", id).order("start_date"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return {
    request,
    proposals: proposals.map((p) => ({
      ...p,
      lines: (p.lines ?? []) as ProposalLine[],
      total: p.total_amount === null ? null : Number(p.total_amount),
    })),
    events,
  };
}

export type ClientProposal = NonNullable<Awaited<ReturnType<typeof fetchClientRequest>>>["proposals"][number];

/** Files of the request (proposal null) or of one proposal. */
export async function fetchAttachments(requestId: string, proposalId: string | null) {
  let q = supabase.from("request_attachments").select("id, file_name, size_bytes, storage_path, created_at").eq("request_id", requestId);
  q = proposalId ? q.eq("proposal_id", proposalId) : q.is("proposal_id", null);
  const { data, error } = await q.order("created_at");
  if (error) throw error;
  return data;
}

/** A short-lived link to download one file. */
export async function attachmentUrl(path: string) {
  const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).createSignedUrl(path, 120);
  if (error) throw error;
  return data.signedUrl;
}
