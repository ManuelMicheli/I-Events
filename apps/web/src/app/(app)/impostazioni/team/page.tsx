import { InviteForm } from "@/components/invite-form";
import { Card, Empty } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/labels";
import { getActiveOrg } from "@/lib/session";
import { cancelMemberInvitation, inviteMember } from "@/lib/settings-actions";
import { createClient } from "@/lib/supabase/server";
import { ROLES_BY_ORG_TYPE } from "@i-events/core";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const org = (await getActiveOrg())!;
  const canInvite = org.role === "owner" || org.role === "admin";
  const supabase = await createClient();
  const [{ data: members, error }, { data: invites }] = await Promise.all([
    supabase.from("memberships").select("user_id, role, profiles(full_name)").eq("org_id", org.id).order("created_at"),
    canInvite
      ? supabase.from("member_invitations").select("id, email, role, expires_at").eq("org_id", org.id).is("accepted_at", null)
      : Promise.resolve({ data: [] }),
  ]);
  if (error) throw error;

  const roles = ROLES_BY_ORG_TYPE[org.type].filter((r) => r !== "owner").map((r) => ({ value: r, label: ROLE_LABEL[r] }));

  return (
    <>
      <h1 className="text-2xl font-semibold">Team di {org.name}</h1>
      <Card title="Persone">
        <ul className="divide-y divide-border text-sm">
          {members.map((m) => (
            <li key={m.user_id} className="flex justify-between py-2">
              <span>{m.profiles?.full_name || "Senza nome"}</span>
              <span className="text-muted">{ROLE_LABEL[m.role]}</span>
            </li>
          ))}
        </ul>
      </Card>
      {canInvite && (
        <Card title="Invita una persona">
          <InviteForm action={inviteMember} roles={roles} submitLabel="Crea invito" />
          <h3 className="mt-6 mb-2 text-sm font-medium">Inviti in attesa</h3>
          {invites && invites.length > 0 ? (
            <ul className="divide-y divide-border text-sm">
              {invites.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2">
                  <span>
                    {i.email} <span className="text-muted">· {ROLE_LABEL[i.role]}</span>
                  </span>
                  <form action={cancelMemberInvitation}>
                    <input type="hidden" name="id" value={i.id} />
                    <button className="text-muted underline">Annulla</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nessun invito in attesa.</Empty>
          )}
        </Card>
      )}
    </>
  );
}
