import { supplierRequestBucket } from "@i-events/core";
import { supabase } from "./supabase";

/**
 * The agency's events, with how many supplier bookings are confirmed, what the event is sold for (the
 * latest approved quote, else the accepted proposal) and its planned supplier costs.
 */
export async function fetchAgencyEvents(orgId: string) {
  const { data, error } = await supabase
    .from("events")
    .select(
      `id, title, status, start_date, end_date, city, venue, client:organizations!events_client_org_id_fkey(name),
       event_bookings(status, planned_cost), proposal:proposals!events_proposal_id_fkey(total_amount), event_quotes(status, version, total_amount)`,
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
      "id, title, status, start_date, end_date, city, venue, agency:organizations!events_agency_org_id_fkey(name), event_quotes(version, status)",
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
      `id, title, status, start_date, end_date, city, venue, agency_org_id, client_org_id,
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
    return { ...data, side: "agency" as const, bookings, latestQuote: null };
  }
  const { data: quotes, error: e } = await supabase
    .from("event_quotes")
    .select("version, status")
    .eq("event_id", id)
    .order("version", { ascending: false })
    .limit(1);
  if (e) throw e;
  return { ...data, side: "client" as const, bookings: [], latestQuote: quotes[0] ?? null };
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
