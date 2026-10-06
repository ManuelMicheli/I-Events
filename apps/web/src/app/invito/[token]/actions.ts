"use server";

import { dbErrorMessage } from "@/lib/labels";
import { ACTIVE_ORG_COOKIE, AREA_BY_TYPE, getMyOrgs } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AcceptState = { error?: string };

export async function acceptInvitation(_: AcceptState, form: FormData): Promise<AcceptState> {
  const token = String(form.get("token") ?? "");
  const kind = form.get("kind");
  const supabase = await createClient();

  let orgId: string;
  if (kind === "member") {
    const { data, error } = await supabase.rpc("accept_member_invitation", { p_token: token });
    if (error) return { error: error.code === "42501" ? "Questo invito è stato inviato a un'altra email." : dbErrorMessage(error) };
    orgId = data;
  } else {
    orgId = String(form.get("orgId") ?? "");
    const { error } = await supabase.rpc("accept_connection", { p_token: token, p_org: orgId });
    if (error) return { error: dbErrorMessage(error) };
  }

  const org = (await getMyOrgs()).find((o) => o.id === orgId);
  (await cookies()).set(ACTIVE_ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect(org ? AREA_BY_TYPE[org.type] : "/app");
}
