import { TypeSquare } from "@/components/event-type";
import { Card } from "@/components/ui";
import type { LoadedRequest } from "@/lib/requests";
import { answerRows, EVENT_TYPE_INFO, formatEuro, getServiceCategory, openQuestions, OBJECTIVES } from "@i-events/core";
import type { ReactNode } from "react";

const OBJECTIVE_LABEL: Record<(typeof OBJECTIVES)[number], string> = {
  product_launch: "Lancio prodotto",
  brand_awareness: "Brand awareness",
  internal: "Evento interno",
  trade_fair: "Fiera",
  pop_up: "Pop-up",
  other: "Altro",
};

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" });
const fmtDate = (d?: string) => (d ? dateFmt.format(new Date(`${d}T12:00:00`)) : null);

/** The structured brief: header, campaign stages, one card per service, free requests and open questions. */
export function BriefView({ request }: { request: NonNullable<LoadedRequest> }) {
  const { draft } = request;
  const b = draft.basics;
  const stages = draft.campaign?.stages ?? [];
  const perStage = draft.campaign?.servicesMode === "per_stage";
  const open = openQuestions(draft);
  const groups = perStage
    ? stages.map((s, i) => ({ key: `stage-${i}`, title: `Tappa ${i + 1}${s.city ? ` · ${s.city}` : ""}`, items: draft.items.filter((it) => it.stageIndex === i) }))
    : [{ key: "all", title: draft.kind === "campaign" ? "Servizi per tutte le tappe" : "Servizi richiesti", items: draft.items }];

  const facts: [string, ReactNode][] = [
    ["Azienda", request.clientName],
    [
      "Che evento",
      draft.eventType ? (
        <span className="inline-flex items-center gap-2">
          <TypeSquare type={draft.eventType} />
          {EVENT_TYPE_INFO[draft.eventType].label}
        </span>
      ) : null,
    ],
    ["Formato", draft.kind === "campaign" ? `Campagna · ${draft.campaign?.eventsCount} eventi` : "Evento singolo"],
    ["Obiettivo", OBJECTIVE_LABEL[b.objective]],
    ["Date", [fmtDate(b.startDate), fmtDate(b.endDate)].filter(Boolean).join(" → ") || "Da definire"],
    ["Ospiti", b.guests ? String(b.guests) : null],
    ["Budget", b.budgetMin !== undefined || b.budgetMax !== undefined ? `${formatEuro(b.budgetMin ?? 0)} – ${b.budgetMax !== undefined ? formatEuro(b.budgetMax) : "?"}` : null],
    ["Città", b.city ?? null],
    ["Target", b.audience ?? null],
    ["Pubblico", b.isPublic ? "Aperto al pubblico" : "Riservato"],
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold">{b.title}</h2>
          <span className="text-sm text-muted">Completezza {request.completeness}%</span>
        </div>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-muted">{k}</dt>
              <dd>{v ?? <span className="text-muted">Non indicato</span>}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {draft.kind === "campaign" && (
        <Card title={draft.campaign?.sameVenue ? "Tappe · stesso luogo" : "Tappe"}>
          <ol className="flex flex-col gap-2 text-sm">
            {stages.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className="w-20 shrink-0 text-muted">Tappa {i + 1}</span>
                <span>{fmtDate(s.date) ?? "Data da definire"}</span>
                <span>{[s.city, s.venueHint].filter(Boolean).join(" · ") || "Luogo da definire"}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {groups.map((g) => (
        <section key={g.key} className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">{g.title}</h3>
          {g.items.length === 0 ? (
            <p className="text-sm text-muted">Nessun servizio indicato.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {g.items.map((item) => {
                const category = getServiceCategory(item.category);
                if (!category) return null;
                return (
                  <Card key={`${g.key}-${item.category}`} title={category.name.it}>
                    <dl className="flex flex-col gap-2 text-sm">
                      {answerRows(category, item.answers).map((row) => (
                        <div key={row.key} className="flex justify-between gap-4">
                          <dt className="text-muted">{row.label}</dt>
                          <dd className="text-right">{row.value ?? <span className="text-muted">Da chiarire</span>}</dd>
                        </div>
                      ))}
                    </dl>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      ))}

      {draft.freeText && (
        <Card title="Richieste libere">
          <p className="whitespace-pre-wrap text-sm">{draft.freeText}</p>
        </Card>
      )}

      {open.length > 0 && (
        <Card title={`Domande aperte (${open.length})`}>
          <ul className="list-disc pl-5 text-sm">
            {open.map((q, i) => (
              <li key={i}>
                {q.categoryName}
                {q.stageIndex !== undefined ? ` (tappa ${q.stageIndex + 1})` : ""}: {q.question}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
