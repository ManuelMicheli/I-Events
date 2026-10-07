import { ContactForm } from "@/components/contacts/contact-form";
import { Card } from "@/components/ui";
import { requireOrg } from "@/lib/session";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Nuovo contatto" };

export default async function NewContactPage() {
  await requireOrg("agency");
  // From 1536 px the form takes the width and a short note on importing sits in a column on the right (A11 in globals.css).
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/pro/rubrica" className="text-sm text-muted underline">
          Rubrica
        </Link>
        <h1 className="text-2xl font-semibold">Nuovo contatto</h1>
      </div>
      <div className="flex flex-col gap-6 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_24rem] 2xl:items-start 3xl:grid-cols-[minmax(0,1fr)_28rem] 4xl:grid-cols-[minmax(0,1fr)_30rem]">
        <ContactForm canDelete={false} />
        <aside className="hidden 2xl:sticky 2xl:top-20 2xl:block">
          <Card title="Hai già una rubrica?">
            <p className="text-sm text-muted">
              Importa in una volta i contatti da un file CSV, Excel o vCard: quello del telefono, di
              Google Contatti o un foglio di calcolo.
            </p>
            <p className="mt-4 text-sm">
              <Link href="/pro/rubrica/importa" className="underline">
                Importa contatti
              </Link>
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
