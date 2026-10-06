import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Calendario eventi" };

export default function PublicCalendar() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold">Calendario eventi</h1>
      <p className="text-muted">Qui troverai gli eventi aperti al pubblico organizzati su I-Events. In arrivo.</p>
      <Link href="/" className="text-sm underline">
        Torna alla home
      </Link>
    </main>
  );
}
