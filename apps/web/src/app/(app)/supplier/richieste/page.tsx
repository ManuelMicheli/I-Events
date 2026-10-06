import { Card, Empty } from "@/components/ui";
import { SUPPLIER_BUCKET_LABEL } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { eventDates, getSupplierRequests } from "@/lib/supplier-requests";
import { getServiceCategory, SUPPLIER_REQUEST_BUCKETS, supplierRequestBucket } from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Richieste" };

export default async function SupplierRequestsPage() {
  const org = await requireOrg("supplier");
  const requests = await getSupplierRequests(org.id);
  const toAnswer = requests.filter((r) => supplierRequestBucket(r) === "to_answer").length;

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Richieste</h1>
        <p className="text-muted">
          {requests.length === 0
            ? "Qui arrivano le richieste delle agenzie che lavorano con te."
            : toAnswer === 0
              ? "Hai risposto a tutte le richieste."
              : toAnswer === 1
                ? "1 richiesta aspetta la tua risposta."
                : `${toAnswer} richieste aspettano la tua risposta.`}
        </p>
      </div>
      {requests.length === 0 ? (
        <Empty>Nessuna richiesta per ora. Quando un&apos;agenzia ti sceglie per un evento, la richiesta compare qui e ti arriva una notifica.</Empty>
      ) : (
        SUPPLIER_REQUEST_BUCKETS.map((b) => {
          const rows = requests.filter((r) => supplierRequestBucket(r) === b);
          if (rows.length === 0) return null;
          return (
            <Card key={b} title={SUPPLIER_BUCKET_LABEL[b]} action={<span className="text-sm text-muted">{rows.length}</span>}>
              <ul className="divide-y divide-border">
                {rows.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 text-sm">
                    <span className="min-w-0">
                      <Link href={`/supplier/richieste/${r.id}`} className="font-medium underline">
                        {r.event_title}
                      </Link>
                      <span className="block text-muted">
                        {[r.agency_name, getServiceCategory(r.service_key)?.name.it ?? r.service_key, r.description].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="text-muted">{[eventDates(r), r.city].filter(Boolean).join(" · ")}</span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })
      )}
    </>
  );
}
