import { dayLabel } from "@/components/run-of-show/format";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getServiceCategory, hhmm, passCode, passUrl } from "@i-events/core";
import type { Metadata } from "next";
import QRCode from "qrcode";

export const metadata: Metadata = { title: "Pass", robots: { index: false, follow: false } };

const clock = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" });

/**
 * The pass of someone expected on site, opened from the link the agency sent: the QR code to show at the
 * entrance, the short code to read out if the camera fails, when and where to arrive. No account needed.
 */
export default async function PassPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = /^[0-9a-fA-F]{32}$/.test(token);
  const supabase = await createClient();
  const { data } = valid ? await supabase.rpc("crew_pass", { p_token: token }) : { data: null };
  const pass = data?.[0];

  if (!pass) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Pass non trovato</h1>
        <p className="text-muted">Il link non è completo oppure il pass è stato tolto. Chiedi all&apos;agenzia di mandartelo di nuovo.</p>
      </main>
    );
  }

  const link = passUrl(env.siteUrl, token.toLowerCase());
  const qr = await QRCode.toString(link, { type: "svg", errorCorrectionLevel: "M", margin: 0, color: { dark: "#111113", light: "#ffffff" } });
  const who = pass.person || getServiceCategory(pass.service_key)?.name.it || "Staff";
  const what = [pass.service_key && pass.person ? getServiceCategory(pass.service_key)?.name.it : null, pass.role].filter(Boolean).join(" · ");
  const place = [pass.venue, pass.city].filter(Boolean).join(", ");
  const code = passCode(token);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <article aria-label={`Pass di ${who}`} className="overflow-hidden rounded-ui border border-border bg-bg">
        <header className="flex flex-col gap-1 p-6">
          <p className="text-sm text-muted">Pass · {pass.agency_name}</p>
          <h1 className="text-2xl font-semibold">{pass.event_title}</h1>
        </header>
        <dl className="grid grid-cols-2 gap-4 border-t border-dashed border-border p-6 text-sm">
          <div className="col-span-2">
            <dt className="font-mono text-xs uppercase text-muted">Nome</dt>
            <dd className="text-base font-semibold">{who}</dd>
            {what && <dd className="text-muted">{what}</dd>}
          </div>
          <div>
            <dt className="font-mono text-xs uppercase text-muted">Giorno</dt>
            <dd className="first-letter:uppercase">{dayLabel(pass.day)}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase text-muted">Arrivo</dt>
            <dd className="font-mono tabular-nums">{pass.call_time ? hhmm(pass.call_time) : "Da definire"}</dd>
          </div>
          {place && (
            <div className="col-span-2">
              <dt className="font-mono text-xs uppercase text-muted">Luogo</dt>
              <dd>{place}</dd>
            </div>
          )}
        </dl>
        <div className="flex flex-col items-center gap-3 border-t border-dashed border-border p-6">
          {pass.event_status === "cancelled" ? (
            <p className="rounded-ui border border-border px-3 py-1 font-semibold">Evento annullato</p>
          ) : pass.checked_in_at ? (
            <p className="rounded-ui border border-border px-3 py-1 font-semibold">✓ Arrivato alle {clock.format(new Date(pass.checked_in_at))}</p>
          ) : null}
          {pass.event_status !== "cancelled" && (
            <>
              <div
                role="img"
                aria-label="Codice QR del pass"
                className="w-56 rounded-ui bg-white p-4 [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
              <p className="font-mono text-lg tracking-widest" aria-label={`Codice ${code.split("").join(" ")}`}>
                {code}
              </p>
            </>
          )}
        </div>
      </article>
      {pass.event_status !== "cancelled" && (
        <p className="text-center text-sm text-muted">
          Mostra il QR all&apos;ingresso. Puoi farne uno screenshot: va bene anche senza rete. Se la fotocamera non lo legge, detta il codice.
        </p>
      )}
    </main>
  );
}
