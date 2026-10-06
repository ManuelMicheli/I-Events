import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "I-Events", template: "%s · I-Events" },
  description: "Agenzie, aziende e fornitori di eventi in un unico spazio di lavoro.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
