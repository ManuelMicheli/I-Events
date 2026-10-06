import { ContactImport } from "@/components/contacts/contact-import";
import { requireOrg } from "@/lib/session";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Importa contatti" };

export default async function ImportContactsPage() {
  await requireOrg("agency");
  return (
    <>
      <div>
        <Link href="/pro/rubrica" className="text-sm text-muted underline">
          Rubrica
        </Link>
        <h1 className="text-2xl font-semibold">Importa contatti</h1>
        <p className="text-sm text-muted">
          File CSV o Excel (anche l&apos;export di Google Contatti o Outlook), vCard dal telefono, oppure testo incollato. I contatti già in rubrica con la
          stessa email o lo stesso telefono vengono completati, non duplicati.
        </p>
      </div>
      <ContactImport />
    </>
  );
}
