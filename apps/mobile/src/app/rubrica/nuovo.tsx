import { router } from "expo-router";
import { ContactForm } from "@/components/contact-form";
import { Screen } from "@/components/screen";
import { saveContact } from "@/lib/contacts";
import { useActiveOrg, useSession } from "@/lib/session";

/** A contact added by hand; the phone import is in Importa contatti. */
export default function NewContactScreen() {
  const org = useActiveOrg();
  const { session } = useSession();
  return (
    <Screen>
      <ContactForm
        submitLabel="Aggiungi alla rubrica"
        onSave={async (row) => {
          const id = await saveContact(org.id, session!.user.id, null, row);
          router.replace({ pathname: "/rubrica/[id]", params: { id, nuovo: "1" } });
        }}
      />
    </Screen>
  );
}
