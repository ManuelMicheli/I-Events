import { AzeretMono_400Regular } from "@expo-google-fonts/azeret-mono/400Regular";
import { AzeretMono_500Medium } from "@expo-google-fonts/azeret-mono/500Medium";
import { BricolageGrotesque_400Regular } from "@expo-google-fonts/bricolage-grotesque/400Regular";
import { BricolageGrotesque_500Medium } from "@expo-google-fonts/bricolage-grotesque/500Medium";
import { BricolageGrotesque_600SemiBold } from "@expo-google-fonts/bricolage-grotesque/600SemiBold";
import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { Perforation } from "@/components/perforation";
import { T } from "@/components/text";
import { ConfirmProvider } from "@/components/confirm";
import { ToastProvider } from "@/components/toast";
import { missingEnv } from "@/lib/env";
import { SessionProvider, useSession } from "@/lib/session";
import { fonts, space, useTheme } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    AzeretMono_400Regular,
    AzeretMono_500Medium,
  });
  const { c, scheme } = useTheme();
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: c.textPrimary,
      background: c.bgApp,
      card: c.bgApp,
      text: c.textPrimary,
      border: c.borderDefault,
      notification: c.accentFill,
    },
  };
  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        {missingEnv.length > 0 ? (
          <MissingConfig />
        ) : (
          <SessionProvider>
            <ToastProvider>
              <ConfirmProvider>
                <RootStack ready={fontsLoaded || fontError !== null} />
              </ConfirmProvider>
            </ToastProvider>
          </SessionProvider>
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootStack({ ready }: { ready: boolean }) {
  const { c } = useTheme();
  const { status, orgs, orgsStatus, reloadOrgs, signOut } = useSession();
  const signedIn = status === "signed-in";
  const settled = status !== "loading" && (!signedIn || orgsStatus === "ready" || orgsStatus === "error");

  useEffect(() => {
    if (ready && settled) SplashScreen.hideAsync().catch(() => {});
  }, [ready, settled]);

  if (!ready || status === "loading") return null;
  if (signedIn && orgsStatus === "error")
    return (
      <Centered>
        <T variant="title3">Non riusciamo a caricare il tuo account</T>
        <T variant="callout" tone="secondary" style={styles.center}>
          Controlla la connessione e riprova.
        </T>
        <Button label="Riprova" icon="refresh" onPress={reloadOrgs} />
        <Button variant="tertiary" label="Esci" onPress={signOut} />
      </Centered>
    );
  if (signedIn && orgsStatus !== "ready")
    return (
      <Centered>
        <Perforation color={c.textSecondary} label="Caricamento dell'account" late />
      </Centered>
    );

  const hasOrg = orgs.length > 0;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.bgApp },
        headerShadowVisible: false,
        headerTintColor: c.textPrimary,
        headerTitleStyle: { fontFamily: fonts.sans["500"] },
        headerBackButtonDisplayMode: "minimal",
        headerBackTitle: "Indietro",
        contentStyle: { backgroundColor: c.bgApp },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="accedi" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !hasOrg}>
        <Stack.Screen name="senza-organizzazione" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && hasOrg}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "Home" }} />
        <Stack.Screen name="evento/[id]" options={{ title: "Evento" }} />
        <Stack.Screen name="giornata/[id]" options={{ title: "Giornata" }} />
        <Stack.Screen name="scansiona/[id]" options={{ title: "Scansiona pass" }} />
        <Stack.Screen name="richiesta/[id]" options={{ title: "Richiesta" }} />
        <Stack.Screen name="importa-contatti" options={{ title: "Importa contatti" }} />
        <Stack.Screen name="proposta/[id]" options={{ title: "Richiesta" }} />
        <Stack.Screen name="richiesta-azienda/[id]" options={{ title: "Richiesta" }} />
        <Stack.Screen name="confronta/[id]" options={{ title: "Confronta le proposte" }} />
        <Stack.Screen name="conversazione/[id]" options={{ title: "Messaggi" }} />
        <Stack.Screen name="notifiche" options={{ title: "Notifiche" }} />
        <Stack.Screen name="account" options={{ title: "Account" }} />
        <Stack.Screen name="attivita" options={{ title: "Attività" }} />
        <Stack.Screen name="messaggi" options={{ title: "Messaggi" }} />
        <Stack.Screen name="nuova-richiesta" options={{ title: "Nuova richiesta" }} />
        <Stack.Screen name="rubrica/index" options={{ title: "Rubrica" }} />
        <Stack.Screen name="rubrica/[id]" options={{ title: "Contatto" }} />
        <Stack.Screen name="rubrica/nuovo" options={{ title: "Nuovo contatto" }} />
        <Stack.Screen name="trova/index" options={{ title: "Trova" }} />
        <Stack.Screen name="trova/[slug]" options={{ title: "Profilo" }} />
        <Stack.Screen name="cerca" options={{ title: "Cerca" }} />
        <Stack.Screen name="nuovo-account" options={{ title: "Nuovo account" }} />
      </Stack.Protected>
      {/* The public area is open to everyone, signed in or not. */}
      <Stack.Screen name="pubblico" options={{ headerShown: false }} />
    </Stack>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <View style={[styles.centered, { backgroundColor: c.bgApp }]}>{children}</View>;
}

/** Shown to developers when the .env file is missing, instead of a crash. */
function MissingConfig() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <Centered>
      <T variant="title3">Configurazione mancante</T>
      <T variant="callout" tone="secondary" style={styles.center}>
        Copia apps/mobile/.env.example in apps/mobile/.env e inserisci: {missingEnv.join(", ")}.
      </T>
    </Centered>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[3], padding: space[6] },
  center: { textAlign: "center" },
});
