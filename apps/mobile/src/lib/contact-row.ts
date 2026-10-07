import { contactSchema, normalizeEmail, normalizePhone } from "@i-events/core";
import type { ContactRow } from "./contacts";

export type Fields = "name" | "company" | "role_title" | "city" | "phone" | "email" | "website" | "notes";

const orNull = (s: string) => s.trim() || null;

/** Checks the form like the website does and returns the row to save, or the message for each wrong field. */
export function contactRow(v: Record<Fields, string>, services: string[], rating: number | null) {
  const errors: Partial<Record<Fields, string>> = {};
  const phone = normalizePhone(v.phone);
  if (v.phone.trim() && !phone) errors.phone = "Telefono non valido";
  const email = normalizeEmail(v.email);
  if (v.email.trim() && !email) errors.email = "Email non valida";
  const parsed = contactSchema.safeParse({
    name: v.name,
    company: orNull(v.company) ?? undefined,
    role_title: orNull(v.role_title) ?? undefined,
    city: orNull(v.city) ?? undefined,
    website: orNull(v.website) ?? undefined,
    notes: orNull(v.notes) ?? undefined,
    phone,
    email,
    services,
  });
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0]) as Fields] ??= i.message;
  if (!parsed.success || Object.keys(errors).length > 0) return { errors };
  const d = parsed.data;
  const row: ContactRow = {
    name: d.name,
    company: d.company ?? null,
    role_title: d.role_title ?? null,
    city: d.city ?? null,
    website: d.website ?? null,
    notes: d.notes ?? null,
    phone: d.phone ?? null,
    email: d.email ?? null,
    services: d.services,
    rating,
  };
  return { row };
}
