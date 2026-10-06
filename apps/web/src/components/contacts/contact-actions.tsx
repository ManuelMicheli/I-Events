import { whatsappUrl } from "@i-events/core";

/** One-tap call, WhatsApp and email. */
export function ContactActions({ name, phone, email }: { name: string; phone: string | null; email: string | null }) {
  return (
    <span className="flex flex-wrap gap-3 text-sm">
      {phone && (
        <>
          <a href={`tel:${phone}`} className="underline" aria-label={`Chiama ${name}`}>
            Chiama
          </a>
          <a href={whatsappUrl(phone)} target="_blank" rel="noreferrer" className="underline" aria-label={`WhatsApp a ${name}`}>
            WhatsApp
          </a>
        </>
      )}
      {email && (
        <a href={`mailto:${email}`} className="underline" aria-label={`Email a ${name}`}>
          Email
        </a>
      )}
    </span>
  );
}
