import "server-only";
import { eventCountdown, todayInItaly, type EventStatus, type EventType } from "@i-events/core";
import type { MyOrg } from "./session";
import { createClient } from "./supabase/server";

export type NextEvent = {
  href: string;
  title: string;
  type: EventType | null;
  countdown: { label: string; live: boolean };
  /** The agency's tasks for it: how many are done out of how many. */
  tasks: { done: number; total: number } | null;
};

/**
 * The event in the sidebar's bottom card (Wharf reference, block 1): the first one on or after today that is
 * still on, for the agency with how far its tasks are. Suppliers have none.
 */
export async function nextEvent(org: MyOrg): Promise<NextEvent | null> {
  if (org.type === "supplier") return null;
  const supabase = await createClient();
  const today = todayInItaly();
  const side = org.type === "agency" ? "agency_org_id" : "client_org_id";
  const { data } = await supabase
    .from("events")
    .select("id, title, event_type, status, start_date, end_date, event_tasks(done_at)")
    .eq(side, org.id)
    .in("status", ["planning", "preparing", "live"] satisfies EventStatus[])
    .or(`end_date.gte.${today},and(end_date.is.null,start_date.gte.${today})`)
    .order("start_date")
    .limit(1);
  const e = data?.[0];
  if (!e) return null;
  const countdown = eventCountdown(e, today);
  if (!countdown) return null;
  const tasks = e.event_tasks ?? [];
  return {
    href: `/${org.type === "agency" ? "pro" : "client"}/eventi/${e.id}`,
    title: e.title,
    type: e.event_type,
    countdown,
    tasks: org.type === "agency" && tasks.length > 0 ? { done: tasks.filter((t) => t.done_at).length, total: tasks.length } : null,
  };
}
