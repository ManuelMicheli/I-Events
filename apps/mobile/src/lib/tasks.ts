import { supabase } from "./supabase";

/** Events whose tasks still matter: drafts and cancelled events are left out. */
const ACTIVE_EVENTS = ["planning", "preparing", "live", "completed"];

/**
 * The agency's tasks across its events, the open ones and those done in the last week (so a tick by
 * mistake is easy to undo). Only the given person's when assignee is set.
 */
export async function fetchTasks(orgId: string, assignee: string | null) {
  const recent = new Date(Date.now() - 7 * 86_400_000).toISOString();
  let query = supabase
    .from("event_tasks")
    .select("id, event_id, title, notes, due_date, done_at, assignee_id, event:events!inner(title, start_date, status)")
    .eq("org_id", orgId)
    .in("event.status", ACTIVE_EVENTS)
    .or(`done_at.is.null,done_at.gte.${recent}`)
    .order("due_date", { nullsFirst: false })
    .limit(500);
  if (assignee) query = query.eq("assignee_id", assignee);
  const [{ data: tasks, error }, { data: members, error: e2 }] = await Promise.all([
    query,
    supabase.from("memberships").select("user_id, profiles(full_name)").eq("org_id", orgId),
  ]);
  if (error) throw error;
  if (e2) throw e2;
  const names = new Map(members.map((m) => [m.user_id, m.profiles?.full_name?.trim() || null]));
  return tasks.map((t) => ({ ...t, assignee: t.assignee_id ? (names.get(t.assignee_id) ?? null) : null }));
}

export type AgencyTask = Awaited<ReturnType<typeof fetchTasks>>[number];
