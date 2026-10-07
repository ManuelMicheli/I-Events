import { ContactForm } from "@/components/contacts/contact-form";
import { requireOrg } from "@/lib/session";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Nuovo contatto" };

export default async function NewContactPage() {
  await requireOrg("agency");
  // A form reads top to bottom: on wide screens it sits in a centred column (A11 in globals.css).
  return (
    <div className="flex flex-col gap-6 2xl:mx-auto 2xl:w-full 2xl:max-w-form">
      <div>
        <Link href="/pro/rubrica" className="text-sm text-muted underline">
          Rubrica
        </Link>
        <h1 className="text-2xl font-semibold">Nuovo contatto</h1>
      </div>
      <ContactForm canDelete={false} />
    </div>
  );
}
