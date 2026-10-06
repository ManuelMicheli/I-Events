"use server";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { redirect } from "next/navigation";
import { z } from "zod";

export type AuthState = { error?: string; info?: string };

const credentials = z.object({
  email: z.email("Email non valida"),
  password: z.string().min(8, "Almeno 8 caratteri"),
  fullName: z.string().trim().max(120).optional(),
  next: z.string().optional(),
});

/** Only same-site relative paths, so an invite link cannot redirect elsewhere. */
function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Email o password non corretti." };
  redirect(safeNext(parsed.data.next));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { email, password, fullName, next } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName ?? "" },
      emailRedirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(safeNext(next))}`,
    },
  });
  if (error) return { error: error.code === "user_already_exists" ? "Esiste già un account con questa email." : "Registrazione non riuscita." };
  if (!data.session) return { info: "Ti abbiamo inviato un'email per confermare l'account." };
  redirect(safeNext(next));
}
