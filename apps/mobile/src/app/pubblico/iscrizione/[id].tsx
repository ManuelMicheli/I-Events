import Ionicons from "@expo/vector-icons/Ionicons";
import { MAX_GUESTS, placesLeft, registrationErrorMessage, registrationSchema } from "@i-events/core";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, type TextInput } from "react-native";
import { Button } from "@/components/button";
import { Notice } from "@/components/notice";
import { Screen } from "@/components/screen";
import { CardSkeletons, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { InlineError, TextField } from "@/components/text-field";
import { getPublicEvent, register } from "@/lib/public-events";
import { useQuery } from "@/lib/use-query";
import { control, radius, space, useTheme } from "@/theme";

type Field = "name" | "email" | "guests" | "consent";

/**
 * Registration without an account (design pubblico-03), as on the website: the name as on the
 * ticket, the email, how many people (1 to the places left, at most 4) and the consent. The ticket
 * opens as soon as it is done, and stays on this phone.
 */
export default function Register() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery(`pubblico-iscrizione-${id}`, () => getPublicEvent(id));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(1);
  const [consent, setConsent] = useState(false);
  const [fields, setFields] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const event = q.data;
  const maxGuests = event ? Math.max(1, Math.min(MAX_GUESTS, placesLeft(event.capacity, event.registered) ?? MAX_GUESTS)) : MAX_GUESTS;
  const count = Math.min(guests, maxGuests);

  const check = (v: { name: string; email: string; consent: boolean }) => {
    const parsed = registrationSchema.safeParse({ ...v, email: v.email.trim(), guests: count });
    const found: Partial<Record<Field, string>> = {};
    if (!parsed.success) for (const i of parsed.error.issues) found[i.path[0] as Field] ??= i.message;
    return { parsed, found };
  };
  // Errors disappear as soon as the field is fixed.
  const recheck = (key: Field, v: { name: string; email: string; consent: boolean }) => {
    if (fields[key]) setFields((f) => ({ ...f, [key]: check(v).found[key] }));
  };

  const submit = async () => {
    setError(null);
    const { parsed, found } = check({ name, email, consent });
    setFields(found);
    if (!parsed.success) {
      if (found.name) nameRef.current?.focus();
      else if (found.email) emailRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const token = await register(id, parsed.data);
      router.replace({ pathname: "/pubblico/biglietto/[token]", params: { token, momento: "iscritto" } });
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(registrationErrorMessage({ code: err.code, message: err.message ?? "" }));
      if (err.code === "23505") setFields((f) => ({ ...f, email: "Già iscritta a questo evento" }));
      setBusy(false);
    }
  };

  if (q.loading)
    return (
      <Screen>
        <CardSkeletons count={1} />
      </Screen>
    );
  if (q.error || !event)
    return (
      <Screen>
        <ErrorState error={q.error ?? new Error("Questo evento non è più aperto al pubblico.")} onRetry={q.refresh} />
      </Screen>
    );

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ title: "Iscrizione" }} />
      <Screen footerBar footer={<Button block label="Conferma iscrizione" loading={busy} onPress={submit} />}>
        <View style={styles.form}>
          <T variant="title2" accessibilityRole="header">
            Iscriviti a {event.title}
          </T>
          <TextField
            ref={nameRef}
            label="Nome e cognome"
            hint="Come compare sul biglietto."
            placeholder="Come ti chiami"
            value={name}
            onChangeText={(v) => {
              setName(v);
              recheck("name", { name: v, email, consent });
            }}
            autoComplete="name"
            textContentType="name"
            maxLength={120}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            error={fields.name}
          />
          <TextField
            ref={emailRef}
            label="Email"
            hint="La vede solo chi organizza l'evento."
            placeholder="nome@esempio.it"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              recheck("email", { name, email: v, consent });
            }}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            maxLength={254}
            returnKeyType="done"
            error={fields.email}
          />

          <View style={styles.guests}>
            <View style={styles.guestsText}>
              <T variant="bodyStrong">Quante persone?</T>
              <T variant="caption" tone="secondary">
                {maxGuests === 1 ? "Resta un posto" : `Da 1 a ${maxGuests}`}
              </T>
            </View>
            <View style={[styles.stepper, { borderColor: c.borderStrong }]}>
              <StepButton icon="remove" label="Una persona in meno" disabled={count <= 1} onPress={() => setGuests(count - 1)} />
              <View style={[styles.count, { borderColor: c.borderStrong }]} accessible accessibilityLiveRegion="polite" accessibilityLabel={count === 1 ? "1 persona" : `${count} persone`}>
                <T variant="ticket">{count}</T>
              </View>
              <StepButton icon="add" label="Una persona in più" disabled={count >= maxGuests} onPress={() => setGuests(count + 1)} />
            </View>
          </View>

          <View style={styles.consentGroup}>
            <Pressable
              onPress={() => {
                setConsent(!consent);
                recheck("consent", { name, email, consent: !consent });
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consent }}
              style={styles.consent}
            >
              <Ionicons name={consent ? "checkbox" : "square-outline"} size={24} color={fields.consent ? c.danger : c.textPrimary} />
              <T variant="callout" style={styles.flex}>
                Accetto che chi organizza l&apos;evento usi nome ed email per gestire l&apos;ingresso.
              </T>
            </Pressable>
            {fields.consent && <InlineError message={fields.consent} />}
          </View>

          {error && <Notice tone="danger">{error}</Notice>}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function StepButton({ icon, label, disabled, onPress }: { icon: "add" | "remove"; label: string; disabled: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.step, pressed && { backgroundColor: c.bgSubtle }]}
    >
      <Ionicons name={icon} size={20} color={disabled ? c.textDisabled : c.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  form: { gap: space[5] },
  guests: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space[4] },
  guestsText: { flexGrow: 1, flexBasis: 150 },
  stepper: { flexDirection: "row", borderWidth: 1, borderRadius: radius.md, overflow: "hidden" },
  step: { width: control.touch, height: control.touch, alignItems: "center", justifyContent: "center" },
  count: { width: 48, alignItems: "center", justifyContent: "center", borderLeftWidth: 1, borderRightWidth: 1 },
  consentGroup: { gap: space[2] },
  consent: { flexDirection: "row", alignItems: "flex-start", gap: space[3], minHeight: control.touch },
  flex: { flex: 1 },
});
