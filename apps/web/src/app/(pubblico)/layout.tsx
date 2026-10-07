import { TabBar, TopNav } from "@/components/public/nav";
import { Logo } from "@/components/ui";
import Link from "next/link";
import type { ReactNode } from "react";

/** The public area: events open to everyone, the calendar and the tickets taken on this device. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-app/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 2xl:max-w-7xl 3xl:max-w-public 3xl:px-12">
          <Link href="/eventi" aria-label="I-Events, eventi aperti al pubblico" className="-mx-1 flex min-h-11 items-center px-1">
            <Logo />
          </Link>
          <TopNav />
          <Link href="/" className="hidden min-h-10 items-center text-sm text-muted underline lg:flex">
            Per agenzie e aziende
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pt-6 pb-[calc(56px+env(safe-area-inset-bottom)+32px)] sm:px-6 sm:pt-10 sm:pb-16 2xl:max-w-7xl 3xl:max-w-public 3xl:px-12">
        {children}
      </main>
      <TabBar />
    </div>
  );
}
