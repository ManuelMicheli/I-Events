import { expect, test, type Page } from "@playwright/test";

const run = Date.now();
const agencyEmail = `agenzia-${run}@example.test`;
const clientEmail = `azienda-${run}@example.test`;
const colleagueEmail = `collega-${run}@example.test`;
const password = "password-sicura-1";

async function signUp(page: Page, name: string, email: string) {
  await page.getByRole("button", { name: "Non hai un account? Registrati" }).click();
  await page.getByLabel("Nome e cognome").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Crea account" }).click();
}

async function createOrg(page: Page, type: RegExp, name: string) {
  await page.getByRole("radio", { name: type }).check();
  await page.getByLabel("Nome", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Crea account" }).click();
}

test("agency invites a client and a colleague", async ({ browser }) => {
  // Agency signs up and creates its organization.
  const agency = await (await browser.newContext()).newPage();
  await agency.goto("/login");
  await signUp(agency, "Anna Rossi", agencyEmail);
  await expect(agency).toHaveURL(/\/onboarding/);
  await createOrg(agency, /Agenzia di eventi/, `NSS Test ${run}`);
  await expect(agency).toHaveURL(/\/pro$/);
  await expect(agency.getByRole("heading", { name: "Richieste ricevute" })).toBeVisible();

  // Agency creates a connection invite for a client it already knows.
  await agency.getByRole("link", { name: "Aziende collegate" }).click();
  await expect(agency.getByRole("heading", { name: "Aziende collegate" })).toBeVisible();
  await agency.getByLabel("Email").fill(clientEmail);
  await agency.getByRole("button", { name: "Crea invito" }).click();
  const connectionLink = (await agency.locator("code").textContent())!;
  expect(connectionLink).toContain("/invito/");

  // Client opens the link, signs up, creates its company and accepts.
  const client = await (await browser.newContext()).newPage();
  await client.goto(new URL(connectionLink).pathname);
  await client.getByRole("link", { name: "Accedi o registrati" }).click();
  await signUp(client, "Carla Bianchi", clientEmail);
  await expect(client.getByText(`NSS Test ${run}`)).toBeVisible();
  await client.getByRole("link", { name: /Crea l'account azienda/ }).click();
  await createOrg(client, /Azienda/, `Brand Test ${run}`);
  await expect(client).toHaveURL(/\/invito\//);
  await client.getByRole("button", { name: "Accetta" }).click();
  await expect(client).toHaveURL(/\/client$/);
  await client.getByRole("link", { name: "Agenzie collegate" }).click();
  await expect(client.getByText(`NSS Test ${run}`)).toBeVisible();

  // The agency now sees the client among its connections.
  await agency.reload();
  await expect(agency.getByText(`Brand Test ${run}`)).toBeVisible();

  // Agency invites a colleague as project manager.
  await agency.getByRole("link", { name: "Team" }).click();
  await expect(agency.getByRole("heading", { name: /Team di/ })).toBeVisible();
  await agency.getByLabel("Email").fill(colleagueEmail);
  await agency.getByLabel("Ruolo").selectOption("manager");
  await agency.getByRole("button", { name: "Crea invito" }).click();
  const memberLink = (await agency.locator("code").textContent())!;

  const colleague = await (await browser.newContext()).newPage();
  await colleague.goto(new URL(memberLink).pathname);
  await colleague.getByRole("link", { name: "Accedi o registrati" }).click();
  await signUp(colleague, "Marco Verdi", colleagueEmail);
  await expect(colleague.getByText("Project manager")).toBeVisible();
  await colleague.getByRole("button", { name: "Accetta" }).click();
  await expect(colleague).toHaveURL(/\/pro$/);

  await agency.reload();
  await expect(agency.getByText("Marco Verdi")).toBeVisible();
});

test("signed-out visitors are sent to login", async ({ page }) => {
  await page.goto("/impostazioni/team");
  await expect(page).toHaveURL(/\/login\?next=%2Fimpostazioni%2Fteam/);
});
