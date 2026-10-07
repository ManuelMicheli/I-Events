import { useState } from "react";
import { StyleSheet } from "react-native";
import { errorMessage } from "@/lib/errors";
import { useActiveOrg, useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { space } from "@/theme";
import { Button } from "./button";
import { Card } from "./card";
import { SendIcon } from "./icons";
import { T } from "./text";
import { InlineError, TextField } from "./text-field";
import { useToast } from "./toast";

/**
 * After "Accetta" with "un messaggio mio", as on the website: one message to the agencies not
 * chosen, ready to edit. It lands in the conversation with each of them, in the company's name.
 */
export function WriteToOthers({ requestId, title, others, onSent }: { requestId: string; title: string; others: number; onSent: () => void }) {
  const org = useActiveOrg();
  const { session } = useSession();
  const toast = useToast();
  const [body, setBody] = useState(`Grazie per la proposta per «${title}». Questa volta abbiamo scelto un'altra agenzia, ma ci farà piacere lavorare con voi in futuro.`);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  const send = async () => {
    const text = body.trim();
    if (!text) return setError("Scrivi un messaggio.");
    if (!session) return setError("Accedi per continuare.");
    setSending(true);
    setError(undefined);
    const { data: rejected, error: e1 } = await supabase.from("proposals").select("id").eq("request_id", requestId).eq("status", "rejected");
    const { error: e2 } =
      e1 || !rejected?.length
        ? { error: e1 }
        : await supabase
            .from("messages")
            .insert(rejected.map((p) => ({ proposal_id: p.id, author_id: session.user.id, author_org_id: org.id, body: text, internal: false })));
    setSending(false);
    if (e2) return setError(errorMessage(e2));
    const n = rejected?.length ?? 0;
    toast({ text: n === 1 ? "Messaggio inviato all'altra agenzia" : `Messaggio inviato alle altre ${n} agenzie` });
    onSent();
  };

  return (
    <Card>
      <T variant="bodyStrong" accessibilityRole="header">
        {others === 1 ? "Il tuo messaggio all'altra agenzia" : `Il tuo messaggio alle altre ${others} agenzie`}
      </T>
      <TextField
        label="Arriva nella conversazione con ognuna, a tuo nome."
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={10000}
        textAlignVertical="top"
        style={styles.area}
      />
      {error && <InlineError message={error} />}
      <Button
        variant="secondary"
        leading={(color, pressed) => <SendIcon color={color} lean={pressed} />}
        label={others === 1 ? "Invia" : `Invia a ${others} agenzie`}
        loading={sending}
        onPress={send}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  area: { minHeight: 120, paddingTop: space[3] },
});
