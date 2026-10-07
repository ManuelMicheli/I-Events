import Ionicons from "@expo/vector-icons/Ionicons";
import { formatPhone, SERVICE_CATALOG } from "@i-events/core";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { contactRow, type Fields } from "@/lib/contact-row";
import type { Contact, ContactRow } from "@/lib/contacts";
import { errorMessage } from "@/lib/errors";
import { space, useTheme } from "@/theme";
import { Button } from "./button";
import { Chip, ChipWrap } from "./chip";
import { Notice } from "./notice";
import { T } from "./text";
import { TextField } from "./text-field";

const text = (c: Contact | undefined): Record<Fields, string> => ({
  name: c?.name ?? "",
  company: c?.company ?? "",
  role_title: c?.role_title ?? "",
  city: c?.city ?? "",
  phone: c?.phone ? formatPhone(c.phone) : "",
  email: c?.email ?? "",
  website: c?.website ?? "",
  notes: c?.notes ?? "",
});

/** New or existing contact: details, services as chips, an internal rating with stars, notes. */
export function ContactForm({
  contact,
  submitLabel,
  onSave,
  onCancel,
}: {
  contact?: Contact;
  submitLabel: string;
  onSave: (row: ContactRow) => Promise<void>;
  onCancel?: () => void;
}) {
  const [v, setV] = useState(() => text(contact));
  const [services, setServices] = useState<string[]>(contact?.services ?? []);
  const [rating, setRating] = useState<number | null>(contact?.rating ?? null);
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const field = (key: Fields) => ({
    value: v[key],
    error: errors[key],
    onChangeText: (t: string) => setV((s) => ({ ...s, [key]: t })),
  });
  const toggle = (key: string) => setServices((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]));

  const save = async () => {
    setFailure(null);
    const checked = contactRow(v, services, rating);
    setErrors(checked.errors ?? {});
    if (!checked.row) {
      setFailure("Controlla i campi evidenziati.");
      return;
    }
    setSaving(true);
    try {
      await onSave(checked.row);
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      setFailure(code === "23505" ? "Esiste già un contatto con questa email o questo telefono." : errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      <TextField label="Nome" {...field("name")} maxLength={200} autoComplete="name" textContentType="name" />
      <TextField label="Azienda" {...field("company")} maxLength={200} textContentType="organizationName" />
      <TextField label="Ruolo" {...field("role_title")} maxLength={120} textContentType="jobTitle" />
      <TextField label="Città o zona" {...field("city")} maxLength={120} />
      <TextField label="Telefono" {...field("phone")} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
      <TextField
        label="Email"
        {...field("email")}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextField label="Sito web" {...field("website")} maxLength={300} keyboardType="url" autoCapitalize="none" autoCorrect={false} />

      <View style={styles.group} accessibilityRole="none">
        <T variant="label" tone="secondary">
          Servizi
        </T>
        <ChipWrap>
          {SERVICE_CATALOG.map((s) => (
            <Chip key={s.key} multi label={s.name.it} selected={services.includes(s.key)} onPress={() => toggle(s.key)} />
          ))}
        </ChipWrap>
      </View>

      <Stars value={rating} onChange={setRating} />

      <TextField label="Note" {...field("notes")} maxLength={5000} multiline textAlignVertical="top" style={styles.notes} />

      {failure && <Notice tone="danger">{failure}</Notice>}
      <View style={styles.actions}>
        <Button label={submitLabel} loading={saving} block onPress={save} />
        {onCancel && <Button variant="tertiary" label="Annulla" align="center" onPress={onCancel} />}
      </View>
    </View>
  );
}

/** Internal rating, 1 to 5 stars in Grafite. Tapping the chosen star again removes the rating. */
function Stars({ value, onChange }: { value: number | null; onChange: (n: number | null) => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.group}>
      <T variant="label" tone="secondary">
        Valutazione interna
      </T>
      <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel="Valutazione interna">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(value === n ? null : n)}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === n }}
            accessibilityLabel={n === 1 ? "1 stella" : `${n} stelle`}
            style={styles.star}
          >
            <Ionicons
              name={value !== null && n <= value ? "star" : "star-outline"}
              size={24}
              color={value !== null && n <= value ? c.textPrimary : c.borderControl}
            />
          </Pressable>
        ))}
      </View>
      <T variant="caption" tone="secondary">
        {value === null ? "Nessuna valutazione. La vede solo la tua agenzia." : "Tocca di nuovo la stella scelta per toglierla."}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space[4] },
  group: { gap: space[2] },
  stars: { flexDirection: "row" },
  star: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  notes: { minHeight: 96 },
  actions: { gap: space[2], marginTop: space[2] },
});
