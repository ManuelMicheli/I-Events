"use server";

import { ORG_TYPES, slugify } from "@i-events/core";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { dbErrorMessage } from "./labels";
import { ACTIVE_ORG_COOKIE, AREA_BY_TYPE, getMyOrgs } from "./session";
import { createClient } from "./supabase/server";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const newOrg = z.object({
  type: z.enum(ORG_TYPES, { message: "Scegli il tipo di account" }),
  name: z.string().trim().min(2, "Almeno 2 caratteri").max(120),
  city: z.string().trim().max(120).optional(),
});

async function setActiveOrg(id: string) {
  (await cookies()).set(ACTIVE_ORG_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

export async function createOrganization(_: FormState, form: FormData): Promise<FormState> {
  const parsed = newOrg.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  const { type, name, city } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_organization", {
    p_type: type,
    p_name: name,
    p_slug: slugify(name) || "org",
    p_city: city || undefined,
  });
  if (error) return { error: dbErrorMessage(error) };
  await setActiveOrg(data);
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : AREA_BY_TYPE[type]);
}

export async function switchOrganization(form: FormData) {
  const id = String(form.get("orgId") ?? "");
  const org = (await getMyOrgs()).find((o) => o.id === id);
  if (!org) redirect("/app");
  await setActiveOrg(org.id);
  redirect(AREA_BY_TYPE[org.type]);
}
