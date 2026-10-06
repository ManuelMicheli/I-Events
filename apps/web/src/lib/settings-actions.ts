"use server";

import { connectionInviteSchema, memberInviteSchema, normalizePhone, SERVICE_KEYS } from "@i-events/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "./env";
import { dbErrorMessage } from "./labels";
import { getActiveOrg } from "./session";
import { createClient } from "./supabase/server";

export type InviteState = { error?: string; link?: string };

const inviteLink = (token: string) => `${env.siteUrl}/invito/${token}`;

export async function inviteMember(_: InviteState, form: FormData): Promise<InviteState> {
  const org = await getActiveOrg();
  if (!org) return { error: "Nessuna organizzazione attiva." };
  const parsed = memberInviteSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("invite_member", {
    p_org: org.id,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/impostazioni/team");
  return { link: inviteLink(data) };
}

export async function inviteConnection(_: InviteState, form: FormData): Promise<InviteState> {
  const org = await getActiveOrg();
  if (!org) return { error: "Nessuna organizzazione attiva." };
  const parsed = connectionInviteSchema.safeParse({
    email: form.get("email"),
    message: form.get("message") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("invite_connection", {
    p_from_org: org.id,
    p_email: parsed.data.email,
    p_message: parsed.data.message,
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/impostazioni/collegamenti");
  return { link: inviteLink(data) };
}

export async function revokeConnection(form: FormData) {
  const id = z.uuid().parse(form.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("connections").update({ status: "revoked" }).eq("id", id);
  if (error) throw error;
  revalidatePath("/impostazioni/collegamenti");
}

export async function cancelMemberInvitation(form: FormData) {
  const id = z.uuid().parse(form.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("member_invitations").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/impostazioni/team");
}

export type ProfileState = { error?: string; saved?: boolean };

const profileSchema = z.object({
  headline: z.string().trim().max(160),
  description: z.string().trim().max(4000),
  services: z.array(z.enum(SERVICE_KEYS as [string, ...string[]])),
  regions: z.array(z.string().trim().min(1).max(60)).max(30),
  website: z.union([z.url(), z.literal("")]),
  email: z.union([z.email("Email non valida"), z.literal("")]),
  phone: z.string().trim().max(40),
  isListed: z.boolean(),
});

export async function saveMarketplaceProfile(_: ProfileState, form: FormData): Promise<ProfileState> {
  const org = await getActiveOrg();
  if (!org || org.type === "client") return { error: "Profilo non disponibile." };
  const parsed = profileSchema.safeParse({
    headline: form.get("headline") ?? "",
    description: form.get("description") ?? "",
    services: form.getAll("services"),
    regions: String(form.get("regions") ?? "").split(",").map((r) => r.trim()).filter(Boolean),
    website: form.get("website") ?? "",
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    phone: String(form.get("phone") ?? ""),
    isListed: form.get("isListed") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const { headline, description, services, regions, website, email, isListed } = parsed.data;
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;
  if (parsed.data.phone && !phone) return { error: "Telefono non valido: scrivilo con il prefisso, ad esempio +39 333 1234567." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("marketplace_profiles")
    .update({ headline, description, services, regions, website: website || null, email: email || null, phone, is_listed: isListed })
    .eq("org_id", org.id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/supplier");
  revalidatePath("/pro/profilo");
  return { saved: true };
}
