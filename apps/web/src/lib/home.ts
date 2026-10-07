import "server-only";
import { getUser } from "./session";
import { createClient } from "./supabase/server";

/**
 * What the Homes read, with the same queries as the app's Home (apps/mobile/src/lib/requests.ts and
 * lib/data.ts), so the numbers match on every screen. The counting itself is agencyHome/clientHome
 * in @i-events/core.
 */

const REQUEST_FIELDS =
  "id, title, kind, event_type, status, start_date, end_date, guests, city, campaign, submitted_at";

/** The signed-in person's full name: the profile first, then what they typed at sign-up. */
export async function myName(): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const fallback =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
  return data?.full_name?.trim() || fallback?.trim() || null;
}

/** Every request sent to the agency, newest activity first, with the company that sent it. */
export async function agencyProposals(orgId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .select(
      `id, status, updated_at, request:requests!inner(${REQUEST_FIELDS}, client:organizations!requests_client_org_id_fkey(name))`,
    )
    .eq("agency_org_id", orgId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * The agency's events, with how many supplier bookings are confirmed, what the event is sold for (the
 * latest approved quote, else the accepted proposal) and its planned supplier costs.
 */
export async function agencyEvents(orgId: string) {
  const supabase = await createClient();
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
    const approved = e.event_quotes
      .filter((q) => q.status === "approved")
      .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
    const sold = Number(approved?.total_amount ?? e.proposal?.total_amount ?? 0);
    const planned = live.reduce((sum, b) => sum + Number(b.planned_cost ?? 0), 0);
    return {
      ...e,
      counterpart: e.client.name,
      bookings: {
        total: live.length,
        confirmed: live.filter((b) => b.status === "confirmed").length,
      },
      money: { sold, planned },
    };
  });
}

/** The agency's tasks still open that are late or due by `until`, soonest first. */
export async function dueTasks(orgId: string, until: string) {
  const supabase = await createClient();
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

/** The company's sent requests with the agencies they went to and where each proposal stands. */
export async function clientRequests(orgId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requests")
    .select(
      `${REQUEST_FIELDS}, updated_at, proposals(id, status, agency:organizations!proposals_agency_org_id_fkey(name))`,
    )
    .eq("client_org_id", orgId)
    .neq("status", "draft")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** The company's events, with the agency and the status of the latest quote. */
export async function clientEvents(orgId: string) {
  const supabase = await createClient();
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
