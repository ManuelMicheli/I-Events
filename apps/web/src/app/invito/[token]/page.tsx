import { ButtonLink, Notice } from "@/components/ui";
import { ORG_TYPE_LABEL, ROLE_LABEL } from "@/lib/labels";
import { getMyOrgs, getUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { AcceptForm } from "./accept-form";

export const metadata: Metadata = { title: "Invito" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getUser();
  const supabase = await createClient();
  const { data } = user ? await supabase.rpc("preview_invitation", { p_token: token }) : { data: null };
  const invite = data?.[0];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Sei stato invitato su I-Events</h1>
      {!user ? (
        <>
          <p className="text-muted">Accedi o crea un account per vedere e accettare l&apos;invito.</p>
          <ButtonLink href={`/login?next=${encodeURIComponent(`/invito/${token}`)}`}>Accedi o registrati</ButtonLink>
        </>
      ) : !invite || !invite.valid ? (
        <Notice tone="error">Questo invito non è più valido. Chiedi a chi te l&apos;ha inviato di crearne uno nuovo.</Notice>
      ) : invite.kind === "member" ? (
        <>
          <p>
            <strong>{invite.org_name}</strong> ti invita nel suo team come <strong>{ROLE_LABEL[invite.role!]}</strong>.
          </p>
          <AcceptForm token={token} kind="member" orgs={[]} />
        </>
      ) : (
        <ConnectionInvite token={token} orgName={invite.org_name} orgType={invite.org_type} />
      )}
    </main>
  );
}

async function ConnectionInvite({ token, orgName, orgType }: { token: string; orgName: string; orgType: "agency" | "client" | "supplier" }) {
  const wanted = orgType === "agency" ? "client" : "agency";
  const orgs = (await getMyOrgs()).filter((o) => o.type === wanted && (o.role === "owner" || o.role === "admin"));
  return (
    <>
      <p>
        L&apos;{ORG_TYPE_LABEL[orgType].toLowerCase()} <strong>{orgName}</strong> vuole collegarsi con te per lavorare insieme su
        I-Events.
      </p>
      {orgs.length === 0 ? (
        <>
          <Notice>
            Per accettare ti serve un account {wanted === "client" ? "azienda" : "agenzia"} di cui sei titolare o amministratore.
          </Notice>
          <ButtonLink href={`/onboarding?next=${encodeURIComponent(`/invito/${token}`)}`}>
            Crea l&apos;account {wanted === "client" ? "azienda" : "agenzia"}
          </ButtonLink>
        </>
      ) : (
        <AcceptForm token={token} kind="connection" orgs={orgs.map((o) => ({ id: o.id, name: o.name }))} />
      )}
    </>
  );
}
