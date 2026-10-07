import { slugify, type OrgType } from "@i-events/core";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { errorMessage } from "@/lib/errors";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { space } from "@/theme";
import { Button } from "./button";
import { Segmented } from "./segmented";
import { T } from "./text";
import { InlineError, TextField } from "./text-field";

const TYPE_HINT: Record<OrgType, string> = {
  agency: "Ricevi le richieste delle aziende, prepari proposte e organizzi gli eventi.",
  client: "Chiedi eventi e campagne alle agenzie e confronti i preventivi.",
  supplier: "Ricevi dalle agenzie le richieste per il tuo servizio: DJ, sicurezza, catering e altro.",
};

/** Creates an organisation (agency, company or supplier) and makes it the active one. */
export function NewOrgForm({ onCreated }: { onCreated?: (name: string) => void }) {
  const { reloadOrgs, setActiveOrg } = useSession();
  const [type, setType] = useState<OrgType>("agency");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [error, setError] = useState<string>();
  const [creating, setCreating] = useState(false);

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
    onCreated?.(trimmed);
  };

  return (
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
      <TextField label="Nome" value={name} onChangeText={setName} error={nameError} maxLength={120} autoCapitalize="words" returnKeyType="next" />
      <TextField label="Città (facoltativa)" value={city} onChangeText={setCity} maxLength={120} autoCapitalize="words" returnKeyType="done" />
      {error && <InlineError message={error} />}
      <Button block label="Crea l'organizzazione" loading={creating} onPress={create} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space[4] },
});
