import { eventCountdown, formatTicketNumber, supplierRequestBucket, type EventStatus } from "@i-events/core";
import { supabase } from "./supabase";

type TicketFacts = { number: number; stage: { position: number } | null; status: EventStatus; start_date: string | null; end_date: string | null };

/** What the event's stub says: "#0142-2" and "TRA 3 G". */
export const eventTicket = (e: TicketFacts, today: string) => ({
  number: formatTicketNumber(e.number, e.stage?.position),
  countdown: eventCountdown(e, today),
});

/**
 * The agency's events, with how many supplier bookings are confirmed, what the event is sold for (the
 * latest approved quote, else the accepted proposal) and its planned supplier costs.
 */
export async function fetchAgencyEvents(orgId: string) {
  const { data, error } = await supabase
    .from("events")
    .select(
      `id, number, title, event_type, status, start_date, end_date, city, venue, stage:campaign_stages(position),
       client:organizations!events_client_org_id_fkey(name), event_bookings(status, planned_cost), proposal:proposals!events_proposal_id_fkey(total_amount), event_quotes(status, version, total_amount)`,
    )
    .eq("agency_org_id", orgId);
  if (error) throw error;
  return data.map((e) => {
    const live = e.event_bookings.filter((b) => b.status !== "cancelled");
    const approved = e.event_quotes.filter((q) => q.status === "approved").sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
    const sold = Number(approved?.total_amount ?? e.proposal?.total_amount ?? 0);
    const planned = live.reduce((sum, b) => sum + Number(b.planned_cost ?? 0), 0);
    return {
      ...e,
      counterpart: e.client.name,
      bookings: { total: live.length, confirmed: live.filter((b) => b.status === "confirmed").length },
      money: { sold, planned },
    };
  });
}

/** The company's events, with the status of the latest quote. */
export async function fetchClientEvents(orgId: string) {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, number, title, event_type, status, start_date, end_date, city, venue, stage:campaign_stages(position), agency:organizations!events_agency_org_id_fkey(name), event_quotes(version, status)",
    )
    .eq("client_org_id", orgId);
  if (error) throw error;
  return data.map((e) => ({
    ...e,
    counterpart: e.agency.name,
    latestQuote: [...e.event_quotes].sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0] ?? null,
  }));
}

/** The booking requests agencies sent to this supplier account, with the list they belong to. */
export async function fetchSupplierRequests(orgId: string) {
  const { data, error } = await supabase.rpc("supplier_bookings", { p_org: orgId });
  if (error) throw error;
  return data.map((r) => ({ ...r, bucket: supplierRequestBucket(r) }));
}

export type SupplierRequest = Awaited<ReturnType<typeof fetchSupplierRequests>>[number];

/** One event as the agency or the company sees it; null when it is not theirs. */
export async function fetchEvent(id: string, orgId: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data, error } = await supabase
    .from("events")
    .select(
      `id, number, title, event_type, status, start_date, end_date, city, venue, agency_org_id, client_org_id, request_id, proposal_id, stage:campaign_stages(position),
       client:organizations!events_client_org_id_fkey(name), agency:organizations!events_agency_org_id_fkey(name)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data || (data.agency_org_id !== orgId && data.client_org_id !== orgId)) return null;
  if (data.agency_org_id === orgId) {
    const { data: bookings, error: e } = await supabase
      .from("event_bookings")
      .select("id, service_key, description, status, contact:contacts(name, company)")
      .eq("event_id", id)
      .order("created_at");
    if (e) throw e;
    return { ...data, side: "agency" as const, bookings, latestQuote: null, quoteApproved: false, confirmedOn: null, written: 0, notChosen: 0 };
  }
  // The company's side: the quotes, when it chose the agency, whether it has written to it since
  // (the first of the next steps) and how many agencies were not chosen.
  const [{ data: quotes, error: e1 }, { data: proposal, error: e2 }, { data: others, error: e3 }] = await Promise.all([
    supabase.from("event_quotes").select("version, status").eq("event_id", id).order("version", { ascending: false }),
    data.proposal_id ? supabase.from("proposals").select("decided_at").eq("id", data.proposal_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    data.request_id ? supabase.from("proposals").select("id").eq("request_id", data.request_id).eq("status", "rejected") : Promise.resolve({ data: [], error: null }),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;
  const confirmedOn = proposal?.decided_at ?? null;
  let written = 0;
  if (data.proposal_id) {
    const { count, error: e4 } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("proposal_id", data.proposal_id)
      .eq("author_org_id", orgId)
      .gte("created_at", confirmedOn ?? "1970-01-01");
    if (e4) throw e4;
    written = count ?? 0;
  }
  return {
    ...data,
    side: "client" as const,
    bookings: [],
    latestQuote: quotes[0] ?? null,
    quoteApproved: quotes.some((q) => q.status === "approved"),
    confirmedOn,
    written,
    notChosen: others?.length ?? 0,
  };
}

export async function fetchNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, org_id, title, body, link, created_at, read_at, org:organizations(name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

export type AppNotification = Awaited<ReturnType<typeof fetchNotifications>>[number];
