import { router } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { errorMessage } from "@/lib/errors";
import { euro } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { fonts, space } from "@/theme";
import { Button } from "./button";
import { useConfirm } from "./confirm";
import { CheckRow } from "./controls";
import { Sheet } from "./sheet";
import { T } from "./text";
import { InlineError, TextField } from "./text-field";
import { useToast } from "./toast";

type Decidable = { id: string; request_id: string; total: number | null; agency: { name: string } };

/**
 * Accetta or Chiedi modifiche on one proposal, as on the website. One Fiamma per screen: with a
 * single proposal to decide Accetta is it (`lead`); with several, none is ahead of the others.
 * Accetta asks first, with the amount and, when other agencies are waiting, the choice to write
 * them a message of one's own; then the confirmed event opens (the request, for a campaign).
 */
export function ProposalDecision({ proposal: p, others, lead, onChange }: { proposal: Decidable; others: number; lead: boolean; onChange: () => void }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState<"accept" | "revise" | null>(null);
  const [error, setError] = useState<string>();
  const [revising, setRevising] = useState(false);
  const [note, setNote] = useState("");
  const write = useRef(false);
  const name = p.agency.name;

  const accept = async () => {
    write.current = false;
    const ok = await confirm({
      title: `Accetti la proposta di ${name}?`,
      body: <AcceptBody total={p.total} agency={name} others={others} onWrite={(v) => (write.current = v)} />,
      confirmLabel: `Accetta ${euro(p.total)}`,
    });
    if (!ok) return;
    setBusy("accept");
    setError(undefined);
    const { data, error: e } = await supabase.rpc("accept_proposal", { p_proposal: p.id });
    setBusy(null);
    if (e) return setError(errorMessage(e));
    // "Evento confermato": a single event opens on its screen; a campaign's stages are on the request.
    const avvisa = write.current && others > 0 ? { avvisa: "1" } : {};
    if (data?.length === 1) router.replace({ pathname: "/evento/[id]", params: { id: data[0]!, momento: "confermato", ...avvisa } });
    else router.replace({ pathname: "/richiesta-azienda/[id]", params: { id: p.request_id, momento: "confermato", ...avvisa } });
  };

  const sendRevision = async () => {
    if (note.trim().length === 0) return setError("Scrivi cosa vuoi cambiare.");
    setBusy("revise");
    setError(undefined);
    const { error: e } = await supabase.rpc("request_revision", { p_proposal: p.id, p_note: note.trim() });
    setBusy(null);
    if (e) return setError(errorMessage(e));
    setRevising(false);
    setNote("");
    toast({ text: "Richiesta di modifica inviata all'agenzia" });
    onChange();
  };

  return (
    <View style={styles.actions}>
      <Button
        block
        variant={lead ? "primary" : "secondary"}
        label="Accetta"
        accessibilityLabel={`Accetta la proposta di ${name}`}
        loading={busy === "accept"}
        disabled={busy !== null}
        onPress={accept}
      />
      <Button block variant="secondary" label="Chiedi modifiche" disabled={busy !== null} onPress={() => setRevising(true)} />
      {error && !revising && <InlineError message={error} />}
      <Sheet visible={revising} title={`Modifiche a ${name}`} onClose={() => setRevising(false)}>
        <TextField
          label="Cosa vuoi cambiare?"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={5000}
          style={styles.area}
          textAlignVertical="top"
          autoFocus
        />
        {error && <InlineError message={error} />}
        <Button block label="Invia la richiesta di modifica" loading={busy === "revise"} onPress={sendRevision} />
      </Sheet>
    </View>
  );
}

/** Inside the question: the amount in mono, what happens, and the box for a message of one's own. */
function AcceptBody({ total, agency, others, onWrite }: { total: number | null; agency: string; others: number; onWrite: (on: boolean) => void }) {
  const [write, setWrite] = useState(false);
  return (
    <View style={styles.body}>
      <T variant="monoMetric" style={styles.amount}>
        {euro(total)}
      </T>
      <T variant="body" tone="secondary">
        {others > 0
          ? `Nasce l'evento con ${agency}. ${others === 1 ? "L'altra agenzia riceve" : `Le altre ${others} agenzie ricevono`} l'esito con una notifica.`
          : `Nasce l'evento con ${agency}.`}
      </T>
      {others > 0 && (
        <CheckRow
          label={others === 1 ? "Le scrivo anche un messaggio mio" : "Scrivo anche un messaggio mio alle altre agenzie"}
          checked={write}
          onChange={(v) => {
            setWrite(v);
            onWrite(v);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space[2] },
  body: { gap: space[2] },
  amount: { fontFamily: fonts.mono["500"], fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  area: { minHeight: 120, paddingTop: space[3] },
});
