import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { NewOrgForm } from "@/components/new-org-form";
import { Screen } from "@/components/screen";
import { T } from "@/components/text";
import { useToast } from "@/components/toast";
import { space } from "@/theme";

/**
 * Nuovo account, from the account menu (as the website's /onboarding): another agency, company or
 * supplier business with the same login. Once created it becomes the active one and Home opens.
 */
export default function NewAccountScreen() {
  const toast = useToast();
  return (
    <Screen>
      <View style={styles.intro}>
        <T variant="body" tone="secondary">
          Crea lo spazio di un&apos;altra agenzia, azienda o attività. Usi lo stesso accesso e passi da uno all&apos;altro dal menu dell&apos;account.
        </T>
      </View>
      <NewOrgForm
        onCreated={(name) => {
          toast({ text: `Account creato: ${name}` });
          router.dismissTo("/");
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: space[2] },
});
