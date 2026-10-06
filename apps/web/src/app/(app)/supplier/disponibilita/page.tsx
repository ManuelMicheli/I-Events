import { AvailabilityCalendar, type DayState } from "@/components/profiles/availability";
import { UnavailabilityForm } from "@/components/profiles/unavailability-form";
import { Button, Card, Empty } from "@/components/ui";
import { removeUnavailability } from "@/lib/profile-actions";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { addDays, rangeLabel, todayInItaly } from "@i-events/core";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Disponibilità" };

const MONTHS = 6;

/** The supplier's calendar: confirmed events and the days it marked off, which agencies see as busy. */
export default async function AvailabilityPage() {
  const org = await requireOrg("supplier");
  const today = todayInItaly();
  const from = `${today.slice(0, 7)}-01`;
  const supabase = await createClient();
  const [busyRes, periodsRes] = await Promise.all([
    supabase.rpc("supplier_busy_days", { p_supplier: org.id, p_from: from, p_to: addDays(from, MONTHS * 31) }),
    supabase.from("supplier_unavailability").select("id, starts_on, ends_on, note").eq("org_id", org.id).gte("ends_on", today).order("starts_on"),
  ]);
  if (busyRes.error) throw busyRes.error;
  if (periodsRes.error) throw periodsRes.error;
  const days = new Map<string, DayState>(busyRes.data.map((d) => [d.day, d.booked ? "booked" : "off"]));
  const canEdit = ["owner", "admin", "manager"].includes(org.role);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Disponibilità</h1>
        <p className="text-muted">
          Le agenzie vedono i giorni in cui sei già impegnato, senza sapere per chi, e non ti chiedono date occupate. I giorni degli eventi confermati
          si segnano da soli.
        </p>
      </div>

      <Card>
        <AvailabilityCalendar from={from} months={MONTHS} days={days} today={today} />
      </Card>

      {canEdit && (
        <Card title="Segna giorni non disponibili">
          <UnavailabilityForm today={today} />
        </Card>
      )}

      <Card title="Periodi non disponibili">
        {periodsRes.data.length === 0 ? (
          <Empty>Nessun periodo segnato.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {periodsRes.data.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="font-medium">{rangeLabel({ from: p.starts_on, to: p.ends_on })}</span>
                  {p.note && <span className="ml-2 text-muted">{p.note}</span>}
                </span>
                {canEdit && (
                  <form action={removeUnavailability}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button type="submit" variant="secondary" aria-label={`Torna disponibile ${rangeLabel({ from: p.starts_on, to: p.ends_on })}`}>
                      Torna disponibile
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
