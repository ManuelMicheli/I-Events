import { briefCompleteness, normalizeDraft, requestDraftSchema, submissionIssues, type RequestDraft } from "@i-events/core";
import type { Json } from "@i-events/db";
import type { z } from "zod";
import { errorMessage } from "./errors";
import { supabase } from "./supabase";

export const EMPTY_DRAFT: RequestDraft = {
  kind: "single",
  basics: { title: "", objective: "product_launch", isPublic: false },
  items: [],
};

/** Shape expected by the save_request_draft database function (the same as the website's). */
export function draftToPayload(draft: RequestDraft): Json {
  const b = draft.basics;
  return {
    kind: draft.kind,
    event_type: draft.eventType ?? null,
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
    stages:
      draft.kind === "campaign" && draft.campaign
        ? draft.campaign.stages.map((s) => ({ city: s.city ?? null, venue_hint: s.venueHint ?? null, date: s.date ?? null }))
        : [],
    items: draft.items.map((i) => ({ category: i.category, stage_index: i.stageIndex ?? null, answers: i.answers as Json })),
  };
}

export type Issue = { path: string; message: string };
export type SaveResult = { id?: string; error?: string; issues?: Issue[] };

/** Zod's own messages are in English: these say the same in Italian, next to the field. */
export function issueMessage(issue: z.core.$ZodIssue): string {
  const path = issue.path.join(".");
  const answer = issue.path[0] === "items";
  switch (issue.code) {
    case "custom": {
      // Answers to service questions arrive re-wrapped from core, still with zod's English text.
      if (!answer || issue.path[2] !== "answers") return issue.message;
      const min = /too small.*?(\d+)/i.exec(issue.message);
      if (min && /number/i.test(issue.message)) return `Il minimo è ${min[1]}`;
      const max = /too big.*?(\d+)/i.exec(issue.message);
      if (max && /number/i.test(issue.message)) return `Il massimo è ${max[1]}`;
      return /too big/i.test(issue.message) ? "Testo troppo lungo" : "Rispondi a questa domanda";
    }
    case "too_small":
      if (path === "basics.title") return "Scrivi un nome di almeno 3 caratteri";
      if (issue.origin === "number") return `Il minimo è ${String(issue.minimum)}`;
      return answer ? "Rispondi a questa domanda" : "Campo obbligatorio";
    case "too_big":
      if (issue.origin === "number") return `Il massimo è ${String(issue.maximum)}`;
      return "Testo troppo lungo";
    case "invalid_format":
      return "Data non valida";
    default:
      return answer ? "Rispondi a questa domanda" : "Controlla questo campo";
  }
}

async function save(orgId: string, requestId: string | null, input: RequestDraft): Promise<SaveResult & { draft?: RequestDraft }> {
  const parsed = requestDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Controlla i campi evidenziati.", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: issueMessage(i) })) };
  }
  const draft = normalizeDraft(parsed.data);
  const { data, error } = await supabase.rpc("save_request_draft", {
    p_request: requestId ?? undefined,
    p_client_org: orgId,
    p_payload: draftToPayload(draft),
  });
  if (error) return { error: errorMessage(error) };
  return { id: data, draft };
}

/** Saves the draft, creating it the first time; validation problems come back field by field. */
export async function saveDraft(orgId: string, requestId: string | null, draft: RequestDraft): Promise<SaveResult> {
  const { id, error, issues } = await save(orgId, requestId, draft);
  return { id, error, issues };
}

/** Saves and sends the request to the chosen agencies. */
export async function submitDraft(orgId: string, requestId: string | null, draft: RequestDraft, agencyIds: string[]): Promise<SaveResult> {
  const saved = await save(orgId, requestId, draft);
  if (!saved.id || !saved.draft) return { error: saved.error, issues: saved.issues };
  const blocking = submissionIssues(saved.draft);
  if (blocking.length > 0) return { id: saved.id, error: blocking.join(". ") };
  if (agencyIds.length === 0) return { id: saved.id, error: "Scegli almeno un'agenzia" };
  const { error } = await supabase.rpc("submit_request", { p_request: saved.id, p_agencies: agencyIds });
  if (error) {
    const message = error.message.startsWith("plan allows")
      ? `Il tuo piano permette di inviare la richiesta a massimo ${error.message.match(/\d+/)?.[0]} agenzie.`
      : errorMessage(error);
    return { id: saved.id, error: message };
  }
  return { id: saved.id };
}

/** Agencies the company can send a request to: connected ones first, then the marketplace. */
export async function fetchReachableAgencies(clientOrgId: string) {
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
  const connected = connections.flatMap((c) => (c.agency ? [{ ...c.agency, connected: true, headline: "", regions: [] as string[] }] : []));
  const ids = new Set(connected.map((a) => a.id));
  const marketplace = listed
    .filter((m) => !ids.has(m.organizations.id))
    .map((m) => ({ id: m.organizations.id, name: m.organizations.name, city: m.organizations.city, connected: false, headline: m.headline, regions: m.regions }));
  return [...connected, ...marketplace];
}

export type ReachableAgency = Awaited<ReturnType<typeof fetchReachableAgencies>>[number];

/** The company's drafts, newest first, for resuming them. */
export async function fetchDrafts(clientOrgId: string) {
  const { data, error } = await supabase
    .from("requests")
    .select("id, title, kind, event_type, updated_at, completeness")
    .eq("client_org_id", clientOrgId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}
