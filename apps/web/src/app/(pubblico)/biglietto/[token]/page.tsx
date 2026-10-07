import { cancelRegistration } from "@/app/(pubblico)/eventi/actions";
import { CopyButton } from "@/components/copy-button";
import { ClearMoment } from "@/components/moment";
import { PublicTicket } from "@/components/public/public-ticket";
import { Button, ButtonLink } from "@/components/ui";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isTicketToken, ticketUrl, todayInItaly } from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";

export const metadata: Metadata = { title: "Biglietto", robots: { index: false, follow: false } };

/**
 * A public ticket, opened from its link (no account). Right after registering (?momento=iscritto) it
 * comes out of the slot and the confirmation seal draws its tick (A7).
 */
export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ momento?: string }>;
}) {
  const [{ token: raw }, { momento }] = await Promise.all([params, searchParams]);
  const token = raw.toLowerCase();
  const supabase = await createClient();
  const { data } = isTicketToken(token) ? await supabase.rpc("registration_ticket", { p_token: token }) : { data: null };
  const ticket = data?.[0];

  if (!ticket) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 py-10">
        <h1 className="text-2xl font-semibold">Biglietto non trovato</h1>
        <p className="text-muted">
          Il link non è completo oppure l&apos;iscrizione è stata annullata. Puoi iscriverti di nuovo dalla pagina dell&apos;evento.
        </p>
        <ButtonLink href="/eventi" variant="secondary" className="mt-2 w-fit">
          Esplora gli eventi
        </ButtonLink>
      </div>
    );
  }

  const fresh = momento === "iscritto";
  const link = ticketUrl(env.siteUrl, token);
  const qr = await QRCode.toString(link, { type: "svg", errorCorrectionLevel: "M", margin: 0, color: { dark: "#111113", light: "#ffffff" } });
  const over = ticket.status === "completed" || (ticket.end_date ?? ticket.start_date) < todayInItaly();
  const cancelled = ticket.status === "cancelled";

  return (
    <div className="mx-auto flex w-full max-w-[380px] flex-col gap-6">
      {momento && <ClearMoment />}
      <p role={fresh ? "status" : undefined} className="text-lg">
        {cancelled
          ? "L'organizzatore ha annullato l'evento. Il biglietto resta qui come promemoria."
          : over
            ? "L'evento è andato in scena. Il biglietto resta qui come ricordo."
            : fresh
              ? `Ci sei. Il biglietto per ${ticket.title} è pronto: mostralo all'ingresso.`
              : "Il tuo biglietto: mostralo all'ingresso."}
      </p>

      <div className={fresh ? "ticket-slot" : undefined}>
        <div className={fresh ? "ticket-print" : undefined}>
          <PublicTicket ticket={ticket} token={token} qr={qr} fresh={fresh} over={over} />
        </div>
      </div>

      {!cancelled && !over && (
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-muted">Questo link è il tuo biglietto. Salvalo o fai uno screenshot: va bene anche senza rete.</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <CopyButton text={link} />
            <Link href={`/eventi/${ticket.event_id}`} className="underline">
              Pagina dell&apos;evento
            </Link>
          </p>
        </div>
      )}

      {!cancelled && !over && (
        <details className="group rounded-card border border-border bg-bg">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
            Non puoi più venire?
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
              className="shrink-0 transition-transform duration-[180ms] group-open:rotate-180"
            >
              <path d="M3.5 6l4.5 4.5L12.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <form action={cancelRegistration} className="flex flex-col gap-3 border-t border-border px-4 py-4 text-sm">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="eventId" value={ticket.event_id} />
            <p className="text-muted">Libera il posto per qualcun altro. Il biglietto smette di funzionare e non si può recuperare.</p>
            <Button type="submit" variant="danger" className="w-fit">
              Annulla l&apos;iscrizione
            </Button>
          </form>
        </details>
      )}
    </div>
  );
}
