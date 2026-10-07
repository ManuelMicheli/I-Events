import { Attachments } from "@/components/attachments/attachments";
import { RequestWizard } from "@/components/wizard/request-wizard";
import { isWizardStep } from "@/components/wizard/steps";
import { loadRequest, reachableAgencies } from "@/lib/requests";
import { requireOrg } from "@/lib/session";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = { title: "Modifica richiesta" };

export default async function EditRequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ passo?: string }> }) {
  const [{ id }, { passo }] = await Promise.all([params, searchParams]);
  const org = await requireOrg("client");
  const request = await loadRequest(id);
  if (!request || request.clientOrgId !== org.id) notFound();
  if (request.status !== "draft") redirect(`/client/richieste/${id}`);
  const agencies = await reachableAgencies(org.id);
  // A form reads top to bottom: on wide screens it sits in a centred column (A11 in globals.css).
  return (
    <div className="flex flex-col gap-6 2xl:mx-auto 2xl:w-full 2xl:max-w-form">
      <h1 className="text-2xl font-semibold">{request.draft.basics.title}</h1>
      <RequestWizard
        requestId={id}
        initial={request.draft}
        agencies={agencies}
        initialStep={isWizardStep(passo) ? passo : undefined}
        attachments={
          <Attachments
            requestId={id}
            canWrite
            path={`/client/richieste/${id}/modifica`}
            title="Allegati per le agenzie"
            emptyText="Aggiungi planimetrie, moodboard, brief o qualsiasi documento utile."
          />
        }
      />
    </div>
  );
}
