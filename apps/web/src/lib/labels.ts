import type { MemberRole, OrgType } from "@i-events/core";

export const ORG_TYPE_LABEL: Record<OrgType, string> = { agency: "Agenzia", client: "Azienda", supplier: "Fornitore" };

export const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Titolare",
  admin: "Amministratore",
  manager: "Project manager",
  member: "Membro",
  approver: "Approvatore spesa",
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
    default:
      return "Qualcosa non ha funzionato. Riprova.";
  }
}
