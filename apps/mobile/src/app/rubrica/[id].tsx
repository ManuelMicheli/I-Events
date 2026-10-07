import Ionicons from "@expo/vector-icons/Ionicons";
import { can, formatPhone, getServiceCategory, whatsappUrl } from "@i-events/core";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { TrashIcon } from "@/components/icons";
import { Card } from "@/components/card";
import { useConfirm } from "@/components/confirm";
import { ContactForm } from "@/components/contact-form";
import { Notice } from "@/components/notice";
import { InfoRow } from "@/components/rows";
import { Screen } from "@/components/screen";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { deleteContact, fetchContact, saveContact, type Contact } from "@/lib/contacts";
import { errorMessage } from "@/lib/errors";
import { useActiveOrg, useSession } from "@/lib/session";
import { useQuery } from "@/lib/use-query";
import { space, useTheme } from "@/theme";

/** One contact: call, WhatsApp or email with one tap, the details, and editing in place. */
export default function ContactScreen() {
  const { id, nuovo } = useLocalSearchParams<{ id: string; nuovo?: string }>();
  const org = useActiveOrg();
  const { session } = useSession();
  const q = useQuery(`contact:${org.id}:${id}`, () => fetchContact(id, org.id));
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // The bin keeps its lid up while the question is open.
  const [asking, setAsking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const confirm = useConfirm();

  if (q.loading) {
    return (
      <Screen>
        <CardSkeletons count={2} />
      </Screen>
    );
  }
  if (q.error && !q.data) {
    return (
      <Screen>
        <ErrorState error={q.error} onRetry={q.refresh} />
      </Screen>
    );
  }
  const contact = q.data;
  if (!contact) {
    return (
      <Screen>
        <EmptyState icon="person-outline" title="Contatto non trovato" body="Forse è stato eliminato dalla rubrica." />
      </Screen>
    );
  }

  if (editing) {
    return (
      <Screen>
        <ContactForm
          key={contact.updated_at}
          contact={contact}
          submitLabel="Salva"
          onCancel={() => setEditing(false)}
          onSave={async (row) => {
            await saveContact(org.id, session!.user.id, contact.id, row);
            await q.refresh();
            setEditing(false);
            setSaved(true);
          }}
        />
      </Screen>
    );
  }

  const remove = async () => {
    setAsking(true);
    const ok = await confirm({
      title: `Eliminare ${contact.name}?`,
      body: "Il contatto sparisce dalla rubrica di tutta l'agenzia.",
      confirmLabel: "Elimina",
      danger: true,
    });
    setAsking(false);
    if (!ok) return;
    setDeleting(true);
    setFailure(null);
    try {
      await deleteContact(contact.id, org.id);
      router.back();
    } catch (e) {
      setFailure(errorMessage(e));
      setDeleting(false);
    }
  };

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <View style={styles.head}>
        <T variant="title2" accessibilityRole="header">
          {contact.name}
        </T>
        {(contact.company || contact.role_title) && (
          <T variant="body" tone="secondary">
            {[contact.role_title, contact.company !== contact.name ? contact.company : null].filter(Boolean).join(" · ")}
          </T>
        )}
        {contact.supplier_org_id && <Badge label="Su I-Events" tone="outline" icon="checkmark-circle-outline" />}
      </View>

      {(nuovo || saved) && <Notice tone="success">{nuovo && !saved ? "Aggiunto alla rubrica." : "Contatto salvato."}</Notice>}
      {failure && <Notice tone="danger">{failure}</Notice>}

      <ReachButtons contact={contact} />

      <Card style={styles.facts}>
        {contact.phone && <InfoRow label="Telefono" value={formatPhone(contact.phone)} mono />}
        {contact.email && <InfoRow label="Email" value={contact.email} />}
        {contact.city && <InfoRow label="Città o zona" value={contact.city} />}
        <InfoRow
          label="Servizi"
          value={
            contact.services
              .map((s) => getServiceCategory(s)?.name.it)
              .filter(Boolean)
              .join(", ") || "Nessun servizio indicato"
          }
        />
        {contact.rating !== null && <Rating value={contact.rating} />}
        {contact.website && <InfoRow label="Sito web" value={contact.website} />}
        {contact.notes && <InfoRow label="Note" value={contact.notes} />}
      </Card>

      <View style={styles.actions}>
        <Button variant="secondary" icon="create-outline" label="Modifica" block onPress={() => setEditing(true)} />
        {can(org.type, org.role, "contacts.delete") && (
          <Button
            variant="tertiary"
            leading={(color, pressed) => <TrashIcon color={color} open={pressed || asking} />}
            label="Elimina dalla rubrica"
            align="center"
            loading={deleting}
            onPress={remove}
          />
        )}
      </View>
    </Screen>
  );
}

/** Call, WhatsApp and email, only for what the contact has. */
function ReachButtons({ contact }: { contact: Contact }) {
  const open = (url: string) => Linking.openURL(url).catch(() => {});
  if (!contact.phone && !contact.email) {
    return <Notice>Aggiungi un telefono o un&apos;email per contattarlo con un tocco.</Notice>;
  }
  return (
    <View style={styles.reach}>
      {contact.phone && (
        <>
          <Button
            variant="secondary"
            icon="call-outline"
            label="Chiama"
            accessibilityLabel={`Chiama ${contact.name}`}
            onPress={() => open(`tel:${contact.phone}`)}
          />
          <Button
            variant="secondary"
            icon="logo-whatsapp"
            label="WhatsApp"
            accessibilityLabel={`WhatsApp a ${contact.name}`}
            onPress={() => open(whatsappUrl(contact.phone!))}
          />
        </>
      )}
      {contact.email && (
        <Button
          variant="secondary"
          icon="mail-outline"
          label="Email"
          accessibilityLabel={`Email a ${contact.name}`}
          onPress={() => open(`mailto:${contact.email}`)}
        />
      )}
    </View>
  );
}

function Rating({ value }: { value: number }) {
  const { c } = useTheme();
  return (
    <View style={styles.rating} accessible accessibilityLabel={`Valutazione interna: ${value} su 5`}>
      <T variant="label" tone="secondary">
        Valutazione interna
      </T>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Ionicons key={n} name={n <= value ? "star" : "star-outline"} size={20} color={n <= value ? c.textPrimary : c.borderControl} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { gap: space[2], alignItems: "flex-start" },
  reach: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  facts: { gap: space[4] },
  rating: { gap: space[1] },
  stars: { flexDirection: "row", gap: space[1] },
  actions: { gap: space[2] },
});
