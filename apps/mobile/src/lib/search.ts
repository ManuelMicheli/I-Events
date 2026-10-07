import type { OrgType } from "@i-events/core";
import type { Href } from "expo-router";
import { dateRange } from "./format";
import { supabase } from "./supabase";

export type SearchHit = { href: Href; title: string; meta: string; group: "Richieste" | "Eventi" | "Rubrica" };

const day = (d: string | null) => dateRange(d, null) ?? "Data da definire";

/** A value inside a PostgREST or() filter, quoted so commas and brackets in it stay text. */
const quote = (v: string) => `"${v.replace(/"/g, '\\"')}"`;

/**
 * Search, as the website's ⌘K: requests, events and (for agencies) contacts of the active organisation
 * whose name holds the words, five of each, from two letters on. Suppliers search sections only.
 */
export async function searchApp(org: { id: string; type: OrgType }, query: string): Promise<SearchHit[]> {
  const q = query.trim().slice(0, 60);
  if (q.length < 2) return [];
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

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
    const failed = proposals.error ?? events.error ?? contacts.error;
    if (failed) throw failed;
    return [
      ...(proposals.data ?? []).map((p) => ({
        group: "Richieste" as const,
        href: { pathname: "/proposta/[id]", params: { id: p.id } } as Href,
        title: p.request.title,
        meta: `${p.request.client.name} · ${day(p.request.start_date)}`,
      })),
      ...(events.data ?? []).map((e) => ({ group: "Eventi" as const, href: { pathname: "/evento/[id]", params: { id: e.id } } as Href, title: e.title, meta: day(e.start_date) })),
      ...(contacts.data ?? []).map((c) => ({
        group: "Rubrica" as const,
        href: { pathname: "/rubrica/[id]", params: { id: c.id } } as Href,
        title: c.name,
        meta: [c.company, c.city].filter(Boolean).join(" · ") || "Contatto",
      })),
    ];
  }
  if (org.type === "client") {
    const [requests, events] = await Promise.all([
      supabase.from("requests").select("id, title, start_date").eq("client_org_id", org.id).ilike("title", pattern).order("updated_at", { ascending: false }).limit(5),
      supabase.from("events").select("id, title, start_date").eq("client_org_id", org.id).ilike("title", pattern).order("start_date", { ascending: false }).limit(5),
    ]);
    const failed = requests.error ?? events.error;
    if (failed) throw failed;
    return [
      ...(requests.data ?? []).map((r) => ({
        group: "Richieste" as const,
        href: { pathname: "/richiesta-azienda/[id]", params: { id: r.id } } as Href,
        title: r.title,
        meta: day(r.start_date),
      })),
      ...(events.data ?? []).map((e) => ({ group: "Eventi" as const, href: { pathname: "/evento/[id]", params: { id: e.id } } as Href, title: e.title, meta: day(e.start_date) })),
    ];
  }
  return [];
}
