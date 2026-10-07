"use server";

import { forgetTicket, rememberTicket } from "@/lib/public-events";
import { createClient } from "@/lib/supabase/server";
import { isTicketToken, registrationErrorMessage, registrationSchema } from "@i-events/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export type RegisterState = {
  error?: string;
  fields?: Partial<Record<"name" | "email" | "guests" | "consent", string>>;
  /** What was typed, so the form shows it again after an error. */
  values?: { name: string; email: string; consent: boolean };
};

/** Registers someone for a public event, keeps the ticket on this device and opens it, stamped. */
export async function registerForEvent(_: RegisterState, form: FormData): Promise<RegisterState> {
  const eventId = z.uuid().safeParse(form.get("eventId"));
  if (!eventId.success) return { error: "Questo evento non è più aperto al pubblico." };
  const values = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? "").trim(), consent: form.get("consent") === "on" };
  const parsed = registrationSchema.safeParse({ ...values, guests: form.get("guests") ?? 1 });
  if (!parsed.success) {
    const fields: RegisterState["fields"] = {};
    for (const i of parsed.error.issues) fields[i.path[0] as keyof typeof fields] ??= i.message;
    return { error: "Controlla i campi evidenziati.", fields, values };
  }

  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("register_for_event", {
    p_event: eventId.data,
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_guests: parsed.data.guests,
  });
  if (error) {
    const message = registrationErrorMessage(error);
    return error.code === "23505" ? { error: message, fields: { email: "Già iscritta a questo evento" }, values } : { error: message, values };
  }
  await rememberTicket(token);
  revalidatePath(`/eventi/${eventId.data}`);
  redirect(`/biglietto/${token}?momento=iscritto`);
}

/** Gives the place back: the ticket stops working and leaves this device's list. */
export async function cancelRegistration(form: FormData) {
  const token = String(form.get("token") ?? "");
  const eventId = z.uuid().parse(form.get("eventId"));
  if (!isTicketToken(token)) throw new Error("Biglietto non valido");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_registration", { p_token: token });
  if (error) throw new Error("Non riusciamo ad annullare l'iscrizione. Riprova tra poco.");
  await forgetTicket(token.toLowerCase());
  revalidatePath(`/eventi/${eventId}`);
  redirect(`/eventi/${eventId}?momento=annullata`);
}
