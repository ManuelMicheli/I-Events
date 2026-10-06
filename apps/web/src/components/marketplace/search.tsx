import { Card, Empty, Input, Select } from "@/components/ui";
import { getServiceCategory, SERVICE_CATALOG } from "@i-events/core";
import Link from "next/link";
import type { ReactNode } from "react";

export type MarketplaceFilters = { q: string; servizio: string; zona: string };
export type MarketplaceResult = {
  org_id: string;
  slug: string;
  name: string;
  city: string | null;
  headline: string;
  services: string[];
  regions: string[];
  connected: boolean;
  contact_id: string | null;
};

/** Search box for the marketplace: words, service and area, as a plain GET form. */
export function MarketplaceSearchForm({ filters, placeholder }: { filters: MarketplaceFilters; placeholder: string }) {
  return (
    <form className="flex flex-wrap gap-2" role="search">
      <label htmlFor="q" className="sr-only">
        Cerca
      </label>
      <Input id="q" name="q" defaultValue={filters.q} placeholder={placeholder} className="min-w-64 flex-1" />
      <label htmlFor="servizio" className="sr-only">
        Servizio
      </label>
      <Select id="servizio" name="servizio" defaultValue={filters.servizio}>
        <option value="">Tutti i servizi</option>
        {SERVICE_CATALOG.map((s) => (
          <option key={s.key} value={s.key}>
            {s.name.it}
          </option>
        ))}
      </Select>
      <label htmlFor="zona" className="sr-only">
        Zona
      </label>
      <Input id="zona" name="zona" defaultValue={filters.zona} placeholder="Città o regione" className="w-48" />
      <button type="submit" className="h-10 rounded-ui border border-border px-4 text-sm">
        Cerca
      </button>
    </form>
  );
}

export const serviceNames = (keys: string[]) =>
  keys
    .map((k) => getServiceCategory(k)?.name.it)
    .filter(Boolean)
    .join(", ");

/** The results list; `badge` says how each result relates to the viewer (connected, in the address book). */
export function MarketplaceResults({
  results,
  hrefBase,
  badge,
  empty,
}: {
  results: MarketplaceResult[];
  hrefBase: string;
  badge: (r: MarketplaceResult) => ReactNode;
  empty: ReactNode;
}) {
  if (results.length === 0) return <Empty>{empty}</Empty>;
  return (
    <Card>
      <p className="mb-2 text-sm text-muted">{results.length === 1 ? "1 risultato" : `${results.length} risultati`}</p>
      <ul className="divide-y divide-border">
        {results.map((r) => (
          <li key={r.org_id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 py-3 text-sm">
            <span className="min-w-0">
              <Link href={`${hrefBase}/${r.slug}`} className="font-medium underline">
                {r.name}
              </Link>
              {r.city && <span className="ml-2 text-muted">{r.city}</span>}
              {r.headline && <span className="block">{r.headline}</span>}
              <span className="block text-muted">
                {[serviceNames(r.services), r.regions.join(", ")].filter(Boolean).join(" · ") || "Servizi non indicati"}
              </span>
            </span>
            {badge(r)}
          </li>
        ))}
      </ul>
    </Card>
  );
}

const clean = (v: string | undefined, max: number) => (v ?? "").trim().slice(0, max);

export function readFilters(params: { q?: string; servizio?: string; zona?: string }): MarketplaceFilters {
  return {
    q: clean(params.q, 80),
    servizio: getServiceCategory(params.servizio ?? "") ? params.servizio! : "",
    zona: clean(params.zona, 60),
  };
}
