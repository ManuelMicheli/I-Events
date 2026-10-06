import { ContactForm } from "@/components/contacts/contact-form";
import { requireOrg } from "@/lib/session";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Nuovo contatto" };

export default async function NewContactPage() {
  await requireOrg("agency");
  return (
    <>
      <div>
        <Link href="/pro/rubrica" className="text-sm text-muted underline">
          Rubrica
        </Link>
        <h1 className="text-2xl font-semibold">Nuovo contatto</h1>
      </div>
      <ContactForm canDelete={false} />
    </>
  );
}
