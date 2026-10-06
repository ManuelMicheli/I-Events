"use client";

import { Button, Field, Input, Notice } from "@/components/ui";
import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "signin" ? signIn : signUp, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      {mode === "signup" && (
        <Field label="Nome e cognome">
          <Input name="fullName" autoComplete="name" required />
        </Field>
      )}
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" hint={mode === "signup" ? "Almeno 8 caratteri" : undefined}>
        <Input name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} required />
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.info && <Notice tone="success">{state.info}</Notice>}
      <Button type="submit" disabled={pending}>
        {mode === "signin" ? "Accedi" : "Crea account"}
      </Button>
      <button type="button" className="text-sm text-muted underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
        {mode === "signin" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
      </button>
    </form>
  );
}
