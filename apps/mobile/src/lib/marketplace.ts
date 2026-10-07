import { addDays, dayRanges, getServiceCategory, PORTFOLIO_BUCKET, todayInItaly } from "@i-events/core";
import { env } from "./env";
import { supabase } from "./supabase";

/**
 * The marketplace, as on the website: companies find agencies, agencies find suppliers. Same RPCs
 * (search_marketplace, marketplace_profile) and the same extras on a profile: portfolio, reviews
 * and, for a supplier, the busy days of the next three months.
 */

export type MarketplaceKind = "agency" | "supplier";
export type MarketplaceFilters = { q: string; service: string | null; area: string; date: string | undefined };
export const NO_FILTERS: MarketplaceFilters = { q: "", service: null, area: "", date: undefined };

export async function searchMarketplace(kind: MarketplaceKind, fromOrg: string, f: MarketplaceFilters) {
  const { data, error } = await supabase.rpc("search_marketplace", {
    p_type: kind,
    p_from_org: fromOrg,
    p_query: f.q.trim().slice(0, 80),
    p_service: f.service && getServiceCategory(f.service) ? f.service : "",
    p_area: f.area.trim().slice(0, 60),
    p_date: kind === "supplier" ? f.date : undefined,
  });
  if (error) throw error;
  return data.map((r) => ({ ...r, logo_url: (r.logo_url as string | null | undefined) ?? null }));
}

export type MarketplaceResult = Awaited<ReturnType<typeof searchMarketplace>>[number];

/** "Audio e luci, Sicurezza", the names of the services of a profile. */
export const serviceNames = (keys: string[]) =>
  keys
    .map((k) => getServiceCategory(k)?.name.it)
    .filter(Boolean)
    .join(", ");

const photoUrl = (path: string) => `${env.supabaseUrl}/storage/v1/object/public/${PORTFOLIO_BUCKET}/${path}`;

/** A listed agency or supplier by its slug, with portfolio, reviews and availability; null when it is not there. */
export async function fetchMarketplaceProfile(slug: string, viewerOrg: string) {
  const { data, error } = await supabase.rpc("marketplace_profile", { p_slug: slug.slice(0, 120) });
  if (error) throw error;
  const p = data[0];
  if (!p || p.type === "client") return null;
  const supplier = p.type === "supplier";
  const today = todayInItaly();
  const [portfolio, reviews, busy, contact] = await Promise.all([
    supabase
      .from("portfolio_items")
      .select("id, title, description, client_name, city, happened_on, created_at, portfolio_photos(id, storage_path, position, created_at)")
      .eq("org_id", p.org_id)
      .order("happened_on", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.rpc("org_reviews", { p_org: p.org_id, p_limit: 50 }),
    supplier ? supabase.rpc("supplier_busy_days", { p_supplier: p.org_id, p_from: today, p_to: addDays(today, 90) }) : null,
    supplier ? supabase.from("contacts").select("id").eq("org_id", viewerOrg).eq("supplier_org_id", p.org_id).limit(1).maybeSingle() : null,
  ]);
  for (const r of [portfolio, reviews, busy, contact]) if (r?.error) throw r.error;
  return {
    profile: { ...p, logo_url: (p.logo_url as string | null | undefined) ?? null },
    portfolio: (portfolio.data ?? []).map(({ portfolio_photos, ...item }) => ({
      ...item,
      photos: [...portfolio_photos]
        .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
        .map((ph) => ({ id: ph.id, url: photoUrl(ph.storage_path) })),
    })),
    reviews: reviews.data ?? [],
    busy: busy ? dayRanges((busy.data ?? []).map((d) => d.day)) : null,
    contactId: contact?.data?.id ?? null,
  };
}

export type MarketplaceProfile = NonNullable<Awaited<ReturnType<typeof fetchMarketplaceProfile>>>;

/** Adds a listed supplier to the agency's address book and returns the new contact. */
export async function addSupplierToAddressBook(agencyId: string, supplierId: string) {
  const { data, error } = await supabase.rpc("add_marketplace_supplier", { p_agency: agencyId, p_supplier: supplierId });
  if (error) throw error;
  return data;
}

const monthFmt = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });

/** "ottobre 2026", for a review or a portfolio job. */
export const monthYear = (iso: string) => monthFmt.format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso));

/** "Per Brand · Milano · maggio 2026", under a portfolio job. */
export function jobMeta(item: { client_name: string | null; city: string | null; happened_on: string | null }) {
  return [item.client_name ? `Per ${item.client_name}` : null, item.city, item.happened_on ? monthYear(item.happened_on) : null].filter(Boolean).join(" · ");
}
