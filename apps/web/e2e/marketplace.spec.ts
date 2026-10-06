import { expect, test, type Browser } from "@playwright/test";

const run = Date.now();

async function signUpWithOrg(browser: Browser, person: string, email: string, type: RegExp, org: string) {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await page.getByRole("button", { name: "Non hai un account? Registrati" }).click();
  await page.getByLabel("Nome e cognome").fill(person);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password-sicura-1");
  await page.getByRole("button", { name: "Crea account" }).click();
  await page.getByRole("radio", { name: type }).check();
  await page.getByLabel("Nome", { exact: true }).fill(org);
  await page.getByRole("button", { name: "Crea account" }).click();
  return page;
}

test("companies find agencies and agencies find suppliers in the marketplace", async ({ browser }) => {
  // A DJ lists its profile.
  const dj = await signUpWithOrg(browser, "Luca Dee", `dj-${run}@example.test`, /Fornitore/, `Luca Sound ${run}`);
  await expect(dj).toHaveURL(/\/supplier$/);
  await dj.getByLabel("Titolo").fill(`DJ per eventi aziendali ${run}`);
  await dj.getByLabel("Intrattenimento").check();
  await dj.getByLabel("Zone coperte").fill("Lombardia, Piemonte");
  await dj.getByLabel("Telefono pubblico").fill("333 9876543");
  await dj.getByLabel("Mostra il profilo nel marketplace").check();
  await dj.getByRole("button", { name: "Salva" }).click();
  await expect(dj.getByText("Profilo salvato.")).toBeVisible();

  // An agency finds the DJ by service and area and adds them to its address book.
  const agency = await signUpWithOrg(browser, "Anna Regia", `regia-${run}@example.test`, /Agenzia di eventi/, `Regia ${run}`);
  await expect(agency).toHaveURL(/\/pro$/);
  await agency.getByRole("link", { name: "Trova fornitori" }).click();
  await agency.getByLabel("Cerca").fill(String(run));
  await agency.getByLabel("Servizio").selectOption("entertainment");
  await agency.getByLabel("Zona").fill("lombardia");
  await agency.getByRole("button", { name: "Cerca" }).click();
  await expect(agency.getByText("1 risultato")).toBeVisible();
  await agency.getByRole("link", { name: `Luca Sound ${run}` }).click();
  await expect(agency.getByRole("heading", { level: 1, name: `Luca Sound ${run}` })).toBeVisible();
  await expect(agency.getByRole("link", { name: `WhatsApp a Luca Sound ${run}` })).toHaveAttribute("href", "https://wa.me/393339876543");
  await agency.getByRole("button", { name: "Aggiungi alla rubrica" }).click();
  await expect(agency.getByText("Aggiunto alla rubrica.")).toBeVisible();
  await expect(agency.getByText(`usa I-Events come`)).toBeVisible();
  await agency.goto("/pro/fornitori?q=" + run);
  await expect(agency.getByRole("link", { name: "In rubrica" })).toBeVisible();

  await dj.goto("/notifiche");
  await expect(dj.getByText(`Regia ${run} ti ha aggiunto ai suoi fornitori`)).toBeVisible();

  // The agency lists itself; a company finds it and starts a request addressed to it.
  await agency.getByRole("link", { name: "Profilo marketplace" }).click();
  await agency.getByLabel("Titolo").fill(`Convention e lanci di prodotto ${run}`);
  await agency.getByLabel("Organizzazione e regia").check();
  await agency.getByLabel("Zone coperte").fill("Milano");
  await agency.getByLabel("Mostra il profilo nel marketplace").check();
  await agency.getByRole("button", { name: "Salva" }).click();
  await expect(agency.getByText("Profilo salvato.")).toBeVisible();

  const brand = await signUpWithOrg(browser, "Carla Brand", `brand-mkt-${run}@example.test`, /Azienda/, `Brand ${run}`);
  await expect(brand).toHaveURL(/\/client$/);
  await brand.getByRole("link", { name: "Trova agenzie" }).click();
  await brand.getByLabel("Cerca").fill(`lanci di prodotto ${run}`);
  await brand.getByLabel("Zona").fill("Milano");
  await brand.getByRole("button", { name: "Cerca" }).click();
  await brand.getByRole("link", { name: `Regia ${run}` }).click();
  await expect(brand.getByText("Eventi conclusi su I-Events")).toBeVisible();
  await brand.getByRole("link", { name: "Chiedi un preventivo" }).click();
  await expect(brand.getByText(`La richiesta andrà a Regia ${run}`)).toBeVisible();
});
