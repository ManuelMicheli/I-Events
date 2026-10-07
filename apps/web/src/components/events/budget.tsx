import { inkVars } from "@/components/event-type";
import { ServiceSign } from "@/components/service-sign";
import { Card } from "@/components/ui";
import { formatEuro, getServiceCategory, SERVICE_FAMILIES, serviceFamily, type eventBudget, type EventType, type ServiceFamily } from "@i-events/core";
import Link from "next/link";

type Budget = ReturnType<typeof eventBudget>;
type Costed = { service_key: string; status: string; planned_cost: number | null; actual_cost: number | null };

const serviceName = (key: string) => (key === "other" ? "Altro" : (getServiceCategory(key)?.name.it ?? key));
const pct = (part: number, whole: number) => Math.round((part / whole) * 100);

/**
 * One tone per family ("Carta e inchiostro", point 3): inside an event Regia deep, Spazio full, Palco
 * light and Accoglienza tint (with a hairline); without a type the Grafite tones of carta.
 */
const FAMILY_BAR: Record<ServiceFamily | "other", { ink: string; plain: string }> = {
  direction: { ink: "bg-[var(--ink-deep)] dark:bg-[var(--ink-text-dark)]", plain: "bg-text" },
  space: { ink: "bg-[var(--ink-fill)] dark:bg-[var(--ink-fill-dark)]", plain: "bg-muted" },
  stage: { ink: "bg-[var(--ink-light)] dark:bg-[var(--ink-fill)]", plain: "bg-control" },
  hospitality: { ink: "border border-border-strong bg-[var(--ink-tint)] dark:bg-[var(--ink-deep)]", plain: "border border-border-strong bg-border-strong" },
  other: { ink: "border border-border-strong bg-surface", plain: "border border-border-strong bg-surface" },
};

/** The bar of the margin: the share of the sale that goes in costs, in text on carta, never coloured. */
function MarginBar({ cost, sold }: { cost: number; sold: number }) {
  const share = sold > 0 ? Math.min(100, (cost / sold) * 100) : 100;
  const over = cost > sold;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-2 overflow-hidden rounded-full bg-surface">
        <div className={`h-full rounded-full ${over ? "bg-danger" : "bg-text"}`} style={{ width: `${share}%` }} />
      </div>
      <p className={`text-xs ${over ? "text-danger" : "text-muted"}`}>
        {over ? `I costi superano il venduto di ${formatEuro(cost - sold)}` : `Costi su venduto: ${pct(cost, sold)}%`}
      </p>
    </div>
  );
}

/**
 * Beside the suppliers: sold, costs, and the margin big in mono with its bar. A column on wide
 * screens, a row of three above the table on the others.
 */
export function BudgetSummary({ budget, href }: { budget: Budget; href: string }) {
  const marginPct = budget.margin !== null && budget.sold ? pct(budget.margin, budget.sold) : null;
  return (
    <Card
      title="Riepilogo budget"
      action={
        <Link href={href} scroll={false} className="text-sm underline">
          Vedi il budget
        </Link>
      }
    >
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-1">
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted">Venduto</dt>
          <dd className={budget.sold === null ? "text-sm" : "font-mono text-lg tabular-nums"}>{budget.sold === null ? "Da definire" : formatEuro(budget.sold)}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted">Costi stimati</dt>
          <dd className="font-mono text-lg tabular-nums">{formatEuro(budget.forecast)}</dd>
        </div>
        {budget.margin !== null && (
          <div className="col-span-2 flex flex-col gap-1 sm:col-span-1 2xl:border-t 2xl:border-border 2xl:pt-4">
            <dt className="text-sm text-muted">Margine stimato{marginPct !== null && ` · ${marginPct}%`}</dt>
            <dd className={`font-mono text-3xl font-medium tabular-nums 2xl:text-2xl ${budget.margin < 0 ? "text-danger" : ""}`}>{formatEuro(budget.margin)}</dd>
          </div>
        )}
      </dl>
      {budget.sold !== null && budget.sold > 0 && (
        <div className="mt-4">
          <MarginBar cost={budget.forecast} sold={budget.sold} />
        </div>
      )}
      {budget.sold === null && <p className="mt-4 text-xs text-muted">Il margine compare quando il cliente approva il preventivo di questo evento.</p>}
    </Card>
  );
}

/**
 * The Budget tab: the sale big in mono, costs and margin with its bar; costs per family in bars of
 * the event's ink with their name and amount beside them; then every service in a table.
 */
export function BudgetView({ budget, bookings, type, note }: { budget: Budget; bookings: Costed[]; type: EventType | null; note: string }) {
  const marginPct = budget.margin !== null && budget.sold ? pct(budget.margin, budget.sold) : null;
  const live = bookings.filter((b) => b.status !== "cancelled");
  const families = [...SERVICE_FAMILIES.map((f) => ({ key: f.key as ServiceFamily | "other", name: f.name.it })), { key: "other" as const, name: "Altro" }]
    .map((f) => {
      const mine = live.filter((b) => (serviceFamily(b.service_key) ?? "other") === f.key);
      return {
        ...f,
        services: [...new Set(mine.map((b) => serviceName(b.service_key)))],
        cost: mine.reduce((s, b) => s + Math.round((b.actual_cost ?? b.planned_cost ?? 0) * 100), 0) / 100,
      };
    })
    .filter((f) => f.services.length > 0);
  const top = Math.max(...families.map((f) => f.cost), 0);
  const hasSold = budget.rows.some((r) => r.sold !== null);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <dl className="grid gap-6 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted">Venduto al cliente</dt>
            <dd className={budget.sold === null ? "text-2xl font-medium" : "font-mono text-2xl font-medium tabular-nums sm:text-3xl 2xl:text-4xl"}>{budget.sold === null ? "Da definire" : formatEuro(budget.sold)}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted">Costo previsto</dt>
            <dd className="font-mono text-2xl font-medium tabular-nums">{formatEuro(budget.planned)}</dd>
            <dd className="text-sm text-muted">
              Reale finora <span className="font-mono tabular-nums">{formatEuro(budget.actual)}</span>
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted">Margine stimato</dt>
            <dd className={`font-mono text-2xl font-medium tabular-nums ${budget.margin !== null && budget.margin < 0 ? "text-danger" : ""}`}>
              {formatEuro(budget.margin)}
              {marginPct !== null && <span className="ml-2 font-sans text-sm font-normal text-muted">{marginPct}%</span>}
            </dd>
          </div>
        </dl>
        {budget.sold !== null && budget.sold > 0 && (
          <div className="mt-6">
            <MarginBar cost={budget.forecast} sold={budget.sold} />
          </div>
        )}
        <p className="mt-4 text-sm text-muted">{note}</p>
      </Card>

      {families.length > 0 && (
        <Card title="Costi per famiglia">
          <ul className="flex flex-col gap-4" style={type ? inkVars(type) : undefined}>
            {families.map((f) => (
              <li key={f.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[11rem_minmax(0,1fr)_8rem]">
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{f.name}</span>
                  <span className="truncate text-xs text-muted">{f.services.join(", ")}</span>
                </div>
                <div className="col-span-2 h-3 max-sm:row-start-2 sm:col-span-1">
                  <div
                    className={`h-full min-w-1 rounded-[4px] ${type ? FAMILY_BAR[f.key].ink : FAMILY_BAR[f.key].plain}`}
                    style={{ width: top > 0 ? `${(f.cost / top) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-right font-mono text-sm tabular-nums max-sm:col-start-2 max-sm:row-start-1">{formatEuro(f.cost)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">Costo reale dove c&apos;è, altrimenti quello previsto.</p>
        </Card>
      )}

      {budget.rows.length > 0 && (
        <Card title="Per servizio">
          <table className="list-table w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="pb-2 text-xs font-medium">Servizio</th>
                {hasSold && <th className="pb-2 text-right text-xs font-medium">Venduto</th>}
                <th className="pb-2 text-right text-xs font-medium">Previsto</th>
                <th className="pb-2 text-right text-xs font-medium">Reale</th>
              </tr>
            </thead>
            <tbody>
              {budget.rows.map((r) => (
                <tr key={r.service} className="border-t border-border">
                  <td className="py-2.5">
                    <span className="flex items-center gap-3 font-medium">
                      <ServiceSign service={r.service} type={type} />
                      {serviceName(r.service)}
                    </span>
                  </td>
                  {hasSold && (
                    <td data-label="Venduto" className="py-2.5 text-right">
                      <span className="font-mono tabular-nums">{r.sold === null ? "–" : formatEuro(r.sold)}</span>
                    </td>
                  )}
                  <td data-label="Previsto" className="py-2.5 text-right">
                    <span className="font-mono tabular-nums">{formatEuro(r.planned)}</span>
                  </td>
                  <td data-label="Reale" className="py-2.5 text-right">
                    <span className="font-mono tabular-nums">{r.hasActual ? formatEuro(r.actual) : "–"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
