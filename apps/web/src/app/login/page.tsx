import type { Metadata } from "next";
import { Logo } from "@/components/ui";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Accedi" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <Link href="/" className="flex min-h-11 items-center self-start" aria-label="I-Events, home">
        <Logo />
      </Link>
      <h1 className="text-2xl font-semibold">Accedi a I-Events</h1>
      <LoginForm next={next} />
    </main>
  );
}
