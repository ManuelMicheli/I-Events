import { MarketplaceResults, MarketplaceSearchForm, readFilters } from "@/components/marketplace/search";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Trova agenzie" };

export default async function FindAgenciesPage({ searchParams }: { searchParams: Promise<{ q?: string; servizio?: string; zona?: string }> }) {
  const org = await requireOrg("client");
  const filters = readFilters(await searchParams);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_marketplace", {
    p_type: "agency",
    p_from_org: org.id,
    p_query: filters.q,
    p_service: filters.servizio,
    p_area: filters.zona,
  });
  if (error) throw error;
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Trova agenzie</h1>
        <p className="text-muted">Agenzie con un profilo pubblico su I-Events. Puoi mandare loro una richiesta anche se non vi conoscete ancora.</p>
      </div>
      <MarketplaceSearchForm filters={filters} placeholder="Nome, evento o parola chiave" />
      <MarketplaceResults
        results={data}
        filters={filters}
        hrefBase="/client/agenzie"
        badge={(r) => (r.connected ? <span className="rounded-ui border border-border px-1.5 text-xs">Già collegata</span> : null)}
        empty="Nessuna agenzia trovata con questi filtri."
      />
    </>
  );
}
