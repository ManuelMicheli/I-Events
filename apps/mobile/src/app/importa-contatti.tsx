import Ionicons from "@expo/vector-icons/Ionicons";
import { formatPhone, SERVICE_CATALOG, type ContactDraft, type ServiceKey } from "@i-events/core";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { ListRow } from "@/components/rows";
import { Segmented } from "@/components/segmented";
import { Sheet } from "@/components/sheet";
import { T } from "@/components/text";
import { InlineError, TextField } from "@/components/text-field";
import { env, siteOnline } from "@/lib/env";
import { errorMessage } from "@/lib/errors";
import {
  getContactsAccess,
  importToAddressBook,
  readPhoneContacts,
  requestContactsAccess,
  suggestServices,
  type ContactsAccess,
} from "@/lib/phone-contacts";
import { useActiveOrg } from "@/lib/session";
import { control, radius, space, useTheme } from "@/theme";

const SERVICE_NAME = Object.fromEntries(SERVICE_CATALOG.map((s) => [s.key, s.name.it])) as Record<ServiceKey, string>;

type Step =
  | { kind: "start"; access: ContactsAccess | null }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "choose" }
  | { kind: "done"; created: number; merged: number };

/**
 * Imports suppliers from the phone's address book into the agency's: the person picks the contacts, each one with a
 * proposed service they can change, and the address book merges the ones it already has.
 */
export default function ImportContactsScreen() {
  const org = useActiveOrg();
  const [step, setStep] = useState<Step>({ kind: "start", access: null });
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    getContactsAccess().then(
      (access) => setStep({ kind: "start", access }),
      () => setStep({ kind: "start", access: "unsupported" }),
    );
  }, []);

  const load = async () => {
    const access = await requestContactsAccess().catch((): ContactsAccess => "denied");
    if (access !== "granted") {
      setStep({ kind: "start", access });
      return;
    }
    setStep({ kind: "loading" });
    try {
      const read = await readPhoneContacts();
      const services = await suggestServices(org.id, read);
      const withServices = read.map((c, i) => ({ ...c, services: services[i] ?? c.services }));
      setContacts(withServices);
      // Suppliers the app recognised start selected; friends and family stay out unless chosen.
      setSelected(new Set(withServices.flatMap((c, i) => (c.services.length > 0 ? [i] : []))));
      setStep({ kind: "choose" });
    } catch (e) {
      setStep({ kind: "error", message: errorMessage(e) });
    }
  };

  const save = async () => {
    setImporting(true);
    setImportError(null);
    try {
      const r = await importToAddressBook(
        org.id,
        contacts.filter((_, i) => selected.has(i)),
      );
      setStep({ kind: "done", ...r });
    } catch (e) {
      setImportError(errorMessage(e));
    } finally {
      setImporting(false);
    }
  };

  if (step.kind === "start") return <Start access={step.access} orgName={org.name} onOpen={load} />;
  if (step.kind === "loading") return <Loading />;
  if (step.kind === "error")
    return (
      <Message icon="alert-circle-outline" danger title="Non riusciamo a leggere la rubrica" body={`${step.message} Riprova tra poco.`}>
        <Button label="Riprova" icon="refresh" align="center" onPress={load} />
      </Message>
    );
  if (step.kind === "done")
    return (
      <Message
        icon="checkmark-circle-outline"
        title="Rubrica aggiornata"
        body={[
          step.created === 1 ? "1 nuovo contatto." : `${step.created} nuovi contatti.`,
          step.merged === 0
            ? null
            : step.merged === 1
              ? "1 era già in rubrica ed è stato aggiornato."
              : `${step.merged} erano già in rubrica e sono stati aggiornati.`,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Button label="Fatto" align="center" onPress={() => router.back()} />
        {siteOnline && (
          <Button
            variant="secondary"
            align="center"
            icon="open-outline"
            label="Apri la rubrica sul sito"
            onPress={() => WebBrowser.openBrowserAsync(`${env.siteUrl}/pro/rubrica`)}
          />
        )}
      </Message>
    );
  return (
    <Choose
      contacts={contacts}
      selected={selected}
      onToggle={(i) =>
        setSelected((s) => {
          const next = new Set(s);
          if (next.has(i)) next.delete(i);
          else next.add(i);
          return next;
        })
      }
      onSelectMany={(indexes, on) =>
        setSelected((s) => {
          const next = new Set(s);
          for (const i of indexes)
            if (on) next.add(i);
            else next.delete(i);
          return next;
        })
      }
      onServices={(i, services) => setContacts((list) => list.map((c, j) => (j === i ? { ...c, services } : c)))}
      importing={importing}
      error={importError}
      onImport={save}
    />
  );
}

function Start({ access, orgName, onOpen }: { access: ContactsAccess | null; orgName: string; onOpen: () => void }) {
  if (access === null) return <Loading />;
  if (access === "unsupported")
    return (
      <Message icon="phone-portrait-outline" title="Disponibile sul telefono" body="L'import dalla rubrica funziona nell'app per iPhone e Android." />
    );
  if (access === "blocked")
    return (
      <Message
        icon="people-outline"
        title="Accesso alla rubrica spento"
        body="Per importare i contatti, attiva l'accesso per I-Events nelle impostazioni del telefono."
      >
        <Button label="Impostazioni" icon="settings-outline" align="center" onPress={() => Linking.openSettings()} />
      </Message>
    );
  return (
    <Message
      icon="people-outline"
      title="Porta i fornitori dal telefono"
      body={`Scegli i contatti da aggiungere alla rubrica di ${orgName}. Per ognuno ti proponiamo il servizio, e puoi cambiarlo.`}
    >
      <Button label="Apri la rubrica" icon="arrow-forward" align="center" onPress={onOpen} />
      {access === "denied" && (
        <T variant="callout" tone="secondary" style={styles.center}>
          Senza il permesso non possiamo leggere i contatti. Il telefono te lo chiederà di nuovo.
        </T>
      )}
    </Message>
  );
}

function Loading() {
  const { c } = useTheme();
  return (
    <View style={[styles.centered, { backgroundColor: c.bgApp }]}>
      <ActivityIndicator color={c.textSecondary} />
      <T variant="callout" tone="secondary">
        Leggiamo la rubrica e proponiamo i servizi…
      </T>
    </View>
  );
}

function Message({
  icon,
  title,
  body,
  danger = false,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  body: string;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <ScrollView style={{ backgroundColor: c.bgApp }} contentContainerStyle={styles.message}>
      <View style={[styles.iconCircle, { backgroundColor: danger ? c.dangerBg : c.accentSubtle }]}>
        <Ionicons name={icon} size={28} color={danger ? c.danger : c.accentText} />
      </View>
      <T variant="title2" style={styles.center} accessibilityRole="header">
        {title}
      </T>
      <T variant="body" tone="secondary" style={styles.center}>
        {body}
      </T>
      {children && <View style={styles.messageActions}>{children}</View>}
    </ScrollView>
  );
}

type Filter = "suppliers" | "all";

function Choose({
  contacts,
  selected,
  onToggle,
  onSelectMany,
  onServices,
  importing,
  error,
  onImport,
}: {
  contacts: ContactDraft[];
  selected: Set<number>;
  onToggle: (i: number) => void;
  onSelectMany: (indexes: number[], on: boolean) => void;
  onServices: (i: number, services: ServiceKey[]) => void;
  importing: boolean;
  error: string | null;
  onImport: () => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const suppliers = useMemo(() => contacts.flatMap((ct, i) => (ct.services.length > 0 ? [i] : [])), [contacts]);
  const [filter, setFilter] = useState<Filter>(suppliers.length > 0 ? "suppliers" : "all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<number | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = filter === "suppliers" ? suppliers : contacts.map((_, i) => i);
    if (!q) return base;
    return base.filter((i) => {
      const ct = contacts[i]!;
      return [ct.name, ct.company, ct.phone, ct.email].some((v) => v?.toLowerCase().includes(q));
    });
  }, [contacts, suppliers, filter, query]);
  const allVisibleSelected = visible.length > 0 && visible.every((i) => selected.has(i));
  const count = selected.size;

  return (
    <View style={[styles.fill, { backgroundColor: c.bgApp }]}>
      <FlatList
        data={visible}
        keyExtractor={(i) => String(i)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <T variant="callout" tone="secondary">
              {suppliers.length > 0
                ? `Abbiamo riconosciuto ${suppliers.length === 1 ? "1 fornitore" : `${suppliers.length} fornitori`} su ${contacts.length} contatti: sono già selezionati.`
                : `Nessun fornitore riconosciuto tra ${contacts.length} contatti: scegli tu quali importare.`}
            </T>
            <Segmented
              value={filter}
              options={[
                { value: "suppliers", label: `Fornitori (${suppliers.length})` },
                { value: "all", label: `Tutti (${contacts.length})` },
              ]}
              onChange={setFilter}
            />
            <TextField
              label="Cerca"
              placeholder="Nome, azienda o telefono"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              returnKeyType="search"
            />
            {visible.length > 0 && (
              <View style={styles.selectionBar}>
                <T variant="callout" tone="secondary" style={styles.flex}>
                  {count === 1 ? "1 selezionato" : `${count} selezionati`}
                </T>
                <Button
                  variant="tertiary"
                  label={allVisibleSelected ? "Togli la selezione" : "Seleziona tutti"}
                  onPress={() => onSelectMany(visible, !allVisibleSelected)}
                />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <T variant="callout" tone="secondary" style={styles.center}>
            {query ? "Nessun contatto trovato." : "Nessun contatto in questo elenco."}
          </T>
        }
        ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.borderStrong }} />}
        renderItem={({ item: i }) => (
          <ContactRow contact={contacts[i]!} selected={selected.has(i)} onToggle={() => onToggle(i)} onEdit={() => setEditing(i)} />
        )}
      />
      <View style={[styles.footer, { backgroundColor: c.bgApp, borderTopColor: c.borderDefault, paddingBottom: insets.bottom + space[3] }]}>
        {error && <InlineError message={error} />}
        <Button
          block
          align="center"
          label={count === 0 ? "Scegli i contatti da importare" : count === 1 ? "Importa 1 contatto" : `Importa ${count} contatti`}
          disabled={count === 0}
          loading={importing}
          onPress={onImport}
        />
      </View>
      <ServicesSheet
        contact={editing === null ? null : contacts[editing]!}
        onChange={(services) => editing !== null && onServices(editing, services)}
        onClose={() => setEditing(null)}
      />
    </View>
  );
}

function ContactRow({ contact, selected, onToggle, onEdit }: { contact: ContactDraft; selected: boolean; onToggle: () => void; onEdit: () => void }) {
  const { c } = useTheme();
  const detail = [contact.company, contact.phone ? formatPhone(contact.phone) : contact.email].filter(Boolean).join(" · ");
  const services = contact.services.map((s) => SERVICE_NAME[s]).join(", ");
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={[contact.name, detail, services || "Nessun servizio"].filter(Boolean).join(", ")}
        style={({ pressed }) => [styles.rowMain, pressed && { backgroundColor: c.bgSubtle }]}
      >
        <Ionicons name={selected ? "checkbox" : "square-outline"} size={24} color={selected ? c.accentText : c.textSecondary} />
        <View style={styles.texts}>
          <T variant="bodyStrong">{contact.name}</T>
          {detail ? (
            <T variant="callout" tone="secondary">
              {detail}
            </T>
          ) : null}
          <T variant="callout" tone={services ? "accent" : "secondary"}>
            {services || "Nessun servizio"}
          </T>
        </View>
      </Pressable>
      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={`Cambia il servizio di ${contact.name}`}
        hitSlop={4}
        style={({ pressed }) => [styles.edit, pressed && { backgroundColor: c.bgSubtle }]}
      >
        <Ionicons name="create-outline" size={22} color={c.textPrimary} />
      </Pressable>
    </View>
  );
}

function ServicesSheet({ contact, onChange, onClose }: { contact: ContactDraft | null; onChange: (s: ServiceKey[]) => void; onClose: () => void }) {
  const current = contact?.services ?? [];
  return (
    <Sheet visible={contact !== null} title={contact ? `Servizio di ${contact.name}` : ""} onClose={onClose}>
      <ScrollView style={styles.sheetList}>
        {SERVICE_CATALOG.map((s) => {
          const key = s.key as ServiceKey;
          const on = current.includes(key);
          return (
            <ListRow key={key} title={s.name.it} selected={on} onPress={() => onChange(on ? current.filter((k) => k !== key) : [...current, key])} />
          );
        })}
      </ScrollView>
      <Button block align="center" label="Fatto" onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  selectionBar: { flexDirection: "row", alignItems: "center", gap: space[2], marginBottom: -space[2] },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[3], padding: space[6] },
  center: { textAlign: "center" },
  message: { flexGrow: 1, alignItems: "center", justifyContent: "center", gap: space[3], padding: space[6] },
  messageActions: { alignItems: "center", gap: space[3], marginTop: space[3] },
  iconCircle: { width: 64, height: 64, borderRadius: radius.full, alignItems: "center", justifyContent: "center", marginBottom: space[2] },
  list: { paddingHorizontal: space[4], paddingBottom: space[6] },
  listHeader: { gap: space[4], paddingTop: space[4], paddingBottom: space[3] },
  row: { flexDirection: "row", alignItems: "center", gap: space[1] },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    gap: space[3],
    alignItems: "flex-start",
    paddingVertical: space[3],
    marginHorizontal: -space[2],
    paddingHorizontal: space[2],
    borderRadius: radius.sm,
  },
  texts: { flex: 1, gap: space[1] },
  edit: { width: control.l, height: control.l, alignItems: "center", justifyContent: "center", borderRadius: radius.full },
  footer: { paddingHorizontal: space[4], paddingTop: space[3], borderTopWidth: StyleSheet.hairlineWidth, gap: space[2] },
  sheetList: { maxHeight: 420 },
});
