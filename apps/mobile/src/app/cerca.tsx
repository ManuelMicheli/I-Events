import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LensIcon } from "@/components/icons";
import { NavIcon, type NavIconName } from "@/components/nav-icons";
import { T } from "@/components/text";
import { easeOut, useReduceMotion } from "@/lib/motion";
import { NAV } from "@/lib/nav";
import { searchApp, type SearchHit } from "@/lib/search";
import { useActiveOrg } from "@/lib/session";
import { fonts, radius, space, type as typeScale, useTheme } from "@/theme";

type Row = { key: string; href: SearchHit["href"]; title: string; meta?: string; group: string; icon: NavIconName };

const GROUP_ICON: Record<SearchHit["group"], NavIconName> = { Richieste: "requests", Eventi: "events", Rubrica: "contacts" };
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Search (Carta item 22, A3), as the website's ⌘K palette: the lens in the top bar opens it. Without
 * words it offers the sections; with words it filters them and finds requests, events and contacts
 * by name, asking 150 ms after the last letter. Results cascade in.
 */
export default function SearchScreen() {
  const { c, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const org = useActiveOrg();
  const [focused, setFocused] = useState(true);
  // The same focus as the other fields: Grafite border and a 4 halo.
  const ring = scheme === "dark" ? "rgba(241,236,228,0.16)" : "rgba(28,27,25,0.08)";
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const asked = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<TextInput>(null);

  const type = (value: string) => {
    setQuery(value);
    clearTimeout(timer.current);
    const q = value.trim();
    const n = ++asked.current;
    setFailed(false);
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      let found: SearchHit[] = [];
      let error = false;
      try {
        found = await searchApp(org, q);
      } catch {
        error = true;
      }
      if (n !== asked.current) return;
      setHits(found);
      setFailed(error);
      setSearching(false);
    }, 150);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const rows = useMemo<Row[]>(() => {
    const q = fold(query.trim());
    const sections = NAV[org.type]
      .filter((s) => !q || fold(s.label).includes(q))
      .map((s) => ({ key: `s-${s.label}`, href: s.href, title: s.label, group: q ? "Sezioni" : "Vai a", icon: s.icon }));
    return [...sections, ...hits.map((h, i) => ({ ...h, key: `${h.group}-${i}-${h.title}`, icon: GROUP_ICON[h.group] }))];
  }, [org.type, query, hits]);

  const groups = rows.reduce<{ name: string; rows: (Row & { i: number })[] }[]>((acc, r, i) => {
    const last = acc[acc.length - 1];
    if (last?.name === r.group) last.rows.push({ ...r, i });
    else acc.push({ name: r.group, rows: [{ ...r, i }] });
    return acc;
  }, []);

  return (
    <View style={[styles.fill, { backgroundColor: c.bgApp }]}>
      <View style={styles.top}>
        <View style={[styles.ring, { borderColor: focused ? ring : "transparent" }]}>
          <Pressable
            onPress={() => input.current?.focus()}
            style={[styles.field, { backgroundColor: c.bgSurface, borderColor: focused ? c.focus : c.borderControl }]}
            accessible={false}
          >
            <LensIcon color={c.textSecondary} look={searching} />
            <TextInput
              ref={input}
              value={query}
              onChangeText={type}
              autoFocus
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              maxLength={60}
              accessibilityLabel="Cerca sezioni, richieste, eventi e contatti"
              placeholder={org.type === "agency" ? "Cerca richieste, eventi, contatti…" : "Cerca richieste, eventi…"}
              placeholderTextColor={c.textSecondary}
              selectionColor={c.accentFill}
              style={[styles.input, { color: c.textPrimary }]}
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => {
                  type("");
                  input.current?.focus();
                }}
                accessibilityRole="button"
                accessibilityLabel="Cancella la ricerca"
                style={({ pressed }) => [styles.clear, pressed && { backgroundColor: c.bgSubtle }]}
              >
                <Ionicons name="close-circle" size={20} color={c.textSecondary} />
              </Pressable>
            )}
          </Pressable>
        </View>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space[8] }]}
      >
        {groups.map((g) => (
          <View key={g.name} accessibilityLabel={g.name} style={styles.group}>
            <T variant="label" tone="secondary" accessibilityRole="header" style={styles.groupName}>
              {g.name}
            </T>
            {g.rows.map((r, j) => (
              <Result key={r.key} row={r} order={j} />
            ))}
          </View>
        ))}
        {rows.length === 0 && (
          <T variant="callout" tone="secondary" style={styles.empty}>
            {searching ? "Cerco…" : failed ? "Non riusciamo a cercare adesso. Controlla la connessione e riprova." : `Nessun risultato per “${query.trim()}”`}
          </T>
        )}
        {rows.length > 0 && failed && (
          <T variant="callout" tone="secondary" style={styles.empty}>
            Non riusciamo a cercare richieste ed eventi adesso. Controlla la connessione e riprova.
          </T>
        )}
      </ScrollView>
    </View>
  );
}

/** One result: its section icon (it moves when touched), the name and, under it, who and when. */
function Result({ row, order }: { row: Row; order: number }) {
  const { c } = useTheme();
  const reduce = useReduceMotion();
  const [play, setPlay] = useState(0);
  const [shown] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) {
      shown.setValue(1);
      return;
    }
    // The cascade: each row 30 ms after the one above, rising 4.
    const a = Animated.timing(shown, { toValue: 1, duration: 180, delay: Math.min(order, 8) * 30, easing: easeOut, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [shown, order, reduce]);
  return (
    <Animated.View style={{ opacity: shown, transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }] }}>
      <Pressable
        onPressIn={() => setPlay((n) => n + 1)}
        onPress={() => router.push(row.href)}
        accessibilityRole="button"
        accessibilityLabel={row.meta ? `${row.title}, ${row.meta}` : row.title}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.bgSubtle }]}
      >
        <NavIcon name={row.icon} color={c.textSecondary} hole={c.bgApp} filled={false} play={play} />
        <View style={styles.texts}>
          <T variant="body" numberOfLines={1}>
            {row.title}
          </T>
          {row.meta && (
            <T variant="callout" tone="secondary" numberOfLines={1}>
              {row.meta}
            </T>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { paddingHorizontal: space[4] - 4, paddingTop: space[2] - 4, paddingBottom: space[3] - 4 },
  ring: { borderWidth: 4, borderRadius: radius.md + 4 },
  field: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingLeft: space[3],
    paddingRight: 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  // The field draws its own focus; the browser's outline would sit inside it (web build).
  input: { flex: 1, minHeight: 44, fontFamily: fonts.sans["400"], fontSize: typeScale.body.fontSize, paddingVertical: 0, outlineWidth: 0 },
  clear: { width: 44, height: 44, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: space[4], gap: space[4] },
  group: { gap: 0 },
  groupName: { paddingBottom: space[1] },
  row: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: space[3], marginHorizontal: -space[2], paddingHorizontal: space[2], paddingVertical: space[1], borderRadius: radius.sm },
  texts: { flex: 1, minWidth: 0 },
  empty: { textAlign: "center", paddingVertical: space[6] },
});
