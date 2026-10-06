"use client";

import { inviteSupplier } from "@/app/(app)/pro/rubrica/actions";
import { Button, Card } from "@/components/ui";
import { whatsappUrl } from "@i-events/core";
import { useState } from "react";

/**
 * Whether the supplier behind a contact is on I-Events. If not, the agency gets a link to send them:
 * once they claim their account, booking requests reach them directly.
 */
export function SupplierAccountCard({
  contactId,
  name,
  phone,
  email,
  supplierName,
  inviteLink,
  agencyName,
}: {
  contactId: string;
  name: string;
  phone: string | null;
  email: string | null;
  supplierName: string | null;
  inviteLink: string | null;
  agencyName: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = `Ciao ${name}, ${agencyName} ti invita su I-Events: riceverai lì le nostre richieste per gli eventi e potrai rispondere e vedere gli orari. Attiva il tuo account qui: ${inviteLink}`;

  return (
    <Card title="Account I-Events">
      {supplierName ? (
        <p className="text-sm">
          {name} usa I-Events come <strong>{supplierName}</strong>. Le richieste che gli mandi dagli eventi arrivano nel suo account e lì ti risponde
          con disponibilità e prezzo.
        </p>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-muted">
            Invita {name} su I-Events: riceverà le tue richieste nel suo account, ti risponderà con disponibilità e prezzo e vedrà i suoi orari il
            giorno dell&apos;evento. Costi interni e note restano solo tuoi.
          </p>
          {inviteLink ? (
            <>
              <p>
                Link d&apos;invito: <code className="break-all">{inviteLink}</code>{" "}
                <button type="button" className="underline" onClick={() => navigator.clipboard.writeText(inviteLink).then(() => setCopied(true))}>
                  {copied ? "Copiato" : "Copia"}
                </button>
              </p>
              <p className="flex flex-wrap gap-4">
                {phone && (
                  <a href={`${whatsappUrl(phone)}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="underline">
                    Manda l&apos;invito su WhatsApp
                  </a>
                )}
                {email && (
                  <a
                    href={`mailto:${email}?subject=${encodeURIComponent("Invito su I-Events")}&body=${encodeURIComponent(text)}`}
                    className="underline"
                  >
                    Manda l&apos;invito per email
                  </a>
                )}
              </p>
              <form action={inviteSupplier}>
                <input type="hidden" name="id" value={contactId} />
                <button type="submit" className="text-muted underline">
                  Crea un nuovo link (quello vecchio smette di funzionare)
                </button>
              </form>
            </>
          ) : (
            <form action={inviteSupplier}>
              <input type="hidden" name="id" value={contactId} />
              <Button type="submit" variant="secondary">
                Invita su I-Events
              </Button>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}
