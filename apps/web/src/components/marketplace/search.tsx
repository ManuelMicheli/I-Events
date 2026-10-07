import { LensIcon } from "@/components/icons";
import { RatingBadge } from "@/components/profiles/reviews";
import { Button, Card, Empty, Input, Select } from "@/components/ui";
import { getServiceCategory, SERVICE_CATALOG } from "@i-events/core";
import Link from "next/link";
import type { ReactNode } from "react";
import { OrgLogo } from "./org-logo";

export type MarketplaceFilters = { q: string; servizio: string; zona: string; data: string };
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
  rating_avg: number | null;
  rating_count: number;
  logo_url: string | null;
};

/** Search box for the marketplace: words, service, area and (for suppliers) a date they are free, as a plain GET form. */
export function MarketplaceSearchForm({ filters, placeholder, withDate = false }: { filters: MarketplaceFilters; placeholder: string; withDate?: boolean }) {
  return (
    <form className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" role="search">
      <label htmlFor="q" className="sr-only">
        Cerca
      </label>
      <span className="search-field relative sm:min-w-64 sm:flex-1">
        <LensIcon className="pointer-events-none absolute top-1/2 left-3 -mt-2.5 text-muted" />
        <Input id="q" name="q" type="search" defaultValue={filters.q} placeholder={placeholder} className="pl-10" />
      </span>
      <label htmlFor="servizio" className="sr-only">
        Servizio
      </label>
      <Select id="servizio" name="servizio" defaultValue={filters.servizio} className="sm:w-56">
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
      <Input id="zona" name="zona" defaultValue={filters.zona} placeholder="Città o regione" className="sm:w-48" />
      {withDate && (
        <>
          <label htmlFor="data" className="sr-only">
            Libero il
          </label>
          <Input id="data" name="data" type="date" defaultValue={filters.data} title="Solo chi è libero in questa data" className="sm:w-44" />
        </>
      )}
      <Button type="submit" variant="secondary" className="self-start">
        Cerca
      </Button>
    </form>
  );
}

export const serviceNames = (keys: string[]) =>
  keys
    .map((k) => getServiceCategory(k)?.name.it)
    .filter(Boolean)
    .join(", ");

/** The words found, a weight up (A3): the match reads by weight, never by colour. */
function Found({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return text;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i"));
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part));
}

const FILTER_CHIPS: { key: keyof MarketplaceFilters; label: (f: MarketplaceFilters) => string }[] = [
  { key: "data", label: () => "Qualsiasi data" },
  { key: "q", label: (f) => `Senza “${f.q}”` },
  { key: "servizio", label: () => "Tutti i servizi" },
  { key: "zona", label: () => "Ovunque" },
];

/** The results list; `badge` says how each result relates to the viewer (connected, in the address book). */
export function MarketplaceResults({
  results,
  hrefBase,
  badge,
  empty,
  filters,
}: {
  results: MarketplaceResult[];
  hrefBase: string;
  badge: (r: MarketplaceResult) => ReactNode;
  empty: ReactNode;
  filters?: MarketplaceFilters;
}) {
  if (results.length === 0) {
    // Nothing found: say for what, and offer to drop one filter at a time.
    const chips = filters ? FILTER_CHIPS.filter((c) => filters[c.key]).slice(0, 3) : [];
    const without = (key: keyof MarketplaceFilters) => {
      const params = new URLSearchParams(Object.entries(filters!).filter(([k, v]) => k !== key && v) as [string, string][]);
      return params.size ? `${hrefBase}?${params}` : hrefBase;
    };
    if (chips.length === 0) return <Empty>{empty}</Empty>;
    return (
      <div className="flex flex-col items-center gap-4 rounded-card bg-surface px-4 py-8 text-center text-sm">
        <p className="text-muted">{empty}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {chips.map((c) => (
            <Link
              key={c.key}
              href={without(c.key)}
              className="relative inline-flex min-h-8 items-center rounded-full border border-border-strong bg-bg px-3 text-label hover:bg-app after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']"
            >
              {c.label(filters!)}
            </Link>
          ))}
        </div>
      </div>
    );
  }
  return (
    <Card>
      <p className="mb-2 text-sm text-muted">{results.length === 1 ? "1 risultato" : `${results.length} risultati`}</p>
      <ul className="cascade divide-y divide-border">
        {results.map((r) => (
          <li key={r.org_id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 py-3 text-sm">
            <span className="flex min-w-0 flex-1 gap-3">
              <OrgLogo name={r.name} src={r.logo_url} />
              <span className="min-w-0">
                <Link href={`${hrefBase}/${r.slug}`} className="font-medium underline">
                  <Found text={r.name} query={filters?.q ?? ""} />
                </Link>
                {r.city && <span className="ml-2 text-muted">{r.city}</span>}
                {r.rating_count > 0 && (
                  <span className="ml-2">
                    <RatingBadge avg={r.rating_avg} count={r.rating_count} />
                  </span>
                )}
                {r.headline && <span className="block">{r.headline}</span>}
                <span className="block text-muted">
                  {[serviceNames(r.services), r.regions.join(", ")].filter(Boolean).join(" · ") || "Servizi non indicati"}
                </span>
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

export function readFilters(params: { q?: string; servizio?: string; zona?: string; data?: string }): MarketplaceFilters {
  return {
    data: /^\d{4}-\d{2}-\d{2}$/.test(params.data ?? "") && !Number.isNaN(Date.parse(params.data!)) ? params.data! : "",
    q: clean(params.q, 80),
    servizio: getServiceCategory(params.servizio ?? "") ? params.servizio! : "",
    zona: clean(params.zona, 60),
  };
}
