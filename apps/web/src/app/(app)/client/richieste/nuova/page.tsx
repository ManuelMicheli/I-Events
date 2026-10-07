import { EMPTY_DRAFT, RequestWizard } from "@/components/wizard/request-wizard";
import { reachableAgencies } from "@/lib/requests";
import { requireOrg } from "@/lib/session";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nuova richiesta" };

export default async function NewRequestPage({ searchParams }: { searchParams: Promise<{ agenzia?: string }> }) {
  const org = await requireOrg("client");
  const { agenzia } = await searchParams;
  const agencies = await reachableAgencies(org.id);
  const chosen = agencies.find((a) => a.id === agenzia);
  // A form reads top to bottom: on wide screens it sits in a centred column (A11 in globals.css).
  return (
    <div className="flex flex-col gap-6 2xl:mx-auto 2xl:w-full 2xl:max-w-form">
      <h1 className="text-2xl font-semibold">Nuova richiesta</h1>
      {chosen && <p className="text-muted">La richiesta andrà a {chosen.name}: puoi aggiungere altre agenzie per confrontare le proposte.</p>}
      <RequestWizard requestId={null} initial={EMPTY_DRAFT} agencies={agencies} initialAgencies={chosen ? [chosen.id] : undefined} />
    </div>
  );
}
