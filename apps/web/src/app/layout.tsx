import type { Metadata, Viewport } from "next";
import { Azeret_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

/** Bricolage Grotesque for every text (optical size follows the font size), Azeret Mono for data. */
const bricolage = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], axes: ["opsz"], variable: "--font-bricolage", display: "swap" });
const azeret = Azeret_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-azeret", display: "swap" });

export const metadata: Metadata = {
  title: { default: "I-Events", template: "%s · I-Events" },
  description: "Agenzie, aziende e fornitori di eventi in un unico spazio di lavoro.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F3EF" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${bricolage.variable} ${azeret.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
