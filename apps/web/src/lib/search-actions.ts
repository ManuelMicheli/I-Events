"use server";

import { getActiveOrg } from "./session";
import { createClient } from "./supabase/server";

export type SearchHit = { href: string; title: string; meta: string; group: "Richieste" | "Eventi" | "Rubrica" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });
const day = (d: string | null) => (d ? dateFmt.format(new Date(`${d}T12:00:00`)) : "Data da definire");

/** The ⌘K search: requests, events and (for agencies) contacts of the active organisation whose name matches. */
export async function searchApp(query: string): Promise<SearchHit[]> {
  const q = query.trim().slice(0, 60);
  const org = await getActiveOrg();
  if (q.length < 2 || !org) return [];
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const supabase = await createClient();

  if (org.type === "agency") {
    const [proposals, events, contacts] = await Promise.all([
      supabase
        .from("proposals")
        .select("id, request:requests!inner(title, start_date, client:organizations!requests_client_org_id_fkey(name))")
        .eq("agency_org_id", org.id)
        .ilike("request.title", pattern)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase.from("events").select("id, title, start_date").eq("agency_org_id", org.id).ilike("title", pattern).order("start_date", { ascending: false }).limit(5),
      supabase.from("contacts").select("id, name, company, city").eq("org_id", org.id).or(`name.ilike.${quote(pattern)},company.ilike.${quote(pattern)}`).order("name").limit(5),
    ]);
    return [
      ...(proposals.data ?? []).map((p) => ({ group: "Richieste" as const, href: `/pro/richieste/${p.id}`, title: p.request.title, meta: `${p.request.client.name} · ${day(p.request.start_date)}` })),
      ...(events.data ?? []).map((e) => ({ group: "Eventi" as const, href: `/pro/eventi/${e.id}`, title: e.title, meta: day(e.start_date) })),
      ...(contacts.data ?? []).map((c) => ({ group: "Rubrica" as const, href: `/pro/rubrica/${c.id}`, title: c.name, meta: [c.company, c.city].filter(Boolean).join(" · ") || "Contatto" })),
    ];
  }
  if (org.type === "client") {
    const [requests, events] = await Promise.all([
      supabase.from("requests").select("id, title, start_date").eq("client_org_id", org.id).ilike("title", pattern).order("updated_at", { ascending: false }).limit(5),
      supabase.from("events").select("id, title, start_date").eq("client_org_id", org.id).ilike("title", pattern).order("start_date", { ascending: false }).limit(5),
    ]);
    return [
      ...(requests.data ?? []).map((r) => ({ group: "Richieste" as const, href: `/client/richieste/${r.id}`, title: r.title, meta: day(r.start_date) })),
      ...(events.data ?? []).map((e) => ({ group: "Eventi" as const, href: `/client/eventi/${e.id}`, title: e.title, meta: day(e.start_date) })),
    ];
  }
  return [];
}

/** A value inside a PostgREST or() filter, quoted so commas and brackets in it stay text. */
const quote = (v: string) => `"${v.replace(/"/g, '\\"')}"`;
