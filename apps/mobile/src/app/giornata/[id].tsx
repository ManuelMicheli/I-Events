import Ionicons from "@expo/vector-icons/Ionicons";
import { crewState, hhmm, liveDay, scheduleTimeline, withPendingCheckins, type CrewMember, type ScheduleState } from "@i-events/core";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from "react-native";
import { Badge, LiveDot } from "@/components/badge";
import { Button } from "@/components/button";
import { Card, TicketDivider } from "@/components/card";
import { Divider } from "@/components/rows";
import { Screen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T, type Tone } from "@/components/text";
import { TextField } from "@/components/text-field";
import { clearCheckinError, flushCheckins, recordCheckin, useCheckinQueue } from "@/lib/checkin-queue";
import { fetchEventDay, readSavedDay, saveDay, type DayItem, type EventDay } from "@/lib/event-day";
import { useActiveOrg } from "@/lib/session";
import { useItalyNow } from "@/lib/use-italy-now";
import { useOnline } from "@/lib/use-online";
import { control, radius, space, useTheme } from "@/theme";

type Loaded = { day: EventDay | null; savedAt: string | null; error: unknown; loading: boolean; refreshing: boolean };

const timeFmt = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" });
/** "18:05" for a moment, in Italian time. */
const clock = (iso: string) => timeFmt.format(new Date(iso));
const shortDayFmt = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const longDayFmt = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "Sab 13 giu" for the day picker, "sabato 13 giugno" in sentences. */
const shortDay = (d: string) => capital(shortDayFmt.format(new Date(`${d}T12:00:00Z`)));
const longDay = (d: string) => longDayFmt.format(new Date(`${d}T12:00:00Z`));

/**
 * The event day on site, for the agency: what is happening now and next, the run of show and who has arrived. It
 * opens from the copy kept on the phone and keeps working without signal: check-ins wait on the phone and leave as
 * soon as there is a connection.
 */
export default function EventDayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const org = useActiveOrg();
  const online = useOnline();
  const now = useItalyNow();
  const checkins = useCheckinQueue(id);
  const [s, setS] = useState<Loaded>({ day: null, savedAt: null, error: null, loading: true, refreshing: false });
  const [chosenDay, setChosenDay] = useState<string>();
  const [tab, setTab] = useState<"schedule" | "crew">("schedule");

  const load = useCallback(async () => {
    try {
      const day = await fetchEventDay(id, org.id);
      const savedAt = day ? await saveDay(org.id, day) : null;
      setS({ day, savedAt, error: null, loading: false, refreshing: false });
    } catch (error) {
      // Keep showing the saved copy: on site an old list beats no list.
      setS((p) => ({ ...p, error, loading: false, refreshing: false }));
    }
  }, [id, org.id]);

  // The saved copy first, so the screen opens at once even without signal; then the server's.
  useEffect(() => {
    let alive = true;
    readSavedDay(id, org.id).then((saved) => {
      if (alive && saved) setS((p) => (p.day ? p : { ...p, day: saved.day, savedAt: saved.savedAt, loading: false }));
      void load();
    });
    return () => {
      alive = false;
    };
  }, [id, org.id, load]);

  // Back online: send what is waiting, then pick up colleagues' check-ins. While online, refresh every minute.
  useEffect(() => {
    if (!online) return;
    void flushCheckins(id).then(load);
    const timer = setInterval(() => void flushCheckins(id).then(load), 60_000);
    return () => clearInterval(timer);
  }, [online, id, load]);

  const refresh = useCallback(async () => {
    setS((p) => ({ ...p, refreshing: true }));
    await flushCheckins(id);
    await load();
  }, [id, load]);

  if (s.loading)
    return (
      <Screen>
        <CardSkeletons count={3} />
      </Screen>
    );
  if (!s.day) {
    if (s.error && !online)
      return (
        <Screen>
          <EmptyState
            icon="cloud-offline-outline"
            title="Serve la rete la prima volta"
            body="Apri la giornata una volta con la connessione: da quel momento resta sul telefono e funziona anche senza rete."
            action={{ label: "Riprova", onPress: refresh }}
          />
        </Screen>
      );
    if (s.error)
      return (
        <Screen>
          <ErrorState error={s.error} onRetry={refresh} />
        </Screen>
      );
    return (
      <Screen>
        <EmptyState
          icon="search-outline"
          title="Evento non trovato"
          body={`La giornata è per l'agenzia che organizza l'evento. Se è di un'altra organizzazione, sceglila da Account.`}
        />
      </Screen>
    );
  }

  const { event, days: eventDays, items, crew } = s.day;
  const days = eventDays.length > 0 ? eventDays : [now.day];
  const day = chosenDay && days.includes(chosenDay) ? chosenDay : (liveDay(days, items.map((i) => i.day), now.day) ?? days[0]!);
  const timeline = scheduleTimeline(items, now);
  const members = withPendingCheckins(crew.filter((c) => c.day === day), checkins.queue);
  const arrived = members.filter((m) => m.checked_in_at).length;
  const place = [event.venue, event.city].filter(Boolean).join(", ");

  return (
    <Screen refreshing={s.refreshing} onRefresh={refresh}>
      <Stack.Screen options={{ title: "Giornata" }} />
      <View style={styles.top}>
        <SyncBanner
          online={online}
          pending={checkins.queue.length}
          syncing={checkins.syncing}
          error={checkins.error}
          onDismissError={() => clearCheckinError(id)}
          savedAt={s.savedAt}
          stale={Boolean(s.error)}
        />
        <View style={styles.head}>
          <T variant="title2" accessibilityRole="header">
            {event.title}
          </T>
          <T variant="callout" tone="secondary">
            {[event.client, place].filter(Boolean).join(" · ")}
          </T>
        </View>
        <NowCard timeline={timeline} now={now} empty={items.length === 0} />
      </View>

      <View style={styles.body}>
        {days.length > 1 && (
          <Segmented
            accessibilityLabel="Giorno"
            value={day}
            options={days.map((d) => ({ value: d, label: shortDay(d), accessibilityLabel: longDay(d) }))}
            onChange={setChosenDay}
          />
        )}
        <Segmented
          value={tab}
          options={[
            { value: "schedule", label: "Scaletta" },
            { value: "crew", label: `Arrivi ${arrived}/${members.length}`, accessibilityLabel: `Arrivi, ${arrived} su ${members.length}` },
          ]}
          onChange={setTab}
        />
        {tab === "schedule" ? (
          <Schedule rows={timeline.filter((t) => t.item.day === day)} />
        ) : (
          <Arrivals eventId={id} members={members} refused={checkins.refused} arrived={arrived} now={now} />
        )}
      </View>
    </Screen>
  );
}

function SyncBanner({
  online,
  pending,
  syncing,
  error,
  onDismissError,
  savedAt,
  stale,
}: {
  online: boolean;
  pending: number;
  syncing: boolean;
  error: string | null;
  onDismissError: () => void;
  savedAt: string | null;
  stale: boolean;
}) {
  const waiting = pending === 1 ? "1 check-in" : `${pending} check-in`;
  const asOf = savedAt ? ` Dati aggiornati alle ${clock(savedAt)}.` : "";
  return (
    <>
      {error && (
        <Banner tone="danger" icon="alert-circle-outline" title="Un check-in non è stato salvato" body={error} onDismiss={onDismissError} />
      )}
      {!online ? (
        <Banner
          tone="warning"
          icon="cloud-offline-outline"
          title="Sei offline"
          body={`${pending > 0 ? `${capital(waiting)} sul telefono: partono` : "Puoi continuare a fare i check-in: restano sul telefono e partono"} appena torna la rete.${asOf}`}
        />
      ) : pending > 0 ? (
        <Banner
          tone="info"
          icon="cloud-upload-outline"
          busy={syncing}
          title={syncing ? `Invio di ${waiting}…` : `${capital(waiting)} da inviare`}
          body={syncing ? "Restano sul telefono finché il server non li ha salvati." : "Il server non risponde: riproviamo tra poco."}
        />
      ) : stale ? (
        <Banner tone="warning" icon="time-outline" title="Non riusciamo ad aggiornare" body={`Stai vedendo la copia sul telefono.${asOf}`} />
      ) : null}
    </>
  );
}

function Banner({
  tone,
  icon,
  title,
  body,
  busy = false,
  onDismiss,
}: {
  tone: "warning" | "info" | "danger";
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  body: string;
  busy?: boolean;
  onDismiss?: () => void;
}) {
  const { c } = useTheme();
  const look = { warning: [c.warningBg, c.warning], info: [c.infoBg, c.info], danger: [c.dangerBg, c.danger] }[tone];
  return (
    <View style={[styles.banner, { backgroundColor: look[0] }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <View style={styles.bannerIcon}>{busy ? <ActivityIndicator color={look[1]} /> : <Ionicons name={icon} size={20} color={look[1]} />}</View>
      <View style={styles.flex}>
        <T variant="calloutStrong" tone={tone}>
          {title}
        </T>
        <T variant="callout">{body}</T>
      </View>
      {onDismiss && (
        <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Chiudi" hitSlop={4} style={styles.bannerClose}>
          <Ionicons name="close" size={20} color={c.textPrimary} />
        </Pressable>
      )}
    </View>
  );
}

type Row = { item: DayItem; state: ScheduleState };

function NowCard({ timeline, now, empty }: { timeline: Row[]; now: { day: string; time: string }; empty: boolean }) {
  const current = timeline.filter((t) => t.state === "current");
  const next = timeline.find((t) => t.state === "next");
  return (
    <Card>
      <View style={styles.nowHead}>
        {current.length > 0 && <LiveDot />}
        <T variant="label" tone={current.length > 0 ? "accent" : "secondary"} style={styles.flex}>
          ADESSO
        </T>
        <T variant="mono" tone="secondary" accessibilityLabel={`Ore ${now.time}`}>
          {now.time}
        </T>
      </View>
      {current.length > 0 ? (
        current.map((t) => (
          <View key={t.item.id} style={styles.nowItem}>
            <T variant="title3">{t.item.title}</T>
            {(t.item.location || t.item.supplier) && (
              <T variant="callout" tone="secondary">
                {[t.item.location, t.item.supplier].filter(Boolean).join(" · ")}
              </T>
            )}
          </View>
        ))
      ) : (
        <T variant="title3" tone="secondary">
          {empty ? "La scaletta è vuota" : next ? "Niente in corso" : "Scaletta conclusa"}
        </T>
      )}
      {next && (
        <>
          <TicketDivider />
          <View style={styles.nextRow}>
            <T variant="label" tone="secondary">
              DOPO
            </T>
            <View style={styles.flex}>
              <T variant="mono">
                {next.item.day !== now.day ? `${longDay(next.item.day)}, ` : ""}
                {hhmm(next.item.starts_at)}
              </T>
              <T variant="bodyStrong">{next.item.title}</T>
            </View>
          </View>
        </>
      )}
    </Card>
  );
}

function Schedule({ rows }: { rows: Row[] }) {
  const { c } = useTheme();
  if (rows.length === 0)
    return (
      <EmptyState icon="list-outline" title="Niente in scaletta" body="Per questo giorno non ci sono momenti. La scaletta si prepara dallo spazio evento sul sito." />
    );
  return (
    <Card style={styles.listCard}>
      {rows.map(({ item, state }, i) => {
        const past = state === "past";
        const meta = [item.location, item.supplier, item.referent && `Referente: ${item.referent}`].filter(Boolean).join(" · ");
        return (
          <View key={item.id}>
            {i > 0 && <Divider />}
            <View
              style={[styles.scheduleRow, state === "current" && { backgroundColor: c.accentSubtle, borderLeftColor: c.accentFill }]}
              accessibilityLabel={[
                `${hhmm(item.starts_at)}${item.ends_at ? ` – ${hhmm(item.ends_at)}` : ""}`,
                item.title,
                meta,
                state === "current" ? "in corso" : state === "past" ? "concluso" : state === "next" ? "prossimo" : "",
              ]
                .filter(Boolean)
                .join(", ")}
            >
              <View style={styles.timeCol}>
                <T variant="mono" tone={past ? "secondary" : "primary"}>
                  {hhmm(item.starts_at)}
                </T>
                {item.ends_at && (
                  <T variant="mono" tone="secondary">
                    {hhmm(item.ends_at)}
                  </T>
                )}
              </View>
              <View style={styles.texts}>
                {state === "current" && <Badge tone="accent" live label="In corso" />}
                {state === "next" && <Badge tone="outline" label="Prossimo" />}
                <T variant={past ? "body" : "bodyStrong"} tone={past ? "secondary" : "primary"}>
                  {item.title}
                </T>
                {meta !== "" && (
                  <T variant="callout" tone="secondary">
                    {meta}
                  </T>
                )}
                {item.notes && (
                  <T variant="callout" tone="secondary">
                    {item.notes}
                  </T>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

type Member = CrewMember & { pending: boolean };

function Arrivals({
  eventId,
  members,
  refused,
  arrived,
  now,
}: {
  eventId: string;
  members: Member[];
  refused: Record<string, string>;
  arrived: number;
  now: { day: string; time: string };
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? members.filter((m) => [m.name, m.detail, m.phone].some((v) => v?.toLowerCase().includes(q))) : members;
  }, [members, query]);

  if (members.length === 0)
    return (
      <EmptyState icon="people-outline" title="Nessuno in elenco" body="Per questo giorno non ci sono arrivi. Fornitori e staff si aggiungono dallo spazio evento sul sito." />
    );
  return (
    <View style={styles.arrivals}>
      <T variant="callout" tone="secondary">
        {arrived === members.length ? `Tutti arrivati: ${arrived} su ${members.length}.` : `${arrived} arrivati su ${members.length}.`}
      </T>
      {members.length > 8 && (
        <TextField label="Cerca" placeholder="Nome, servizio o ruolo" value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" />
      )}
      {visible.length === 0 ? (
        <T variant="callout" tone="secondary" style={styles.center}>
          Nessuno trovato.
        </T>
      ) : (
        <Card style={styles.listCard}>
          {visible.map((m, i) => (
            <View key={m.id}>
              {i > 0 && <Divider />}
              <CrewRow member={m} refused={refused[m.id]} now={now} onToggle={() => recordCheckin(eventId, { id: m.id, at: m.checked_in_at ? null : new Date().toISOString() })} />
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

function CrewRow({
  member: m,
  refused,
  now,
  onToggle,
}: {
  member: Member;
  refused?: string;
  now: { day: string; time: string };
  onToggle: () => void;
}) {
  const { c } = useTheme();
  const state = crewState(m, now);
  const status: { icon: ComponentProps<typeof Ionicons>["name"]; tone: Tone; color: string; text: string } =
    state === "arrived"
      ? { icon: "checkmark-circle", tone: "success", color: c.success, text: `Arrivato alle ${clock(m.checked_in_at!)}` }
      : state === "late"
        ? { icon: "alert-circle", tone: "danger", color: c.danger, text: `In ritardo, atteso alle ${hhmm(m.call_time!)}` }
        : { icon: "time-outline", tone: "secondary", color: c.textSecondary, text: m.call_time ? `Atteso alle ${hhmm(m.call_time)}` : "Atteso" };
  return (
    <View style={styles.crewRow}>
      <View style={styles.texts}>
        <T variant="bodyStrong">{m.name}</T>
        {m.detail ? (
          <T variant="callout" tone="secondary">
            {m.detail}
          </T>
        ) : null}
        <View style={styles.status}>
          <Ionicons name={status.icon} size={16} color={status.color} style={styles.statusIcon} />
          <T variant="callout" tone={status.tone} style={styles.flex}>
            {status.text}
          </T>
        </View>
        {m.pending && (
          <View style={styles.status}>
            <Ionicons name="cloud-upload-outline" size={16} color={c.warning} style={styles.statusIcon} />
            <T variant="callout" tone="warning" style={styles.flex}>
              Da inviare
            </T>
          </View>
        )}
        {refused && (
          <View style={styles.status}>
            <Ionicons name="close-circle" size={16} color={c.danger} style={styles.statusIcon} />
            <T variant="callout" tone="danger" style={styles.flex}>
              Non salvato. {refused}
            </T>
          </View>
        )}
      </View>
      <View style={styles.actions}>
        <View style={styles.checkButton}>
          <Button
            block
            align="center"
            variant={m.checked_in_at ? "secondary" : "primary"}
            label={m.checked_in_at ? "Annulla" : "Check-in"}
            accessibilityHint={m.checked_in_at ? `Toglie l'arrivo di ${m.name}` : `Segna ${m.name} come arrivato adesso`}
            onPress={onToggle}
          />
        </View>
        {m.phone && (
          <Pressable
            onPress={() => Linking.openURL(`tel:${m.phone!.replace(/[^\d+]/g, "")}`)}
            accessibilityRole="button"
            accessibilityLabel={`Chiama ${m.name}`}
            style={({ pressed }) => [styles.call, { borderColor: c.borderStrong, backgroundColor: pressed ? c.bgSubtle : c.bgSurface }]}
          >
            <Ionicons name="call-outline" size={20} color={c.textPrimary} />
            <T variant="calloutStrong">Chiama</T>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: "center" },
  top: { gap: space[4] },
  head: { gap: space[1] },
  body: { gap: space[4] },
  banner: { flexDirection: "row", alignItems: "flex-start", gap: space[3], padding: space[4], borderRadius: radius.md },
  bannerIcon: { width: 20, height: 22, alignItems: "center", justifyContent: "center" },
  bannerClose: { width: control.touch, height: control.touch, alignItems: "center", justifyContent: "center", margin: -space[3] },
  nowHead: { flexDirection: "row", alignItems: "center", gap: space[2] },
  nowItem: { gap: space[1] },
  nextRow: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  listCard: { paddingVertical: space[1], paddingHorizontal: 0, gap: 0 },
  scheduleRow: {
    flexDirection: "row",
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[4] - 3,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  timeCol: { width: 48 },
  texts: { flex: 1, gap: space[1] },
  arrivals: { gap: space[3] },
  crewRow: { flexDirection: "row", alignItems: "flex-start", gap: space[3], paddingVertical: space[3], paddingHorizontal: space[4] },
  status: { flexDirection: "row", alignItems: "flex-start", gap: space[1] },
  statusIcon: { marginTop: 3 },
  actions: { width: 120, gap: space[2] },
  checkButton: { alignSelf: "stretch" },
  call: {
    minHeight: control.touch,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space[2],
    paddingHorizontal: space[3],
  },
});
