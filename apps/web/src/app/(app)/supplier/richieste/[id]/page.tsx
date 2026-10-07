import { dayLabel } from "@/components/run-of-show/format";
import { ResponseForm } from "@/components/suppliers/response-form";
import { Card, Notice } from "@/components/ui";
import { BOOKING_STATUS_LABEL } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { eventDates, getSupplierRequests } from "@/lib/supplier-requests";
import { formatEuro, getServiceCategory, hhmm, supplierRequestBucket } from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Richiesta" };

export default async function SupplierRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const org = await requireOrg("supplier");
  const request = (await getSupplierRequests(org.id)).find((r) => r.id === id);
  if (!request) notFound();
  const bucket = supplierRequestBucket(request);
  const supabase = await createClient();
  const { data: schedule, error } =
    request.status === "confirmed" ? await supabase.rpc("supplier_booking_schedule", { p_booking: id }) : { data: [], error: null };
  if (error) throw error;
  const service = getServiceCategory(request.service_key)?.name.it ?? request.service_key;
  const days = [...new Set(schedule.map((s) => s.day))];

  // A form reads top to bottom: on wide screens it sits in a centred column (A11 in globals.css).
  return (
    <div className="flex flex-col gap-6 2xl:mx-auto 2xl:w-full 2xl:max-w-form">
      <div>
        <Link href="/supplier/richieste" className="text-sm text-muted underline">
          Richieste
        </Link>
        <h1 className="text-2xl font-semibold">{request.event_title}</h1>
        <p className="text-sm text-muted">{[request.agency_name, eventDates(request), request.city, request.venue].filter(Boolean).join(" · ")}</p>
      </div>

      <Card title="La richiesta" action={<span className="text-sm text-muted">{BOOKING_STATUS_LABEL[request.status]}</span>}>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Servizio</dt>
            <dd className="font-medium">{service}</dd>
          </div>
          {request.description && (
            <div>
              <dt className="text-muted">Dettagli</dt>
              <dd>{request.description}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted">Dove</dt>
            <dd>{[request.venue, request.city].filter(Boolean).join(", ") || "Da definire"}</dd>
          </div>
          <div>
            <dt className="text-muted">Quando</dt>
            <dd>{eventDates(request)}</dd>
          </div>
        </dl>
      </Card>

      {bucket === "closed" && (
        <Notice>
          {request.status === "cancelled" ? `${request.agency_name} ha annullato questa richiesta.` : "Questo evento è concluso o annullato."}
        </Notice>
      )}

      {request.status === "requested" && bucket !== "closed" && (
        <Card title="La tua risposta">
          {request.supplier_response && (
            <p className="mb-4 text-sm text-muted">
              Hai risposto che {request.supplier_response === "available" ? "sei disponibile" : "non sei disponibile"}
              {request.supplier_price !== null ? ` a ${formatEuro(request.supplier_price)}` : ""}. Puoi cambiare risposta finché l&apos;agenzia non
              conferma.
            </p>
          )}
          <ResponseForm
            bookingId={request.id}
            initial={{
              available: request.supplier_response === null ? null : request.supplier_response === "available",
              price: request.supplier_price,
              note: request.supplier_note,
            }}
          />
        </Card>
      )}

      {request.status === "confirmed" && (
        <Card title="I tuoi orari">
          {request.supplier_price !== null && (
            <p className="mb-3 text-sm text-muted">Confermato al prezzo che hai indicato: {formatEuro(request.supplier_price)}.</p>
          )}
          {schedule.length === 0 ? (
            <p className="text-sm text-muted">L&apos;agenzia non ha ancora preparato la scaletta. Gli orari compaiono qui appena li inserisce.</p>
          ) : (
            days.map((d) => (
              <section key={d} aria-label={dayLabel(d)} className="mb-3">
                {days.length > 1 && <h3 className="text-sm font-semibold first-letter:uppercase">{dayLabel(d)}</h3>}
                <ul className="flex flex-col gap-2 text-sm">
                  {schedule
                    .filter((s) => s.day === d)
                    .map((s, i) => (
                      <li key={i} className="flex gap-4">
                        <span className="w-24 shrink-0 font-mono tabular-nums">
                          {hhmm(s.starts_at)}
                          {s.ends_at && `–${hhmm(s.ends_at)}`}
                        </span>
                        <span className={s.kind === "call" ? "font-medium" : ""}>
                          {s.kind === "call" ? "Arrivo sul posto" : s.title}
                          {s.location && <span className="text-muted"> · {s.location}</span>}
                        </span>
                      </li>
                    ))}
                </ul>
              </section>
            ))
          )}
        </Card>
      )}
    </div>
  );
}
