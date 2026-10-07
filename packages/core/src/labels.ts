/** Italian labels and messages shared by the web app and the mobile app. */
import type { MemberRole, OrgType } from "./organizations";
import type { OBJECTIVES } from "./requests";

export const ORG_TYPE_LABEL: Record<OrgType, string> = { agency: "Agenzia", client: "Azienda", supplier: "Fornitore" };

export const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Titolare",
  admin: "Amministratore",
  manager: "Project manager",
  member: "Membro",
  approver: "Approvatore spesa",
};

export const OBJECTIVE_LABEL: Record<(typeof OBJECTIVES)[number], string> = {
  product_launch: "Lancio prodotto",
  brand_awareness: "Brand awareness",
  internal: "Evento interno",
  trade_fair: "Fiera",
  pop_up: "Pop-up",
  other: "Altro",
};

export const REQUEST_STATUS_LABEL = { draft: "Bozza", sent: "Inviata", awarded: "Assegnata", cancelled: "Annullata" } as const;

export const PROPOSAL_STATUS_LABEL = {
  invited: "Nuova",
  reviewing: "In revisione",
  clarification: "Chiarimenti",
  submitted: "Proposta inviata",
  revision_requested: "Modifiche richieste",
  accepted: "Accettata",
  rejected: "Non scelta",
  declined: "Rifiutata",
  withdrawn: "Ritirata",
} as const;

export const EVENT_STATUS_LABEL = {
  planning: "In pianificazione",
  preparing: "In preparazione",
  live: "In corso",
  completed: "Concluso",
  cancelled: "Annullato",
} as const;

export const BOOKING_STATUS_LABEL = { to_book: "Da prenotare", requested: "Richiesto", confirmed: "Confermato", cancelled: "Annullato" } as const;

export const QUOTE_STATUS_LABEL = {
  draft: "Bozza",
  sent: "Da approvare",
  approved: "Approvato",
  changes_requested: "Modifiche richieste",
  superseded: "Sostituito",
} as const;

/** Maps Postgres errors raised by the RPCs to messages people can act on. */
export function dbErrorMessage(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "42501":
      return "Non hai i permessi per questa azione.";
    case "P0002":
      return "Questo invito non è più valido.";
    case "28000":
      return "Accedi per continuare.";
    case "23505":
      return "Esiste già.";
    case "22023":
      return "Questa azione non è più possibile: la pagina potrebbe non essere aggiornata.";
    default:
      return "Qualcosa non ha funzionato. Riprova.";
  }
}

export const SUPPLIER_BUCKET_LABEL = {
  to_answer: "Da rispondere",
  answered: "In attesa dell'agenzia",
  confirmed: "Confermate",
  closed: "Annullate e concluse",
} as const;
