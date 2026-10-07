import Ionicons from "@expo/vector-icons/Ionicons";
import {
  EVENT_TYPE_INFO,
  EVENT_TYPES,
  monthGrid,
  onDay,
  shiftMonth,
  todayInItaly,
  type EventType,
} from "@i-events/core";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { TypeSquare } from "@/components/event-type";
import { PublicEventRow, PublicExit } from "@/components/public";
import { Screen } from "@/components/screen";
import { CardSkeletons, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import {
  dayLabel,
  eventLine,
  listPublicEvents,
  longDay,
  monthLabel,
  priceLabel,
} from "@/lib/public-events";
import { useQuery } from "@/lib/use-query";
import { control, radius, space, useTheme } from "@/theme";

const WEEKDAYS = ["L", "M", "M", "G", "V", "S", "D"];

/**
 * Calendario (M2), as on the website: the month with the type squares under the days that have
 * events, the legend, and the list of the chosen day. The grid runs nearly edge to edge so every
 * day stays a 44 point target on the smallest phones.
 */
export default function PublicCalendar() {
  const { c } = useTheme();
  const today = todayInItaly();
  const thisMonth = today.slice(0, 7);
  const firstMonth = shiftMonth(thisMonth, -12);
  const [month, setMonth] = useState(thisMonth);
  const [picked, setPicked] = useState<string | null>(null);
  const [y, m] = month.split("-").map(Number) as [number, number];
  const weeks = monthGrid(y, m);
  const days = weeks.flat().filter((d): d is string => d !== null);
  const q = useQuery(`pubblico-calendario-${month}`, () => listPublicEvents(days[0], days.at(-1)));
  const events = q.data ?? [];
  const typesOn = (day: string) => {
    const on = events.filter((e) => onDay(e, day));
    return { count: on.length, types: [...new Set(on.map((e) => e.event_type))].slice(0, 3) };
  };
  const firstWithEvents = days.find(
    (d) => (month < thisMonth || d >= today) && typesOn(d).count > 0,
  );
  const chosen = picked?.startsWith(month)
    ? picked
    : month === thisMonth
      ? (firstWithEvents ?? today)
      : (firstWithEvents ?? days[0]!);
  const dayEvents = events.filter((e) => onDay(e, chosen));
  const nextDay = days.find((d) => d > chosen && typesOn(d).count > 0);
  const go = (delta: number) => {
    setMonth(shiftMonth(month, delta));
    setPicked(null);
  };

  return (
    <Screen
      title="Calendario"
      actions={<PublicExit />}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      header={
        <T variant="body" tone="secondary">
          Gli eventi aperti al pubblico, giorno per giorno.
        </T>
      }
    >
      <View style={[styles.month, { backgroundColor: c.bgSurface, borderColor: c.borderDefault }]}>
        <View style={styles.monthHead}>
          <T
            variant="title3"
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            style={styles.flex}
          >
            {monthLabel(month)}
          </T>
          {month > firstMonth ? (
            <MonthButton dir="prev" onPress={() => go(-1)} />
          ) : (
            <View style={styles.monthButtonSpace} />
          )}
          <MonthButton dir="next" onPress={() => go(1)} />
        </View>

        <View
          style={styles.week}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {WEEKDAYS.map((d, i) => (
            <T key={i} variant="mono" tone="secondary" style={styles.weekday}>
              {d}
            </T>
          ))}
        </View>
        {weeks.map((week, w) => (
          <View key={w} style={styles.week}>
            {week.map((day, i) => {
              if (!day) return <View key={i} style={styles.cell} />;
              const { count, types } = typesOn(day);
              // Looking back (up to a year): a past day opens only when something went on stage.
              const past = day < today && typesOn(day).count === 0;
              const selected = day === chosen;
              const label = `${longDay(day, null)}${day === today ? ", oggi" : ""}: ${count === 0 ? "nessun evento" : count === 1 ? "1 evento" : `${count} eventi`}`;
              return (
                <Pressable
                  key={i}
                  disabled={past}
                  onPress={() => setPicked(day)}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected, disabled: past }}
                  style={({ pressed }) => [
                    styles.cell,
                    styles.day,
                    selected
                      ? { borderColor: c.accentFill, backgroundColor: c.accentSubtle }
                      : {
                          borderColor: "transparent",
                          backgroundColor: pressed ? c.bgSubtle : "transparent",
                        },
                  ]}
                >
                  <T
                    variant={day === today ? "ticket" : "mono"}
                    tone={past ? "secondary" : "primary"}
                    style={day === today && styles.today}
                  >
                    {Number(day.slice(8))}
                  </T>
                  <View style={styles.squares}>
                    {types.map((t) =>
                      t ? (
                        <TypeSquare key={t} type={t} />
                      ) : (
                        <View
                          key="none"
                          style={[styles.noType, { backgroundColor: c.borderControl }]}
                        />
                      ),
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
        <Legend types={EVENT_TYPES} />
      </View>

      <View style={styles.dayList}>
        <T variant="title3" accessibilityRole="header">
          {longDay(chosen, null)}
          {chosen === today && (
            <T variant="title3" tone="secondary">
              {" "}
              · oggi
            </T>
          )}
        </T>
        {q.loading ? (
          <CardSkeletons count={1} />
        ) : q.error && !q.data ? (
          <ErrorState error={q.error} onRetry={q.refresh} />
        ) : dayEvents.length === 0 ? (
          <View style={[styles.emptyDay, { backgroundColor: c.bgSubtle }]}>
            <T variant="callout" tone="secondary">
              Nessun evento aperto al pubblico in questo giorno.
            </T>
            {nextDay && (
              <Button
                variant="secondary"
                size="small"
                label={`Vai al prossimo: ${dayLabel(nextDay, null)}`}
                onPress={() => setPicked(nextDay)}
              />
            )}
          </View>
        ) : (
          dayEvents.map((e) => (
            <PublicEventRow
              key={e.id}
              type={e.event_type}
              image={e.image}
              title={e.title}
              line={eventLine(e)}
              live={e.status === "live"}
              extra={priceLabel(e, today)}
              onPress={() =>
                router.push({ pathname: "/pubblico/evento/[id]", params: { id: e.id } })
              }
            />
          ))
        )}
      </View>
    </Screen>
  );
}

function MonthButton({ dir, onPress }: { dir: "prev" | "next"; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={dir === "prev" ? "Mese precedente" : "Mese successivo"}
      style={({ pressed }) => [
        styles.monthButton,
        { borderColor: c.borderStrong, backgroundColor: pressed ? c.bgSubtle : c.bgSurface },
      ]}
    >
      <Ionicons
        name={dir === "prev" ? "chevron-back" : "chevron-forward"}
        size={20}
        color={c.textPrimary}
      />
    </Pressable>
  );
}

function Legend({ types }: { types: readonly EventType[] }) {
  const { c } = useTheme();
  return (
    <View
      style={[styles.legend, { borderTopColor: c.borderDefault }]}
      accessible
      accessibilityLabel={`Legenda: ${types.map((t) => EVENT_TYPE_INFO[t].label).join(", ")}`}
    >
      {types.map((t) => (
        <View key={t} style={styles.legendItem}>
          <TypeSquare type={t} />
          <T variant="label" tone="secondary">
            {EVENT_TYPE_INFO[t].label}
          </T>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  month: {
    marginHorizontal: -space[3],
    paddingHorizontal: space[1],
    paddingVertical: space[4],
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: space[1],
  },
  monthHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[1],
    paddingHorizontal: space[3],
    paddingBottom: space[2],
  },
  monthButton: {
    width: control.touch,
    height: control.touch,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  monthButtonSpace: { width: control.touch },
  week: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center" },
  cell: { flex: 1, height: 48 },
  day: {
    alignItems: "center",
    justifyContent: "center",
    gap: space[1],
    borderWidth: 1,
    borderRadius: radius.md,
  },
  today: { textDecorationLine: "underline" },
  squares: { height: 8, flexDirection: "row", gap: 3 },
  noType: { width: 8, height: 8, borderRadius: 2 },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: space[4],
    rowGap: space[2],
    marginTop: space[3],
    paddingTop: space[4],
    paddingHorizontal: space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: space[2] },
  dayList: { gap: space[3] },
  emptyDay: { borderRadius: radius.md, padding: space[4], gap: space[3], alignItems: "flex-start" },
  flex: { flex: 1 },
});
