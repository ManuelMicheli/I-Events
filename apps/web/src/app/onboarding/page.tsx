import { requireUser } from "@/lib/session";
import type { Metadata } from "next";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Crea il tuo account" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string; tipo?: string }> }) {
  const { next, tipo } = await searchParams;
  await requireUser();
  // From 1536 px the three account types sit side by side, so the composition widens (A11 in globals.css).
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6 py-12 2xl:max-w-5xl 2xl:gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Benvenuto in I-Events</h1>
        <p className="text-muted">Crea lo spazio della tua agenzia, azienda o attività. Il periodo di prova dura 30 giorni.</p>
      </div>
      <OnboardingForm next={next} defaultType={tipo === "agency" || tipo === "client" || tipo === "supplier" ? tipo : undefined} />
    </main>
  );
}
