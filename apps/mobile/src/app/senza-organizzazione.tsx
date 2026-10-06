import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { LogoSymbol } from "@/components/logo";
import { T } from "@/components/text";
import { env } from "@/lib/env";
import { useSession } from "@/lib/session";
import { space, useTheme } from "@/theme";

/** Signed in without an organization: those are created (or joined by invite) on the web for now. */
export default function NoOrganizationScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { reloadOrgs, signOut, session } = useSession();
  const [checking, setChecking] = useState(false);
  return (
    <View style={[styles.fill, { backgroundColor: c.bgApp, paddingTop: insets.top + space[12], paddingBottom: insets.bottom + space[8] }]}>
      <View style={styles.content}>
        <LogoSymbol width={56} />
        <T variant="title1" accessibilityRole="header">
          Manca solo un passo
        </T>
        <T variant="body" tone="secondary">
          Per usare l&apos;app serve un&apos;organizzazione: la tua agenzia, la tua azienda o la tua attività di fornitore. Creala sul sito, oppure
          apri l&apos;invito che ti hanno mandato, poi torna qui.
        </T>
        {session?.user.email && (
          <T variant="callout" tone="secondary">
            Hai fatto l&apos;accesso come {session.user.email}.
          </T>
        )}
        <View style={styles.actions}>
          <Button
            block
            label="Crea l'organizzazione sul sito"
            icon="open-outline"
            onPress={() => WebBrowser.openBrowserAsync(`${env.siteUrl}/onboarding`)}
          />
          <Button
            block
            variant="secondary"
            label="Ho fatto, aggiorna"
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
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: space[4] },
  content: { gap: space[4], width: "100%", maxWidth: 480, alignSelf: "center" },
  actions: { gap: space[3], marginTop: space[4] },
});
