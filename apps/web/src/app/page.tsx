import { ButtonLink } from "@/components/ui";
import { AREA_BY_TYPE, getActiveOrg, getUser } from "@/lib/session";

export default async function Home() {
  const user = await getUser();
  const org = user ? await getActiveOrg() : null;
  const next = user ? (org ? AREA_BY_TYPE[org.type] : "/onboarding") : "/login";

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-8 px-6">
      <h1 className="text-4xl font-semibold">I-Events</h1>
      <p className="max-w-xl text-lg text-muted">
        Le aziende chiedono, le agenzie progettano ed eseguono, i fornitori lavorano, il pubblico partecipa. Tutto in un
        unico spazio.
      </p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href={next} size="l">
          {user ? "Vai al tuo spazio" : "Accedi o registrati"}
        </ButtonLink>
        <ButtonLink href="/eventi" variant="secondary" size="l">
          Eventi aperti al pubblico
        </ButtonLink>
      </div>
    </main>
  );
}
