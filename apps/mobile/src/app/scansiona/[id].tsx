import Ionicons from "@expo/vector-icons/Ionicons";
import { findPass, passFitsNow, readPass, type CrewMember } from "@i-events/core";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { Linking, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { T, type Tone } from "@/components/text";
import { TextField } from "@/components/text-field";
import { checkinState, crewOnPhone, recordCheckin, useCheckinQueue } from "@/lib/checkin-queue";
import { readSavedDay, type EventDay } from "@/lib/event-day";
import { useActiveOrg } from "@/lib/session";
import { useItalyNow } from "@/lib/use-italy-now";
import { useOnline } from "@/lib/use-online";
import { radius, space, useTheme } from "@/theme";

const timeFmt = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" });
const clock = (iso: string) => timeFmt.format(new Date(iso));
const longDayFmt = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const longDay = (d: string) => longDayFmt.format(new Date(`${d}T12:00:00Z`));

type Result =
  | { kind: "arrived"; member: CrewMember; at: string }
  | { kind: "already"; member: CrewMember; at: string }
  | { kind: "other-day"; member: CrewMember }
  | { kind: "unknown" }
  | { kind: "not-a-pass" };

/** The same code is read many times a second while it stays in front of the camera: it counts once. */
const SAME_CODE_PAUSE = 4000;

/**
 * Check-in at the entrance: the camera reads the QR of a pass, the app finds the person among the crew saved on the
 * phone and checks them in at once, also without signal. The short code under the QR can be typed instead.
 */
export default function ScanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const org = useActiveOrg();
  const { c } = useTheme();
  const online = useOnline();
  const now = useItalyNow();
  const checkins = useCheckinQueue(id);
  const [permission, requestPermission] = useCameraPermissions();
  const [day, setDay] = useState<EventDay | null | undefined>(undefined);
  const [result, setResult] = useState<Result | null>(null);
  const [typing, setTyping] = useState(false);
  const [code, setCode] = useState("");
  const last = useRef<{ data: string; at: number } | null>(null);

  // The crew comes from the copy the event day keeps on the phone, read again whenever the screen shows.
  useFocusEffect(
    useCallback(() => {
      readSavedDay(id, org.id).then((s) => setDay(s?.day ?? null));
    }, [id, org.id]),
  );

  const handle = useCallback(
    (text: string) => {
      const pass = readPass(text);
      if (!pass) return setResult({ kind: "not-a-pass" });
      // Read the check-ins from the store, not from this render: a scan can come right after the previous one.
      const crew = crewOnPhone(day?.crew ?? [], checkinState(id));
      const member = findPass(crew, pass);
      if (!member) return setResult({ kind: "unknown" });
      if (!passFitsNow(member.day, now)) return setResult({ kind: "other-day", member });
      if (member.checked_in_at) return setResult({ kind: "already", member, at: member.checked_in_at });
      const at = new Date().toISOString();
      void recordCheckin(id, { id: member.id, at });
      setResult({ kind: "arrived", member, at });
    },
    [day, now, id],
  );

  // The camera may keep the first callback it was given: it always reaches the latest `handle` through a ref.
  const handleRef = useRef(handle);
  useEffect(() => {
    handleRef.current = handle;
  }, [handle]);
  const onScanned = useCallback(({ data }: BarcodeScanningResult) => {
    const t = Date.now();
    if (last.current && last.current.data === data && t - last.current.at < SAME_CODE_PAUSE) return;
    last.current = { data, at: t };
    handleRef.current(data);
  }, []);

  const today = day ? crewOnPhone(day.crew, checkins).filter((m) => passFitsNow(m.day, now)) : [];
  const arrived = today.filter((m) => m.checked_in_at).length;

  return (
    <ScrollView style={{ backgroundColor: c.bgApp }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.camera, { backgroundColor: c.bgSubtle }]}>
        {permission?.granted ? (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={onScanned}
            />
            <Viewfinder />
          </>
        ) : (
          <View style={styles.cameraMessage}>
            <Ionicons name="camera-outline" size={32} color={c.textSecondary} />
            <T variant="bodyStrong" style={styles.center}>
              {permission && !permission.canAskAgain ? "La fotocamera è spenta per I-Events" : "Serve la fotocamera per leggere i pass"}
            </T>
            <T variant="callout" tone="secondary" style={styles.center}>
              {permission && !permission.canAskAgain
                ? "Accendila dalle impostazioni del telefono. Intanto puoi scrivere il codice sotto il QR."
                : "La usiamo solo mentre sei su questa schermata."}
            </T>
            {permission && !permission.canAskAgain ? (
              Platform.OS !== "web" && <Button variant="secondary" align="center" label="Apri Impostazioni" onPress={() => Linking.openSettings()} />
            ) : (
              <Button align="center" label="Usa la fotocamera" onPress={() => void requestPermission()} />
            )}
          </View>
        )}
      </View>

      <View accessibilityLiveRegion="polite">
        {day === null ? (
          <Outcome
            tone="warning"
            icon="cloud-offline-outline"
            title="Elenco degli arrivi non salvato"
            body="Apri la giornata dell'evento con la rete almeno una volta: poi i pass si leggono anche senza connessione."
          />
        ) : result ? (
          <ResultCard
            result={result}
            onUndo={(m) => {
              void recordCheckin(id, { id: m.id, at: null });
              setResult(null);
            }}
          />
        ) : (
          <T variant="callout" tone="secondary" style={styles.center}>
            Inquadra il QR del pass: il check-in parte da solo.
          </T>
        )}
      </View>

      {day && (
        <T variant="callout" tone="secondary" style={styles.center}>
          {`Oggi ${arrived} arrivati su ${today.length}.`}
          {!online && " Sei offline: i check-in partono appena torna la rete."}
        </T>
      )}

      {typing ? (
        <View style={styles.typing}>
          <TextField
            label="Codice del pass"
            hint="Le 6 lettere e cifre sotto il QR."
            placeholder="4F7A2C"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            returnKeyType="done"
            onSubmitEditing={() => handle(code)}
          />
          <Button
            block
            align="center"
            label="Fai il check-in"
            disabled={code.replace(/[\s-]/g, "").length < 6}
            onPress={() => {
              handle(code);
              setCode("");
            }}
          />
        </View>
      ) : (
        <Button variant="secondary" align="center" icon="keypad-outline" label="Scrivi il codice" onPress={() => setTyping(true)} />
      )}
    </ScrollView>
  );
}

function ResultCard({ result, onUndo }: { result: Result; onUndo: (m: CrewMember) => void }) {
  switch (result.kind) {
    case "arrived":
      return (
        <Outcome
          tone="success"
          icon="checkmark-circle"
          title={result.member.name}
          body={result.member.detail}
          line={`Arrivato alle ${clock(result.at)}`}
        >
          <Button variant="secondary" label="Annulla il check-in" onPress={() => onUndo(result.member)} />
        </Outcome>
      );
    case "already":
      return (
        <Outcome
          tone="info"
          icon="information-circle"
          title={result.member.name}
          body={result.member.detail}
          line={`Già arrivato alle ${clock(result.at)}`}
        />
      );
    case "other-day":
      return (
        <Outcome
          tone="warning"
          icon="calendar-outline"
          title={result.member.name}
          body={result.member.detail}
          line={`Il pass è per ${longDay(result.member.day)}: oggi non è in elenco.`}
        />
      );
    case "unknown":
      return (
        <Outcome
          tone="danger"
          icon="close-circle"
          title="Pass non riconosciuto"
          body="Non è un pass di questo evento, oppure è stato aggiunto dopo l'ultimo aggiornamento della giornata. Cerca il nome negli arrivi."
        />
      );
    case "not-a-pass":
      return (
        <Outcome
          tone="danger"
          icon="close-circle"
          title="Non è un pass I-Events"
          body="Inquadra il QR del pass oppure scrivi il codice di 6 caratteri."
        />
      );
  }
}

function Outcome({
  tone,
  icon,
  title,
  body,
  line,
  children,
}: {
  tone: "success" | "info" | "warning" | "danger";
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  body?: string | null;
  line?: string;
  children?: React.ReactNode;
}) {
  const { c } = useTheme();
  const color = { success: c.success, info: c.info, warning: c.warning, danger: c.danger }[tone];
  return (
    <Card>
      <View style={styles.outcome}>
        <Ionicons name={icon} size={28} color={color} />
        <View style={styles.outcomeTexts}>
          <T variant="title3">{title}</T>
          {body ? (
            <T variant="callout" tone="secondary">
              {body}
            </T>
          ) : null}
          {line && (
            <T variant="bodyStrong" tone={tone as Tone}>
              {line}
            </T>
          )}
          {children}
        </View>
      </View>
    </Card>
  );
}

/** Four corners around the area where the QR should sit. */
function Viewfinder() {
  const corner = { borderColor: "#FFFFFF" };
  return (
    <View style={styles.finder} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={[styles.corner, styles.tl, corner]} />
      <View style={[styles.corner, styles.tr, corner]} />
      <View style={[styles.corner, styles.bl, corner]} />
      <View style={[styles.corner, styles.br, corner]} />
    </View>
  );
}

const C = 32;
const styles = StyleSheet.create({
  content: { padding: space[4], paddingBottom: space[8], gap: space[4] },
  center: { textAlign: "center" },
  camera: { width: "100%", aspectRatio: 1, maxHeight: 420, alignSelf: "center", borderRadius: radius.lg, overflow: "hidden" },
  cameraMessage: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[3], padding: space[6] },
  finder: { position: "absolute", top: "18%", left: "18%", right: "18%", bottom: "18%" },
  corner: { position: "absolute", width: C, height: C },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: radius.md },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radius.md },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radius.md },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: radius.md },
  outcome: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  outcomeTexts: { flex: 1, gap: space[2] },
  typing: { gap: space[3] },
});
