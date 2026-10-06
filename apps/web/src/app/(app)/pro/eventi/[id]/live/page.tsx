import { LiveRunOfShow, type LiveItem } from "@/components/run-of-show/live-view";
import { loadRunOfShow } from "@/lib/run-of-show";
import { requireOrg } from "@/lib/session";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Giorno dell'evento" };

const stamp = () => new Date().toISOString();

export default async function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await requireOrg("agency");
  const { event, items, crew, bookings, members, days, defaultDay } = await loadRunOfShow(id, org.id);
  const live: LiveItem[] = items.map((i) => ({
    ...i,
    supplier: bookings.find((b) => b.id === i.booking_id)?.label ?? null,
    referent: members.find((m) => m.id === i.assignee_id)?.label ?? null,
  }));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/pro/eventi/${event.id}/scaletta`} className="text-sm text-muted underline">
            Modifica scaletta e arrivi
          </Link>
          <h1 className="text-2xl font-semibold">{event.title}</h1>
          <p className="text-sm text-muted">{[event.client.name, event.city, event.venue].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <LiveRunOfShow eventId={event.id} days={days.length > 0 ? days : [defaultDay]} items={live} crew={crew} fetchedAt={stamp()} />
    </>
  );
}
