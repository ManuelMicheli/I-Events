import { EMPTY_DRAFT, RequestWizard } from "@/components/wizard/request-wizard";
import { reachableAgencies } from "@/lib/requests";
import { requireOrg } from "@/lib/session";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nuova richiesta" };

export default async function NewRequestPage() {
  const org = await requireOrg("client");
  const agencies = await reachableAgencies(org.id);
  return (
    <>
      <h1 className="text-2xl font-semibold">Nuova richiesta</h1>
      <RequestWizard requestId={null} initial={EMPTY_DRAFT} agencies={agencies} />
    </>
  );
}
