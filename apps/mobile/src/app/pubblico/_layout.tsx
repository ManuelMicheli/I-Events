import { Stack } from "expo-router";
import { fonts, useTheme } from "@/theme";

/**
 * The public area (Esplora, Calendario, Biglietti): open to everyone, signed in or not, as on the
 * website. The registration opens as a sheet over the event.
 */
export default function PublicLayout() {
  const { c } = useTheme();
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
      <Stack.Screen name="(schede)" options={{ headerShown: false }} />
      <Stack.Screen name="evento/[id]" options={{ title: "Evento" }} />
      <Stack.Screen name="iscrizione/[id]" options={{ title: "Iscrizione", presentation: "modal" }} />
      <Stack.Screen name="biglietto/[token]" options={{ title: "Biglietto" }} />
    </Stack>
  );
}
