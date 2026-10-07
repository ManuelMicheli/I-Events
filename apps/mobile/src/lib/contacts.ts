import { getServiceCategory } from "@i-events/core";
import type { Tables } from "@i-events/db";
import { supabase } from "./supabase";

const LIST_FIELDS = "id, name, company, city, phone, email, services, rating, supplier_org_id";

/** The agency's address book, alphabetical, narrowed by a search term and a service. */
export async function fetchContacts(orgId: string, search: string, service: string | null) {
  let query = supabase.from("contacts").select(LIST_FIELDS, { count: "exact" }).eq("org_id", orgId).order("name").limit(200);
  const term = search
    .trim()
    .replace(/[%,()]/g, " ")
    .slice(0, 80);
  if (term) query = query.or(`name.ilike.%${term}%,company.ilike.%${term}%,email.ilike.%${term}%,city.ilike.%${term}%`);
  if (service && getServiceCategory(service)) query = query.contains("services", [service]);
  const { data, count, error } = await query;
  if (error) throw error;
  return { contacts: data, count: count ?? data.length };
}

export type ContactItem = Awaited<ReturnType<typeof fetchContacts>>["contacts"][number];

/** One contact of the agency; null when it is not theirs. */
export async function fetchContact(id: string, orgId: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data, error } = await supabase.from("contacts").select("*").eq("id", id).eq("org_id", orgId).maybeSingle();
  if (error) throw error;
  return data;
}

export type Contact = NonNullable<Awaited<ReturnType<typeof fetchContact>>>;

export type ContactRow = Pick<
  Tables<"contacts">,
  "name" | "company" | "role_title" | "email" | "phone" | "website" | "city" | "notes" | "services" | "rating"
>;

/** Creates (id null) or updates a contact and returns its id. */
export async function saveContact(orgId: string, userId: string, id: string | null, row: ContactRow) {
  const { data, error } = id
    ? await supabase.from("contacts").update(row).eq("id", id).eq("org_id", orgId).select("id").single()
    : await supabase
        .from("contacts")
        .insert({ ...row, org_id: orgId, source: "manual", created_by: userId })
        .select("id")
        .single();
  if (error) throw error;
  return data.id;
}

export async function deleteContact(id: string, orgId: string) {
  const { error } = await supabase.from("contacts").delete().eq("id", id).eq("org_id", orgId);
  if (error) throw error;
}
