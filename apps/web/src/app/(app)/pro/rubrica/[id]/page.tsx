import { ContactActions } from "@/components/contacts/contact-actions";
import { ContactForm } from "@/components/contacts/contact-form";
import { SupplierAccountCard } from "@/components/contacts/supplier-account";
import { Notice } from "@/components/ui";
import { env } from "@/lib/env";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { can } from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Contatto" };

const nowIso = () => new Date().toISOString();

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
  const [supplierRes, inviteRes] = await Promise.all([
    contact.supplier_org_id
      ? supabase.from("organizations").select("name").eq("id", contact.supplier_org_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("supplier_invitations").select("token, expires_at").eq("contact_id", id).is("accepted_at", null).maybeSingle(),
  ]);
  if (supplierRes.error) throw supplierRes.error;
  if (inviteRes.error) throw inviteRes.error;
  const invite = inviteRes.data && inviteRes.data.expires_at > nowIso() ? inviteRes.data : null;
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
      <SupplierAccountCard
        contactId={contact.id}
        name={contact.name}
        phone={contact.phone}
        email={contact.email}
        supplierName={contact.supplier_org_id ? (supplierRes.data?.name ?? contact.company ?? contact.name) : null}
        inviteLink={invite ? `${env.siteUrl}/invito/${invite.token}` : null}
        agencyName={org.name}
      />
      <ContactForm key={contact.updated_at} contact={contact} canDelete={can(org.type, org.role, "contacts.delete")} />
    </>
  );
}
