import { Button, Card, Empty } from "@/components/ui";
import { markAllNotificationsRead, setEmailNotifications } from "@/lib/notification-actions";
import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Notifiche" };

const timeFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function NotificationsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: items, error }, { data: profile }] = await Promise.all([
    supabase.from("notifications").select("id, title, body, created_at, read_at, org:organizations(name)").order("created_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("email_notifications").eq("id", user.id).single(),
  ]);
  if (error) throw error;
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Notifiche</h1>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="secondary">
              Segna tutte come lette
            </Button>
          </form>
        )}
      </div>
      {/* From 1920 px the email setting sits beside the list (A11 in globals.css). */}
      <div className="flex flex-col gap-6 3xl:grid 3xl:grid-cols-[minmax(0,1fr)_26rem] 3xl:items-start 4xl:grid-cols-[minmax(0,1fr)_30rem]">
      <Card>
        {items.length === 0 ? (
          <Empty>Nessuna notifica. Qui trovi nuove richieste, proposte, messaggi e decisioni.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => (
              <li key={n.id}>
                {/* A plain link on purpose: opening a notification marks it read, so it must not be prefetched. */}
                <a href={`/notifiche/${n.id}`} className="flex items-start justify-between gap-4 py-3 text-sm">
                  <span>
                    <span className={n.read_at ? "" : "font-semibold"}>{n.title}</span>
                    {!n.read_at && <span className="ml-2 inline-flex items-center gap-1 text-xs text-accent-ink"><span aria-hidden className="h-2 w-2 rounded-full bg-accent" />nuova</span>}
                    {n.body && <span className="block text-muted">{n.body}</span>}
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted">
                    {timeFmt.format(new Date(n.created_at))}
                    {n.org?.name && <span className="block">{n.org.name}</span>}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Email">
        <form action={setEmailNotifications} className="flex flex-col items-start gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="email" defaultChecked={profile?.email_notifications ?? true} className="mt-1 shrink-0" />
            <span>
              <span className="block font-medium">Ricevi un riepilogo via email</span>
              <span className="block text-muted">Solo delle notifiche non lette.</span>
            </span>
          </label>
          <Button type="submit" variant="secondary">
            Salva
          </Button>
        </form>
      </Card>
      </div>
    </>
  );
}
