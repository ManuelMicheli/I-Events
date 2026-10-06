import "server-only";
import { briefCompleteness, type RequestDraft } from "@i-events/core";
import type { Json } from "@i-events/db";
import { createClient } from "./supabase/server";

/** Shape expected by the save_request_draft database function. */
export function draftToPayload(draft: RequestDraft): Json {
  const b = draft.basics;
  return {
    kind: draft.kind,
    title: b.title,
    objective: b.objective,
    start_date: b.startDate ?? null,
    end_date: b.endDate ?? null,
    guests: b.guests ?? null,
    budget_min: b.budgetMin ?? null,
    budget_max: b.budgetMax ?? null,
    is_public: b.isPublic,
    audience: b.audience ?? null,
    city: b.city ?? null,
    free_text: draft.freeText ?? null,
    campaign:
      draft.kind === "campaign" && draft.campaign
        ? { eventsCount: draft.campaign.eventsCount, sameVenue: draft.campaign.sameVenue, servicesMode: draft.campaign.servicesMode }
        : null,
    completeness: briefCompleteness(draft),
    stages: draft.kind === "campaign" && draft.campaign
      ? draft.campaign.stages.map((s) => ({ city: s.city ?? null, venue_hint: s.venueHint ?? null, date: s.date ?? null }))
      : [],
    items: draft.items.map((i) => ({ category: i.category, stage_index: i.stageIndex ?? null, answers: i.answers as Json })),
  };
}

const opt = <T,>(v: T | null): T | undefined => (v === null ? undefined : v);

export type LoadedRequest = Awaited<ReturnType<typeof loadRequest>>;

/** A request with its stages and items, as the wizard and the report need it. */
export async function loadRequest(id: string) {
  const supabase = await createClient();
  const { data: r, error } = await supabase
    .from("requests")
    .select("*, organizations!requests_client_org_id_fkey(name), campaign_stages(*), request_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!r) return null;

  const stages = [...r.campaign_stages].sort((a, b) => a.position - b.position);
  const stageIndex = new Map(stages.map((s) => [s.id, s.position]));
  const campaign = r.campaign as { eventsCount: number; sameVenue: boolean; servicesMode: "shared" | "per_stage" } | null;

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
          stages: stages.map((s) => ({ city: opt(s.city), venueHint: opt(s.venue_hint), date: opt(s.date) })),
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
    status: r.status,
    clientOrgId: r.client_org_id,
    clientName: r.organizations.name,
    completeness: r.completeness,
    submittedAt: r.submitted_at,
    stages,
    draft,
  };
}

/** Agencies a client can send a request to: connected ones first, then the marketplace. */
export async function reachableAgencies(clientOrgId: string) {
  const supabase = await createClient();
  const [{ data: connections, error: e1 }, { data: listed, error: e2 }] = await Promise.all([
    supabase
      .from("connections")
      .select("agency:organizations!connections_agency_org_id_fkey(id, name, city)")
      .eq("client_org_id", clientOrgId)
      .eq("status", "active"),
    supabase
      .from("marketplace_profiles")
      .select("headline, services, regions, organizations!inner(id, name, city, type)")
      .eq("is_listed", true)
      .eq("organizations.type", "agency")
      .limit(200),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const connected = connections.flatMap((c) => (c.agency ? [{ ...c.agency, connected: true, headline: "", services: [] as string[], regions: [] as string[] }] : []));
  const ids = new Set(connected.map((a) => a.id));
  const marketplace = listed
    .filter((m) => !ids.has(m.organizations.id))
    .map((m) => ({ id: m.organizations.id, name: m.organizations.name, city: m.organizations.city, connected: false, headline: m.headline, services: m.services, regions: m.regions }));
  return [...connected, ...marketplace];
}

export type ReachableAgency = Awaited<ReturnType<typeof reachableAgencies>>[number];
