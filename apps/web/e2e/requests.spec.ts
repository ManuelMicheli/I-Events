import { expect, test, type Browser, type Page } from "@playwright/test";

const run = Date.now();
const password = "password-sicura-1";
const clientEmail = `brand-${run}@example.test`;

async function signUp(page: Page, name: string, email: string) {
  await page.getByRole("button", { name: "Non hai un account? Registrati" }).click();
  await page.getByLabel("Nome e cognome").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Crea account" }).click();
}

/** Signs up an agency and returns its page plus a connection invite link for the client. */
async function agencyWithInvite(browser: Browser, name: string) {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await signUp(page, `Titolare ${name}`, `${name.toLowerCase()}-${run}@example.test`);
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole("radio", { name: /Agenzia di eventi/ }).check();
  await page.getByLabel("Nome", { exact: true }).fill(`${name} ${run}`);
  await page.getByRole("button", { name: "Crea account" }).click();
  await expect(page).toHaveURL(/\/pro$/);
  await page.getByRole("link", { name: "Aziende collegate" }).click();
  await expect(page.getByRole("heading", { name: "Aziende collegate" })).toBeVisible();
  await page.getByLabel("Email").fill(clientEmail);
  await page.getByRole("button", { name: "Crea invito" }).click();
  const link = (await page.locator("code").textContent())!;
  return { page, invite: new URL(link).pathname };
}

async function answerRequest(page: Page, title: string, amounts: [string, string]) {
  await page.goto("/pro");
  await page.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText("Addetti alla sicurezza")).toBeVisible();
  await page.getByRole("button", { name: "Prendi in carico" }).click();
  await expect(page.getByText("In revisione", { exact: true })).toBeVisible();
  await page.getByLabel("Sintesi per l'azienda").fill("Squadra completa con coordinatore dedicato.");
  await page.getByLabel("Importo").nth(0).fill(amounts[0]);
  await page.getByLabel("Importo").nth(1).fill(amounts[1]);
  await page.getByRole("button", { name: "Invia proposta all'azienda" }).click();
  await expect(page.getByText("Proposta inviata", { exact: true })).toBeVisible();
}

test("client sends a request to two agencies, compares proposals and accepts one", async ({ browser }) => {
  const alfa = await agencyWithInvite(browser, "Alfa");
  const beta = await agencyWithInvite(browser, "Beta");

  // The client joins through Alfa's invite, then accepts Beta's too.
  const client = await (await browser.newContext()).newPage();
  await client.goto(alfa.invite);
  await client.getByRole("link", { name: "Accedi o registrati" }).click();
  await signUp(client, "Carla Bianchi", clientEmail);
  await client.getByRole("link", { name: /Crea l'account azienda/ }).click();
  await client.getByRole("radio", { name: /Azienda/ }).check();
  await client.getByLabel("Nome", { exact: true }).fill(`Brand ${run}`);
  await client.getByRole("button", { name: "Crea account" }).click();
  await expect(client).toHaveURL(/\/invito\//);
  await client.getByRole("button", { name: "Accetta" }).click();
  await expect(client).toHaveURL(/\/client$/);
  await client.goto(beta.invite);
  await client.getByRole("button", { name: "Accetta" }).click();
  await expect(client).toHaveURL(/\/client$/);

  // Wizard: single event with two services, sent to both agencies.
  const title = `Lancio ${run}`;
  await client.getByRole("link", { name: "Nuova richiesta" }).click();
  await client.getByRole("button", { name: /Evento singolo/ }).click();
  await client.getByLabel("Nome dell'evento o della campagna *").fill(title);
  await client.getByLabel("Data", { exact: true }).fill("2027-06-15");
  await client.getByLabel("Ospiti previsti").fill("300");
  await client.getByRole("button", { name: "Avanti" }).click();
  await expect(client).toHaveURL(/\/client\/richieste\/[0-9a-f-]+\/modifica/);
  await client.getByLabel("Sicurezza e steward").check();
  await client.getByLabel("Addetti alla sicurezza").fill("4");
  await client.getByLabel("Catering e bar").check();
  await client.getByLabel("Formula *").selectOption("buffet");
  await client.getByRole("button", { name: "Avanti" }).click();
  await client.getByLabel("Richieste libere").fill("Vorremmo un angolo per le foto con il prodotto.");
  await client.getByRole("button", { name: "Avanti" }).click();
  await client.getByLabel(new RegExp(`Alfa ${run}`)).check();
  await client.getByLabel(new RegExp(`Beta ${run}`)).check();
  await client.getByRole("button", { name: "Avanti" }).click();
  await client.getByRole("button", { name: "Invia a 2 agenzie" }).click();
  await expect(client).toHaveURL(/\/client\/richieste\/[0-9a-f-]+$/);
  const requestUrl = new URL(client.url()).pathname;

  // Both agencies read the brief and answer.
  await answerRequest(alfa.page, title, ["1500", "3000"]);
  await answerRequest(beta.page, title, ["1200", "2500"]);
  await alfa.page.getByLabel("Messaggio").fill("Il parcheggio per i fornitori è disponibile?");
  await alfa.page.getByRole("button", { name: "Invia", exact: true }).click();
  await expect(alfa.page.getByText("Il parcheggio per i fornitori è disponibile?")).toBeVisible();

  // The client compares, asks Alfa for changes and sees the question.
  await client.goto(requestUrl);
  await expect(client.getByRole("heading", { name: "Confronto voce per voce" })).toBeVisible();
  await expect(client.getByRole("row", { name: new RegExp(`Beta ${run}.*più bassa`) })).toBeVisible();
  await client.locator("summary", { hasText: `Alfa ${run}` }).click();
  await expect(client.getByText("Il parcheggio per i fornitori è disponibile?")).toBeVisible();
  const alfaCard = client.locator("section", { has: client.getByRole("heading", { name: new RegExp(`Proposta di Alfa ${run}`) }) });
  await alfaCard.getByRole("button", { name: "Chiedi modifiche" }).click();
  await alfaCard.getByLabel("Cosa vuoi cambiare?").fill("Potete rivedere il catering?");
  await alfaCard.getByRole("button", { name: "Invia richiesta di modifica" }).click();
  await expect(alfaCard.getByText("Modifiche richieste")).toBeVisible();

  // Alfa sees the request for changes and sends version 2.
  await alfa.page.reload();
  await expect(alfa.page.getByText("Potete rivedere il catering?")).toBeVisible();
  await alfa.page.getByLabel("Importo").nth(1).fill("2000");
  await alfa.page.getByRole("button", { name: "Invia proposta aggiornata" }).click();
  await expect(alfa.page.getByText("Proposta inviata", { exact: true })).toBeVisible();

  // The client accepts Beta: the event is created and Alfa is told.
  await client.reload();
  await expect(client.getByRole("heading", { name: new RegExp(`Proposta di Alfa ${run} · versione 2`) })).toBeVisible();
  client.once("dialog", (d) => d.accept());
  await client.getByRole("button", { name: `Accetta la proposta di Beta ${run}` }).click();
  await expect(client.getByRole("heading", { name: "Evento creato" })).toBeVisible();
  await expect(client.getByText("Assegnata", { exact: false }).first()).toBeVisible();

  await alfa.page.reload();
  await expect(alfa.page.getByText("L'azienda ha scelto un'altra proposta.")).toBeVisible();
  await beta.page.reload();
  await expect(beta.page.getByText("L'azienda ha scelto la tua proposta.", { exact: false })).toBeVisible();
});
