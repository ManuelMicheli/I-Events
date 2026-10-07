import { expect, test } from "@playwright/test";

const run = Date.now();

// An Italian Excel export: semicolons, a BOM, a duplicate row and a category column.
const csv = [
  "﻿Nome;Cognome;Azienda;Cellulare;E-mail;Categoria;Città",
  "Marco;Bianchi;Sound Factory;333 111 2233;marco@soundfactory.test;Service audio luci;Milano",
  "Giulia;Verdi;Steward Pro;+39 340 555 6677;giulia@stewardpro.test;Vigilanza;Torino",
  "Marco;Bianchi;Sound Factory;3331112233;;;Milano",
  "Luca;Neri;;;luca@pulizie.test;Pulizie;",
].join("\r\n");

test("agency imports its suppliers from a file and from pasted text", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await page.getByRole("button", { name: "Non hai un account? Registrati" }).click();
  await page.getByLabel("Nome e cognome").fill("Titolare Rubrica");
  await page.getByLabel("Email").fill(`rubrica-${run}@example.test`);
  await page.getByLabel("Password").fill("password-sicura-1");
  await page.getByRole("button", { name: "Crea account" }).click();
  await page.getByRole("radio", { name: /Agenzia di eventi/ }).check();
  await page.getByLabel("Nome", { exact: true }).fill(`Rubrica ${run}`);
  await page.getByRole("button", { name: "Crea account" }).click();
  await expect(page).toHaveURL(/\/pro$/);

  await page.getByRole("link", { name: "Rubrica" }).click();
  await expect(page.getByText("La rubrica è vuota")).toBeVisible();
  await page.getByRole("link", { name: "Importa contatti" }).click();

  // File: columns are recognized, duplicates in the file merged, services proposed.
  await page.getByLabel("CSV, Excel (.xlsx) o vCard (.vcf)").setInputFiles({ name: "fornitori.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.getByText("4 righe nel file.")).toBeVisible();
  await expect(page.getByLabel("Campo per Cellulare")).toHaveValue("phone");
  await expect(page.getByLabel("Campo per Categoria")).toHaveValue("category");
  await page.getByRole("button", { name: "Continua" }).click();
  await expect(page.getByText("Ho unito 1 duplicato")).toBeVisible();
  await expect(page.getByLabel("Servizio di Marco Bianchi")).toHaveValue("av");
  await expect(page.getByLabel("Servizio di Giulia Verdi")).toHaveValue("security");
  await expect(page.getByLabel("Servizio di Luca Neri")).toHaveValue("cleaning");
  await page.getByLabel("Importa Luca Neri").uncheck();
  await page.getByRole("button", { name: "Importa 2 contatti" }).click();
  await expect(page.getByText("2 nuovi contatti, 0 già in rubrica")).toBeVisible();

  // Pasted text: an existing contact is completed, not duplicated.
  await page.goto("/pro/rubrica/importa");
  await page.getByLabel("Contatti da incollare").fill("Marco Bianchi 333 1112233 regia@soundfactory.test\nDJ Alex 347 9988776");
  await page.getByRole("button", { name: "Riconosci contatti" }).click();
  await expect(page.getByLabel("Servizio di DJ Alex")).toHaveValue("entertainment");
  await page.getByRole("button", { name: "Importa 2 contatti" }).click();
  await expect(page.getByText("1 nuovo contatto, 1 già in rubrica")).toBeVisible();

  await page.getByRole("link", { name: "Vai alla rubrica" }).click();
  await expect(page.getByText("3 contatti")).toBeVisible();
  await expect(page.getByRole("link", { name: "WhatsApp a Giulia Verdi" })).toHaveAttribute("href", "https://wa.me/393405556677");
  await expect(page.getByRole("link", { name: "Email a Marco Bianchi" })).toHaveAttribute("href", "mailto:marco@soundfactory.test");

  // Filter by service, then open and edit a contact.
  await page.getByRole("navigation", { name: "Servizio" }).getByRole("link", { name: "Sicurezza e steward" }).click();
  await expect(page.getByText("1 contatto")).toBeVisible();
  await page.getByRole("link", { name: "Giulia Verdi", exact: true }).click();
  await page.getByLabel("Note").fill("Squadra affidabile per concerti.");
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(page.getByText("Contatto salvato")).toBeVisible();
});
