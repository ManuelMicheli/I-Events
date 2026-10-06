import { TaskBoard } from "@/components/tasks/task-board";
import { Card, Empty } from "@/components/ui";
import { requireOrg, requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayInItaly } from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Attività" };

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

/** Everything someone has to do across the agency's events, as one timeline. */
export default async function TasksPage({ searchParams }: { searchParams: Promise<{ chi?: string }> }) {
  const org = await requireOrg("agency");
  const user = await requireUser();
  const everyone = (await searchParams).chi === "tutti";
  const supabase = await createClient();
  // Done tasks stay visible for a week, so a tick by mistake is easy to undo.
  const recent = daysAgo(7);

  let query = supabase
    .from("event_tasks")
    .select("id, event_id, title, notes, due_date, done_at, assignee_id, booking_id, event:events!inner(title, start_date, status)")
    .eq("org_id", org.id)
    .in("event.status", ["planning", "preparing", "live", "completed"])
    .or(`done_at.is.null,done_at.gte.${recent}`)
    .order("due_date", { nullsFirst: false })
    .limit(500);
  if (!everyone) query = query.eq("assignee_id", user.id);
  const [{ data: tasks, error }, { data: memberships, error: e2 }] = await Promise.all([
    query,
    supabase.from("memberships").select("user_id, profiles(full_name)").eq("org_id", org.id).order("created_at"),
  ]);
  if (error) throw error;
  if (e2) throw e2;

  const members = memberships.map((m) => ({ id: m.user_id, label: m.profiles?.full_name || "Collega senza nome" }));
  const events = Object.fromEntries(tasks.map((t) => [t.event_id, { title: t.event.title, start_date: t.event.start_date }]));
  const tab = (active: boolean) => `rounded-ui px-3 py-1.5 text-sm ${active ? "bg-surface font-medium" : "text-muted"}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Attività</h1>
        <nav className="flex gap-1" aria-label="Di chi">
          <Link href="/pro/attivita" className={tab(!everyone)} aria-current={!everyone ? "page" : undefined}>
            Le mie
          </Link>
          <Link href="/pro/attivita?chi=tutti" className={tab(everyone)} aria-current={everyone ? "page" : undefined}>
            Tutto il team
          </Link>
        </nav>
      </div>
      <Card>
        {tasks.length === 0 ? (
          <Empty>
            {everyone
              ? "Nessuna attività aperta negli eventi. Aggiungile dalla pagina di ogni evento."
              : "Non hai attività assegnate. Quando un collega ti assegna qualcosa, lo trovi qui e nelle notifiche."}
          </Empty>
        ) : (
          <TaskBoard tasks={tasks} today={todayInItaly()} members={members} events={events} />
        )}
      </Card>
    </>
  );
}
