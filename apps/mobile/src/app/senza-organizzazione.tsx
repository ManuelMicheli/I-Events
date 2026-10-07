import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { LogoSymbol } from "@/components/logo";
import { NewOrgForm } from "@/components/new-org-form";
import { T } from "@/components/text";
import { useSession } from "@/lib/session";
import { space, useTheme } from "@/theme";

/** Signed in without an organization: create one here, or join through an invite and refresh. */
export default function NoOrganizationScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { reloadOrgs, signOut, session } = useSession();
  const [checking, setChecking] = useState(false);

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
            <NewOrgForm />
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
  form: { marginTop: space[4] },
  actions: { gap: space[3], marginTop: space[4] },
});
