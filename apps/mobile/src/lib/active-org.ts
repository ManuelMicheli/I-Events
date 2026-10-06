import type { MemberRole, OrgType } from "@i-events/core";

export type MyOrgType = OrgType;
export type MyOrg = { id: string; name: string; slug: string; type: OrgType; role: MemberRole };

/** The organization to work in: the one chosen last if the person still belongs to it, else the first. */
export function pickActiveOrg(orgs: readonly MyOrg[], savedId: string | null): MyOrg | null {
  return orgs.find((o) => o.id === savedId) ?? orgs[0] ?? null;
}
