import { keywordClassifier, phoneContactsToDrafts, type ContactDraft, type ServiceKey } from "@i-events/core";
import { Contact, ContactField, getPermissionsAsync, requestPermissionsAsync } from "expo-contacts";
import { Platform } from "react-native";
import { env, siteOnline } from "./env";
import { supabase } from "./supabase";

/** Where the person stands with access to the phone's address book. `blocked`: only the system settings can change it. */
export type ContactsAccess = "unsupported" | "undetermined" | "granted" | "denied" | "blocked";

export const contactsSupported = Platform.OS === "ios" || Platform.OS === "android";

const toAccess = (p: { granted: boolean; status: string; canAskAgain: boolean }): ContactsAccess =>
  p.granted ? "granted" : p.status === "undetermined" ? "undetermined" : p.canAskAgain ? "denied" : "blocked";

export async function getContactsAccess(): Promise<ContactsAccess> {
  if (!contactsSupported) return "unsupported";
  return toAccess(await getPermissionsAsync());
}

export async function requestContactsAccess(): Promise<ContactsAccess> {
  if (!contactsSupported) return "unsupported";
  return toAccess(await requestPermissionsAsync());
}

const FIELDS = [
  ContactField.FULL_NAME,
  ContactField.GIVEN_NAME,
  ContactField.FAMILY_NAME,
  ContactField.COMPANY,
  ContactField.JOB_TITLE,
  ContactField.EMAILS,
  ContactField.PHONES,
  ContactField.ADDRESSES,
  ContactField.URL_ADDRESSES,
] as const;

/** Reads the address book (only the fields the import needs) and proposes a service for each contact. */
export async function readPhoneContacts(): Promise<ContactDraft[]> {
  const list = await Contact.getAllDetails(FIELDS);
  return phoneContactsToDrafts(list).contacts.sort((a, b) => a.name.localeCompare(b.name, "it"));
}

/**
 * Better service proposals from the site (Jev when it is configured there). Falls back to the keyword rules the app
 * already applied when the site cannot be reached.
 */
export async function suggestServices(orgId: string, contacts: ContactDraft[]): Promise<ServiceKey[][]> {
  const fallback = () => keywordClassifier.classify(contacts);
  const { data } = await supabase.auth.getSession();
  if (!siteOnline || !data.session || contacts.length === 0) return fallback();
  try {
    const res = await fetch(`${env.siteUrl}/api/app/classify-contacts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, contacts }),
    });
    if (!res.ok) return fallback();
    const body = (await res.json()) as { services?: ServiceKey[][] };
    return body.services?.length === contacts.length ? body.services : fallback();
  } catch {
    return fallback();
  }
}

/** Saves the chosen contacts in the agency's address book, 1000 per call; existing ones are merged, not doubled. */
export async function importToAddressBook(orgId: string, contacts: ContactDraft[]): Promise<{ created: number; merged: number }> {
  let created = 0;
  let merged = 0;
  for (let i = 0; i < contacts.length; i += 1000) {
    const { data, error } = await supabase.rpc("import_contacts", { p_org: orgId, p_rows: contacts.slice(i, i + 1000), p_source: "phone" });
    if (error) throw error;
    const r = data as { created: number; merged: number };
    created += r.created;
    merged += r.merged;
  }
  return { created, merged };
}
