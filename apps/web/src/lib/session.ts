import "server-only";
import type { MemberRole, OrgType } from "@i-events/core";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";

export const ACTIVE_ORG_COOKIE = "ie_org";

export type MyOrg = { id: string; name: string; slug: string; type: OrgType; role: MemberRole };

export const AREA_BY_TYPE: Record<OrgType, string> = { agency: "/pro", client: "/client", supplier: "/supplier" };

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export const getMyOrgs = cache(async (): Promise<MyOrg[]> => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, organizations!inner(id, name, slug, type)")
    .eq("user_id", user.id)
    .order("created_at");
  if (error) throw error;
  return data.map((m) => ({ ...m.organizations, role: m.role }));
});

/** The organization the user is working in: the cookie choice if still valid, else the first one. */
export async function getActiveOrg(): Promise<MyOrg | null> {
  const orgs = await getMyOrgs();
  const chosen = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  return orgs.find((o) => o.id === chosen) ?? orgs[0] ?? null;
}

/** Guards an area: signed in, with an active organization of the expected type. */
export async function requireOrg(type: OrgType): Promise<MyOrg> {
  await requireUser();
  const orgs = await getMyOrgs();
  if (orgs.length === 0) redirect("/onboarding");
  const active = await getActiveOrg();
  if (active?.type === type) return active;
  const sameType = orgs.find((o) => o.type === type);
  if (sameType) return sameType;
  redirect(AREA_BY_TYPE[active!.type]);
}
