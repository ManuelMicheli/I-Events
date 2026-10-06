"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./session";
import { createClient } from "./supabase/server";

export async function markAllNotificationsRead() {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  if (error) throw error;
  revalidatePath("/notifiche");
}

export async function setEmailNotifications(form: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ email_notifications: form.get("email") === "on" }).eq("id", user.id);
  if (error) throw error;
  revalidatePath("/notifiche");
}
