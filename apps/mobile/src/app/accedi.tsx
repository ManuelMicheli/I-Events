import { router } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { Button } from "@/components/button";
import { LogoSymbol } from "@/components/logo";
import { T } from "@/components/text";
import { InlineError, TextField } from "@/components/text-field";
import { errorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { space, useTheme } from "@/theme";

type Mode = "signin" | "signup";
type Fields = { fullName?: string; email?: string; password?: string };

const emailSchema = z.email();

/** Validates on submit; returns the message for each field that needs fixing. */
function validate(mode: Mode, v: { fullName: string; email: string; password: string }): Fields {
  const out: Fields = {};
  if (mode === "signup" && !v.fullName.trim()) out.fullName = "Scrivi nome e cognome.";
  if (!v.email.trim()) out.email = "Scrivi la tua email.";
  else if (!emailSchema.safeParse(v.email.trim()).success) out.email = "Controlla l'email: deve essere come nome@azienda.it.";
  if (!v.password) out.password = "Scrivi la password.";
  else if (mode === "signup" && v.password.length < 8) out.password = "Scegli una password di almeno 8 caratteri.";
  return out;
}

export default function SignInScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fields, setFields] = useState<Fields>({});
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Errors disappear as soon as the field is fixed ("reward early, punish late").
  const revalidate = (key: keyof Fields, next: { fullName: string; email: string; password: string }) => {
    if (fields[key]) setFields((f) => ({ ...f, [key]: validate(mode, next)[key] }));
  };

  const submit = async () => {
    setError(null);
    setInfo(null);
    const found = validate(mode, { fullName, email, password });
    setFields(found);
    const first = (["fullName", "email", "password"] as const).find((k) => found[k]);
    if (first) {
      ({ fullName: nameRef, email: emailRef, password: passwordRef })[first].current?.focus();
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) setError(e.message.toLowerCase().includes("invalid") ? "Email o password non corretti." : errorMessage(e));
      } else {
        const { data, error: e } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim() } } });
        if (e) setError(e.code === "user_already_exists" ? "Esiste già un account con questa email: accedi." : errorMessage(e));
        else if (!data.session) setInfo("Ti abbiamo inviato un'email: conferma l'account e poi accedi.");
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setFields({});
    setError(null);
    setInfo(null);
  };

  return (
    <KeyboardAvoidingView style={[styles.fill, { backgroundColor: c.bgApp }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space[12], paddingBottom: insets.bottom + space[8] }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.intro}>
          <LogoSymbol width={56} />
          <T variant="title1" accessibilityRole="header">
            {mode === "signin" ? "Accedi" : "Crea il tuo account"}
          </T>
          <T variant="body" tone="secondary">
            {mode === "signin"
              ? "Eventi, fornitori e richieste della tua organizzazione, sempre con te."
              : "Poi crei la tua organizzazione o accetti un invito."}
          </T>
        </View>

        <View style={styles.form}>
          {mode === "signup" && (
            <TextField
              ref={nameRef}
              label="Nome e cognome"
              value={fullName}
              onChangeText={(v) => {
                setFullName(v);
                revalidate("fullName", { fullName: v, email, password });
              }}
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              error={fields.fullName}
            />
          )}
          <TextField
            ref={emailRef}
            label="Email"
            placeholder="nome@azienda.it"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              revalidate("email", { fullName, email: v, password });
            }}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={fields.email}
          />
          <TextField
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              revalidate("password", { fullName, email, password: v });
            }}
            secureTextEntry
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            textContentType={mode === "signin" ? "password" : "newPassword"}
            returnKeyType="go"
            onSubmitEditing={submit}
            hint={mode === "signup" ? "Almeno 8 caratteri." : undefined}
            error={fields.password}
          />
          {error && <InlineError message={error} />}
          {info && (
            <T variant="callout" tone="success" accessibilityLiveRegion="polite">
              {info}
            </T>
          )}
          <Button block label={mode === "signin" ? "Accedi" : "Crea account"} onPress={submit} loading={busy} />
        </View>

        <View style={styles.switch}>
          <T variant="callout" tone="secondary">
            {mode === "signin" ? "Non hai ancora un account?" : "Hai già un account?"}
          </T>
          <Button variant="tertiary" align="center" label={mode === "signin" ? "Crea un account" : "Accedi"} onPress={switchMode} />
        </View>

        <View style={[styles.public, { borderTopColor: c.borderDefault }]}>
          <T variant="callout" tone="secondary">
            Cerchi un evento a cui andare?
          </T>
          <Button variant="secondary" align="center" icon="compass-outline" label="Eventi aperti al pubblico" onPress={() => router.push("/pubblico")} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: space[4], gap: space[8], width: "100%", maxWidth: 480, alignSelf: "center" },
  intro: { gap: space[3] },
  form: { gap: space[5] },
  switch: { alignItems: "center", gap: space[1] },
  public: { alignItems: "center", gap: space[3], paddingTop: space[6], borderTopWidth: StyleSheet.hairlineWidth },
});
