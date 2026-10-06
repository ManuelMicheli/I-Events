import { dbErrorMessage } from "@i-events/core";

/** A message people can act on, for errors from Supabase or the network. */
export function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const e = error as { code?: string; message: string };
    if (/network|fetch|timed? ?out/i.test(e.message)) return "Connessione assente o lenta. Controlla la rete e riprova.";
    return dbErrorMessage(e);
  }
  return "Qualcosa non ha funzionato. Riprova.";
}
