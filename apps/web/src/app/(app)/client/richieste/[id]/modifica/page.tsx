import { RequestWizard } from "@/components/wizard/request-wizard";
import { loadRequest, reachableAgencies } from "@/lib/requests";
import { requireOrg } from "@/lib/session";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = { title: "Modifica richiesta" };

export default async function EditRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await requireOrg("client");
  const request = await loadRequest(id);
  if (!request || request.clientOrgId !== org.id) notFound();
  if (request.status !== "draft") redirect(`/client/richieste/${id}`);
  const agencies = await reachableAgencies(org.id);
  return (
    <>
      <h1 className="text-2xl font-semibold">{request.draft.basics.title}</h1>
      <RequestWizard requestId={id} initial={request.draft} agencies={agencies} />
    </>
  );
}
