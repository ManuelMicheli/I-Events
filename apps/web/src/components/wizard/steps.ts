export const WIZARD_STEPS = ["tipo", "basi", "campagna", "servizi", "note", "agenzie", "riepilogo"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export function isWizardStep(value: unknown): value is WizardStep {
  return typeof value === "string" && (WIZARD_STEPS as readonly string[]).includes(value);
}
