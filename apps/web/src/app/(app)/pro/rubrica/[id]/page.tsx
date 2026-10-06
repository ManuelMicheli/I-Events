import { ContactActions } from "@/components/contacts/contact-actions";
import { ContactForm } from "@/components/contacts/contact-form";
import { Notice } from "@/components/ui";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { can } from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Contatto" };

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvato?: string }>;
}) {
  const { id } = await params;
  const { salvato } = await searchParams;
  const org = await requireOrg("agency");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: contact, error } = await supabase.from("contacts").select("*").eq("id", id).eq("org_id", org.id).maybeSingle();
  if (error) throw error;
  if (!contact) notFound();
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/pro/rubrica" className="text-sm text-muted underline">
            Rubrica
          </Link>
          <h1 className="text-2xl font-semibold">{contact.name}</h1>
        </div>
        <ContactActions name={contact.name} phone={contact.phone} email={contact.email} />
      </div>
      {salvato && <Notice tone="success">Contatto salvato.</Notice>}
      <ContactForm key={contact.updated_at} contact={contact} canDelete={can(org.type, org.role, "contacts.delete")} />
    </>
  );
}
