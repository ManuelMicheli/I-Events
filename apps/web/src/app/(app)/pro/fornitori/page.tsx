import { MarketplaceResults, MarketplaceSearchForm, readFilters } from "@/components/marketplace/search";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Trova fornitori" };

export default async function FindSuppliersPage({ searchParams }: { searchParams: Promise<{ q?: string; servizio?: string; zona?: string; data?: string }> }) {
  const org = await requireOrg("agency");
  const filters = readFilters(await searchParams);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_marketplace", {
    p_type: "supplier",
    p_from_org: org.id,
    p_query: filters.q,
    p_service: filters.servizio,
    p_area: filters.zona,
    p_date: filters.data || undefined,
  });
  if (error) throw error;
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Trova fornitori</h1>
        <p className="text-muted">
          Fornitori con un profilo pubblico su I-Events. Aggiungili alla rubrica e le tue richieste arrivano direttamente nel loro account.
        </p>
      </div>
      <MarketplaceSearchForm filters={filters} placeholder="Nome, specialità o parola" withDate />
      <MarketplaceResults
        results={data}
        filters={filters}
        hrefBase="/pro/fornitori"
        badge={(r) =>
          r.contact_id ? (
            <Link href={`/pro/rubrica/${r.contact_id}`} className="rounded-ui border border-border px-1.5 text-xs">
              In rubrica
            </Link>
          ) : null
        }
        empty={filters.data ? "Nessun fornitore libero in quella data con questi filtri." : "Nessun fornitore trovato con questi filtri."}
      />
    </>
  );
}
