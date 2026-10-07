import { addDays, formatEventDates, todayInItaly } from "@i-events/core";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { EventCard } from "@/components/event-card";
import { MetricGrid } from "@/components/metric";
import { OrgSwitcher } from "@/components/org-switcher";
import { AgencyRequestCard, ClientRequestCard, Count, SupplierRequestCard } from "@/components/request-cards";
import { Divider } from "@/components/rows";
import { Screen, Section } from "@/components/screen";
import { CardSkeletons, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { TaskRow, TodoRow } from "@/components/todo-row";
import { TopActions } from "@/components/top-actions";
import { fetchAgencyEvents, fetchClientEvents, fetchSupplierRequests } from "@/lib/data";
import { useKeepEventDays } from "@/lib/event-day";
import { daysUntil, firstName, greeting, plural, shortDate, until } from "@/lib/format";
import { useMyName } from "@/lib/profile";
import { fetchAgencyProposals, fetchClientRequests, fetchDueTasks, PROPOSAL_PRICED, PROPOSAL_TO_REVIEW, setTaskDone } from "@/lib/requests";
import { useActiveOrg } from "@/lib/session";
import { eventStatusLook } from "@/lib/status-look";
import { useQuery, type Query } from "@/lib/use-query";
import { space } from "@/theme";

/** Home: a greeting, the numbers that matter, what is waiting for the user, and what comes next. */
export default function HomeScreen() {
  const org = useActiveOrg();
  if (org.type === "agency") return <AgencyHome orgId={org.id} />;
  if (org.type === "client") return <ClientHome orgId={org.id} />;
  return <SupplierHome orgId={org.id} />;
}

const place = (e: { venue: string | null; city: string | null }) => [e.venue, e.city].filter(Boolean).join(", ") || null;
const openEvent = (id: string) => router.push({ pathname: "/evento/[id]", params: { id } });
const isToday = (e: { start_date: string | null; end_date: string | null; status: string }, today: string) =>
  !!e.start_date && e.status !== "cancelled" && e.start_date <= today && (e.end_date ?? e.start_date) >= today;

/** The page frame shared by every Home: greeting, one line of summary, the organization, then the content. */
function HomeFrame({ summary, queries, children }: { summary: string | null; queries: Query<unknown>[]; children: ReactNode }) {
  const name = firstName(useMyName());
  const loading = queries.some((q) => q.loading);
  const failed = queries.find((q) => q.error && !q.data);
  const refresh = async () => {
    await Promise.all(queries.map((q) => q.refresh()));
  };
  return (
    <Screen
      title={name ? `${greeting()}, ${name}` : greeting()}
      actions={<TopActions />}
      header={
        <View style={styles.headerTexts}>
          {summary && !loading && (
            <T variant="body" tone="secondary">
              {summary}
            </T>
          )}
          <OrgSwitcher />
        </View>
      }
      refreshing={queries.some((q) => q.refreshing)}
      onRefresh={refresh}
    >
      {loading ? <CardSkeletons count={2} /> : failed ? <ErrorState error={failed.error} onRetry={refresh} /> : children}
    </Screen>
  );
}

const seeAll = (path: "/richieste" | "/eventi") => (
  <Button
    variant="tertiary"
    size="small"
    label="Vedi tutte"
    accessibilityLabel={path === "/richieste" ? "Vedi tutte le richieste" : "Vedi tutti gli eventi"}
    onPress={() => router.navigate(path)}
  />
);

function AgencyHome({ orgId }: { orgId: string }) {
  const today = todayInItaly();
  const week = addDays(today, 7);
  const proposals = useQuery(`agency-proposals:${orgId}`, () => fetchAgencyProposals(orgId));
  const events = useQuery(`events:agency:${orgId}`, () => fetchAgencyEvents(orgId));
  const tasks = useQuery(`due-tasks:${orgId}:${week}`, () => fetchDueTasks(orgId, week));
  useKeepEventDays(orgId, events.data);

  const all = proposals.data ?? [];
  const fresh = all.filter((p) => p.status === "invited");
  const toReview = all.filter((p) => PROPOSAL_TO_REVIEW.includes(p.status));
  const waiting = all.filter((p) => p.status === "submitted");
  const evs = (events.data ?? []).filter((e) => e.status !== "cancelled");
  const month = today.slice(0, 7);
  const thisMonth = evs.filter((e) => e.start_date?.startsWith(month));
  const todays = evs.filter((e) => isToday(e, today));
  const thisWeek = evs
    .filter((e) => e.start_date && e.start_date > today && e.start_date <= week)
    .sort((a, b) => a.start_date!.localeCompare(b.start_date!));
  // Average margin over the events of the last 90 days and the upcoming ones that have both a price and planned costs.
  const priced = evs.filter((e) => e.money.sold > 0 && e.money.planned > 0 && (e.end_date ?? e.start_date ?? today) >= addDays(today, -90));
  const sold = priced.reduce((s, e) => s + e.money.sold, 0);
  const margin = sold > 0 ? Math.round(((sold - priced.reduce((s, e) => s + e.money.planned, 0)) / sold) * 100) : null;

  const summary = `${plural(fresh.length, "richiesta nuova", "richieste nuove")}, ${plural(thisWeek.length + todays.length, "evento", "eventi")} questa settimana.`;
  const openTasks = tasks.data ?? [];

  return (
    <HomeFrame summary={summary} queries={[proposals, events]}>
      <MetricGrid
        items={[
          {
            label: "Richieste nuove",
            value: String(fresh.length),
            note: `${toReview.length} da guardare in tutto`,
            onPress: () => router.navigate("/richieste"),
          },
          {
            label: "Proposte in attesa",
            value: String(waiting.length),
            note: "Aspettano l'azienda",
            onPress: () => router.navigate("/richieste"),
          },
          {
            label: "Eventi questo mese",
            value: String(thisMonth.length),
            note: `${thisWeek.length + todays.length} questa settimana`,
            onPress: () => router.navigate("/eventi"),
          },
          {
            label: "Margine medio",
            value: margin === null ? "–" : `${margin}%`,
            note: margin === null ? "Servono prezzi e costi" : `Su ${plural(priced.length, "evento", "eventi")}`,
          },
        ]}
      />

      {todays.length > 0 && (
        <Section title="Oggi">
          <View style={styles.list}>
            {todays.map((e) => (
              <View key={e.id} style={styles.list}>
                <EventCard
                  title={e.title}
                  counterpart={e.counterpart}
                  dates={formatEventDates(e.start_date, e.end_date)}
                  place={place(e)}
                  badge={eventStatusLook("live")}
                  onPress={() => openEvent(e.id)}
                />
                <Button
                  block
                  icon="flash-outline"
                  label="Apri la giornata"
                  onPress={() => router.push({ pathname: "/giornata/[id]", params: { id: e.id } })}
                />
              </View>
            ))}
          </View>
        </Section>
      )}

      <Section
        title="Richieste ricevute"
        aside={toReview.length + waiting.length > 3 ? seeAll("/richieste") : <Count n={toReview.length + waiting.length} />}
      >
        {toReview.length + waiting.length === 0 ? (
          <T variant="callout" tone="secondary">
            Nessuna richiesta aperta. Quando un&apos;azienda te ne manda una, arriva qui con una notifica.
          </T>
        ) : (
          <View style={styles.list}>
            {[...toReview, ...waiting].slice(0, 3).map((p) => (
              <AgencyRequestCard key={p.id} p={p} />
            ))}
          </View>
        )}
      </Section>

      {(thisWeek.length > 0 || openTasks.length > 0) && (
        <Section title="Questa settimana">
          <View style={styles.list}>
            {thisWeek.slice(0, 3).map((e) => (
              <EventCard
                key={e.id}
                title={e.title}
                counterpart={e.counterpart}
                dates={formatEventDates(e.start_date, e.end_date)}
                place={place(e)}
                badge={eventStatusLook(e.status)}
                detail={e.bookings.total > 0 ? `${e.bookings.confirmed} su ${e.bookings.total} fornitori confermati` : undefined}
                onPress={() => openEvent(e.id)}
              />
            ))}
            {openTasks.length > 0 && (
              <Card style={styles.tight}>
                <View style={styles.cardHead}>
                  <T variant="bodyStrong" style={styles.flex}>
                    Attività in scadenza
                  </T>
                  <Button
                    variant="tertiary"
                    size="small"
                    label="Vedi tutte"
                    accessibilityLabel="Vedi tutte le attività"
                    onPress={() => router.push("/attivita")}
                  />
                </View>
                <View>
                  {openTasks.map((t, i) => (
                    <View key={t.id}>
                      {i > 0 && <Divider />}
                      <TaskRow
                        title={t.title}
                        detail={t.event?.title}
                        due={t.due_date! < today ? "SCADUTA" : t.due_date === today ? "OGGI" : shortDate(t.due_date!).toUpperCase()}
                        late={t.due_date! < today}
                        onToggle={(done) => setTaskDone(t.id, done)}
                      />
                    </View>
                  ))}
                </View>
              </Card>
            )}
          </View>
        </Section>
      )}
    </HomeFrame>
  );
}

function ClientHome({ orgId }: { orgId: string }) {
  const today = todayInItaly();
  const requests = useQuery(`client-requests:${orgId}`, () => fetchClientRequests(orgId));
  const events = useQuery(`events:client:${orgId}`, () => fetchClientEvents(orgId));

  const open = (requests.data ?? []).filter((r) => r.status === "sent");
  const proposals = open.flatMap((r) => r.proposals.map((p) => ({ ...p, request: r })));
  const fresh = proposals.filter((p) => p.status === "submitted");
  const priced = proposals.filter((p) => PROPOSAL_PRICED.includes(p.status));
  const questions = proposals.filter((p) => p.status === "clarification");
  const quotes = (events.data ?? []).filter((e) => e.latestQuote?.status === "sent");
  const upcoming = (events.data ?? [])
    .filter((e) => e.status !== "cancelled" && e.status !== "completed" && (e.end_date ?? e.start_date ?? today) >= today)
    .sort((a, b) => (a.start_date ?? "9999").localeCompare(b.start_date ?? "9999"));
  const next = upcoming.find((e) => e.start_date);
  const toDecide = fresh.length + quotes.length;
  const summary = toDecide === 0 ? "Nessun preventivo da valutare." : `Hai ${plural(toDecide, "preventivo", "preventivi")} da valutare.`;

  const metrics = [
    {
      label: "Richieste aperte",
      value: String(open.length),
      note: `${open.filter((r) => !r.proposals.some((p) => PROPOSAL_PRICED.includes(p.status))).length} in attesa`,
      onPress: () => router.navigate("/richieste"),
    },
    {
      label: "Preventivi",
      value: String(priced.length),
      note: `${fresh.length} da valutare`,
      onPress: () => router.navigate("/richieste"),
    },
  ];
  if (next?.start_date) {
    const days = Math.max(0, daysUntil(next.start_date, today));
    metrics.push({
      label: "Prossimo evento",
      value: days === 0 ? "Oggi" : days === 1 ? "Domani" : String(days),
      note: days > 1 ? `giorni a ${next.title}` : next.title,
      onPress: () => openEvent(next.id),
    });
    metrics.push({
      label: "Eventi in programma",
      value: String(upcoming.length),
      note: "Con le agenzie scelte",
      onPress: () => router.navigate("/eventi"),
    });
  }

  return (
    <HomeFrame summary={summary} queries={[requests, events]}>
      <MetricGrid items={metrics} />

      {(fresh.length > 0 || quotes.length > 0 || questions.length > 0) && (
        <Section title="Da fare">
          <View>
            {fresh.map((p) => (
              <TodoRow
                key={p.id}
                who={p.agency.name}
                text={`${p.agency.name} ha inviato il preventivo per ${p.request.title}`}
                action="Valuta"
                onPress={() => router.push({ pathname: "/richiesta-azienda/[id]", params: { id: p.request.id } })}
              />
            ))}
            {quotes.map((e) => (
              <TodoRow
                key={e.id}
                who={e.counterpart}
                text={`${e.counterpart} ti chiede di approvare il preventivo di ${e.title}`}
                action="Apri"
                onPress={() => openEvent(e.id)}
              />
            ))}
            {questions.map((p) => (
              <TodoRow
                key={p.id}
                who={p.agency.name}
                text={`${p.agency.name} ha delle domande su ${p.request.title}`}
                action="Rispondi"
                onPress={() => router.push({ pathname: "/conversazione/[id]", params: { id: p.id } })}
              />
            ))}
          </View>
        </Section>
      )}

      <Section title="Le tue richieste" aside={open.length > 3 ? seeAll("/richieste") : <Count n={open.length} />}>
        {open.length === 0 ? (
          <T variant="callout" tone="secondary">
            Nessuna richiesta aperta. Le richieste che mandi alle agenzie compaiono qui con i preventivi.
          </T>
        ) : (
          <View style={styles.list}>
            {open.slice(0, 3).map((r) => (
              <ClientRequestCard key={r.id} r={r} />
            ))}
          </View>
        )}
      </Section>

      {upcoming.length > 0 && (
        <Section title="Prossimi eventi" aside={upcoming.length > 2 ? seeAll("/eventi") : undefined}>
          <View style={styles.list}>
            {upcoming.slice(0, 2).map((e) => (
              <EventCard
                key={e.id}
                title={e.title}
                counterpart={e.counterpart}
                dates={formatEventDates(e.start_date, e.end_date)}
                place={place(e)}
                badge={isToday(e, today) ? eventStatusLook("live") : eventStatusLook(e.status)}
                onPress={() => openEvent(e.id)}
              />
            ))}
          </View>
        </Section>
      )}
    </HomeFrame>
  );
}

function SupplierHome({ orgId }: { orgId: string }) {
  const today = todayInItaly();
  const q = useQuery(`supplier:${orgId}`, () => fetchSupplierRequests(orgId));
  const all = q.data ?? [];
  const toAnswer = all.filter((r) => r.bucket === "to_answer").sort((a, b) => (a.start_date ?? "9999").localeCompare(b.start_date ?? "9999"));
  const confirmed = all
    .filter((r) => r.bucket === "confirmed" && (r.end_date ?? r.start_date ?? today) >= today)
    .sort((a, b) => (a.start_date ?? "9999").localeCompare(b.start_date ?? "9999"));
  const next = confirmed.find((r) => r.start_date);
  const when = next?.start_date ? until(next.start_date, today) : null;
  const summary = toAnswer.length === 0 ? "Nessuna richiesta da rispondere." : `${plural(toAnswer.length, "richiesta", "richieste")} da rispondere.`;

  return (
    <HomeFrame summary={summary} queries={[q]}>
      <MetricGrid
        items={[
          {
            label: "Da rispondere",
            value: String(toAnswer.length),
            note: "Le agenzie aspettano",
            onPress: () => router.navigate("/richieste"),
          },
          {
            label: "Lavori confermati",
            value: String(confirmed.length),
            note: when ? `Il prossimo ${when}` : "Nessuno in programma",
            onPress: () => router.navigate("/richieste"),
          },
        ]}
      />
      <Section title="Da rispondere" aside={<Count n={toAnswer.length} />}>
        {toAnswer.length === 0 ? (
          <T variant="callout" tone="secondary">
            Tutto in ordine. Quando un&apos;agenzia ti chiede un servizio, la richiesta arriva qui con una notifica.
          </T>
        ) : (
          <View style={styles.list}>
            {toAnswer.map((r) => (
              <SupplierRequestCard key={r.id} r={r} />
            ))}
          </View>
        )}
      </Section>
      {confirmed.length > 0 && (
        <Section title="Prossimi lavori">
          <View style={styles.list}>
            {confirmed.slice(0, 3).map((r) => (
              <SupplierRequestCard key={r.id} r={r} />
            ))}
          </View>
        </Section>
      )}
    </HomeFrame>
  );
}

const styles = StyleSheet.create({
  headerTexts: { gap: space[1] },
  list: { gap: space[3] },
  tight: { gap: space[2] },
  cardHead: { flexDirection: "row", alignItems: "center", gap: space[2] },
  flex: { flex: 1 },
});
