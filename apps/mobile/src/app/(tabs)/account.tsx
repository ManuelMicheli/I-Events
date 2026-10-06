import { ORG_TYPE_LABEL, ROLE_LABEL } from "@i-events/core";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { PushSetting } from "@/components/push-prompt";
import { Divider, ListRow } from "@/components/rows";
import { Screen, Section } from "@/components/screen";
import { T } from "@/components/text";
import { env } from "@/lib/env";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { space } from "@/theme";

export default function AccountScreen() {
  const { session, orgs, activeOrg, setActiveOrg, signOut } = useSession();
  const [leaving, setLeaving] = useState(false);
  const userId = session?.user.id ?? null;
  const profile = useQuery(userId && `profile:${userId}`, async () => {
    const { data, error } = await supabase.from("profiles").select("full_name").eq("id", userId!).maybeSingle();
    if (error) throw error;
    return data;
  });
  const name = profile.data?.full_name?.trim();
  return (
    <Screen title="Account">
      <Card>
        <T variant="title3">{name || "Il tuo account"}</T>
        <T variant="callout" tone="secondary">
          {session?.user.email}
        </T>
      </Card>

      <PushSetting />

      {activeOrg?.type === "agency" && (
        <Section title="Rubrica fornitori">
          <T variant="callout" tone="secondary">
            Aggiungi alla rubrica di {activeOrg.name} i fornitori che hai già nel telefono.
          </T>
          <Button variant="secondary" icon="people-outline" label="Importa dal telefono" onPress={() => router.push("/importa-contatti")} />
        </Section>
      )}

      <Section title="Organizzazioni">
        <Card style={styles.list}>
          {orgs.map((o, i) => (
            <View key={o.id}>
              {i > 0 && <Divider />}
              <ListRow
                title={o.name}
                subtitle={`${ORG_TYPE_LABEL[o.type]} · ${ROLE_LABEL[o.role]}`}
                selected={o.id === activeOrg?.id}
                onPress={orgs.length > 1 ? () => setActiveOrg(o.id) : undefined}
              />
            </View>
          ))}
        </Card>
        <T variant="callout" tone="secondary">
          Team, collegamenti e profilo pubblico si gestiscono dal sito.
        </T>
        <Button
          variant="secondary"
          icon="open-outline"
          label="Apri I-Events sul sito"
          onPress={() => WebBrowser.openBrowserAsync(`${env.siteUrl}/app`)}
        />
      </Section>

      <Button
        variant="tertiary"
        icon="log-out-outline"
        label="Esci dall'account"
        loading={leaving}
        onPress={async () => {
          setLeaving(true);
          await signOut();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: space[1], gap: 0 },
});
