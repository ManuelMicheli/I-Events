import { slugify, type OrgType } from "@i-events/core";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { LogoSymbol } from "@/components/logo";
import { Segmented } from "@/components/segmented";
import { T } from "@/components/text";
import { InlineError, TextField } from "@/components/text-field";
import { errorMessage } from "@/lib/errors";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { space, useTheme } from "@/theme";

const TYPE_HINT: Record<OrgType, string> = {
  agency: "Ricevi le richieste delle aziende, prepari proposte e organizzi gli eventi.",
  client: "Chiedi eventi e campagne alle agenzie e confronti i preventivi.",
  supplier: "Ricevi dalle agenzie le richieste per il tuo servizio: DJ, sicurezza, catering e altro.",
};

/** Signed in without an organization: create one here, or join through an invite and refresh. */
export default function NoOrganizationScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { reloadOrgs, setActiveOrg, signOut, session } = useSession();
  const [type, setType] = useState<OrgType>("agency");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [error, setError] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);

  const create = async () => {
    const trimmed = name.trim();
    setError(undefined);
    if (trimmed.length < 2) return setNameError("Scrivi il nome, almeno 2 caratteri.");
    setNameError(undefined);
    setCreating(true);
    const { data, error: e } = await supabase.rpc("create_organization", {
      p_type: type,
      p_name: trimmed,
      p_slug: slugify(trimmed) || "org",
      p_city: city.trim() || undefined,
    });
    if (e) {
      setCreating(false);
      return setError(errorMessage(e));
    }
    setActiveOrg(data);
    await reloadOrgs();
    setCreating(false);
  };

  return (
    <KeyboardAvoidingView style={[styles.fill, { backgroundColor: c.bgApp }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space[12], paddingBottom: insets.bottom + space[8] }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <LogoSymbol width={56} />
          <T variant="title1" accessibilityRole="header">
            Manca solo un passo
          </T>
          <T variant="body" tone="secondary">
            Per usare l&apos;app serve un&apos;organizzazione: la tua agenzia, la tua azienda o la tua attività di fornitore. Creala qui, oppure apri
            l&apos;invito che ti hanno mandato.
          </T>
          {session?.user.email && (
            <T variant="callout" tone="secondary">
              Hai fatto l&apos;accesso come {session.user.email}.
            </T>
          )}

          <View style={styles.form}>
            <Segmented
              value={type}
              onChange={setType}
              accessibilityLabel="Tipo di organizzazione"
              options={[
                { value: "agency", label: "Agenzia" },
                { value: "client", label: "Azienda" },
                { value: "supplier", label: "Fornitore" },
              ]}
            />
            <T variant="callout" tone="secondary">
              {TYPE_HINT[type]}
            </T>
            <TextField
              label="Nome"
              value={name}
              onChangeText={setName}
              error={nameError}
              maxLength={120}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <TextField label="Città (facoltativa)" value={city} onChangeText={setCity} maxLength={120} autoCapitalize="words" returnKeyType="done" />
            {error && <InlineError message={error} />}
            <Button block label="Crea l'organizzazione" loading={creating} onPress={create} />
          </View>

          <View style={styles.actions}>
            <Button
              block
              variant="secondary"
              label="Ho ricevuto un invito, aggiorna"
              loading={checking}
              onPress={async () => {
                setChecking(true);
                await reloadOrgs();
                setChecking(false);
              }}
            />
            <Button block variant="tertiary" label="Esci" onPress={signOut} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space[4] },
  content: { gap: space[4], width: "100%", maxWidth: 480, alignSelf: "center" },
  form: { gap: space[4], marginTop: space[4] },
  actions: { gap: space[3], marginTop: space[4] },
});
