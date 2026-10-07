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

const pdf = (name: string) => ({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% I-Events test\n") });

async function answerRequest(page: Page, title: string, amounts: [string, string], file?: string) {
  // The agency arrives from its notification, which opens the report directly.
  await page.goto("/notifiche");
  await page.getByRole("link", { name: /Nuova richiesta da Brand/ }).click();
  await expect(page).toHaveURL(/\/pro\/richieste\//);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText("Addetti alla sicurezza")).toBeVisible();
  await page.getByRole("button", { name: "Prendi in carico" }).click();
  await expect(page.getByText("In revisione", { exact: true })).toBeVisible();
  await page.getByLabel("Sintesi per l'azienda").fill("Squadra completa con coordinatore dedicato.");
  await page.getByLabel("Importo").nth(0).fill(amounts[0]);
  await page.getByLabel("Importo").nth(1).fill(amounts[1]);
  if (file) {
    await page.getByLabel("Aggiungi file").setInputFiles(pdf(file));
    await expect(page.getByRole("link", { name: file })).toBeVisible();
  }
  await page.getByRole("button", { name: "Invia proposta all'azienda" }).click();
  await expect(page.getByText("Proposta inviata", { exact: true })).toBeVisible();
}

test("client sends a request to two agencies, compares proposals and accepts one", async ({ browser }) => {
  // The whole life of an event, from the request to the reviews.
  test.setTimeout(150_000);
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
  await client.getByRole("radio", { name: /Brand e lanci/ }).click();
  await client.getByRole("button", { name: "Scegli Brand e lanci" }).click();
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
  await client.getByLabel("Aggiungi file").setInputFiles(pdf("Planimetria sala è.pdf"));
  await expect(client.getByRole("link", { name: "Planimetria sala è.pdf" })).toBeVisible();
  await client.getByRole("button", { name: "Avanti" }).click();
  await client.getByLabel(new RegExp(`Alfa ${run}`)).check();
  await client.getByLabel(new RegExp(`Beta ${run}`)).check();
  await client.getByRole("button", { name: "Avanti" }).click();
  await client.getByRole("button", { name: "Invia a 2 agenzie" }).click();
  await expect(client).toHaveURL(/\/client\/richieste\/[0-9a-f-]+$/);
  const requestUrl = new URL(client.url()).pathname;

  // Both agencies read the brief and answer.
  await alfa.page.reload();
  await expect(alfa.page.getByRole("link", { name: "Notifiche, 1 non lette" })).toBeVisible();
  await answerRequest(alfa.page, title, ["1500", "3000"], "Preventivo Alfa.pdf");
  const brief = alfa.page.getByRole("link", { name: "Planimetria sala è.pdf" });
  expect((await alfa.page.request.get((await brief.getAttribute("href"))!)).status()).toBe(200);
  await answerRequest(beta.page, title, ["1200", "2500"]);
  await alfa.page.getByLabel("Messaggio").fill("Il parcheggio per i fornitori è disponibile?");
  await alfa.page.getByRole("button", { name: "Invia", exact: true }).click();
  await expect(alfa.page.getByText("Il parcheggio per i fornitori è disponibile?")).toBeVisible();

  // The client compares, asks Alfa for changes and sees the question.
  await client.goto(requestUrl);
  await expect(client.getByRole("heading", { name: "Confronto voce per voce" })).toBeVisible();
  await expect(client.getByRole("row", { name: new RegExp(`Beta ${run}.*più bassa`) })).toBeVisible();
  await expect(client.getByRole("link", { name: "Preventivo Alfa.pdf" })).toBeVisible();
  await client.goto("/notifiche");
  await expect(client.getByText(`Nuova proposta da Alfa ${run}`)).toBeVisible();
  await expect(client.getByText(`Nuovo messaggio da Alfa ${run}`)).toBeVisible();
  await client.goto(requestUrl);
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
  const proposalUrl = new URL(beta.page.url()).pathname;

  // Beta runs the event: picks its security supplier from the address book and tracks costs.
  await beta.page.goto("/pro/rubrica/importa");
  await beta.page.getByLabel("Contatti da incollare").fill("Vigilanza Rossi 333 4445566");
  await beta.page.getByRole("button", { name: "Riconosci contatti" }).click();
  await expect(beta.page.getByLabel("Servizio di Vigilanza Rossi")).toHaveValue("security");
  await beta.page.getByRole("button", { name: "Importa 1 contatto" }).click();
  await expect(beta.page.getByText("1 nuovo contatto")).toBeVisible();

  await beta.page.goto(proposalUrl);
  await beta.page.getByRole("link", { name: "Apri lo spazio evento" }).click();
  await expect(beta.page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(beta.page.getByText("0 di 2 confermati")).toBeVisible();
  const security = beta.page.getByRole("listitem", { name: "Sicurezza e steward" });
  await security.getByLabel("Fornitore Sicurezza e steward").selectOption({ label: "Vigilanza Rossi" });
  await expect(security.getByRole("link", { name: "WhatsApp a Vigilanza Rossi" })).toBeVisible();
  await security.getByLabel("Stato Sicurezza e steward").selectOption("confirmed");
  await security.getByLabel("Costo previsto Sicurezza e steward").fill("900");
  await security.getByLabel("Costo reale Sicurezza e steward").fill("950");
  await security.getByRole("button", { name: "Salva Sicurezza e steward" }).click();
  await expect(security.getByText("Sicurezza e steward salvato.")).toBeVisible();
  const catering = beta.page.getByRole("listitem", { name: "Catering e bar" });
  await catering.getByLabel("Stato Catering e bar").selectOption("confirmed");
  await catering.getByRole("button", { name: "Salva Catering e bar" }).click();
  await expect(catering.getByText("Scegli prima il fornitore")).toBeVisible();
  await catering.getByLabel("Stato Catering e bar").selectOption("to_book");
  await catering.getByLabel("Costo previsto Catering e bar").fill("1800");
  await catering.getByRole("button", { name: "Salva Catering e bar" }).click();
  await expect(catering.getByText("Catering e bar salvato.")).toBeVisible();

  // Sold 3700 (1200 + 2500), forecast cost 950 + 1800: margin 950.
  await beta.page.reload();
  await expect(beta.page.getByText("1 di 2 confermati")).toBeVisible();
  await expect(beta.page.getByRole("definition").filter({ hasText: "%" })).toHaveText(/^950,00\s€26%$/);
  await beta.page.getByRole("button", { name: "Passa in preparazione" }).click();
  await expect(beta.page.getByText("In preparazione", { exact: true })).toBeVisible();
  await beta.page.goto("/pro/eventi");
  // Upcoming events are printed as tickets with their number.
  const ticket = beta.page.getByRole("article", { name: new RegExp(`^${title}, biglietto #\\d{4}$`) });
  await expect(ticket).toContainText("In preparazione · fornitori 1/2 confermati");

  // Tasks: start from the suggested checklist, add one of our own and tick it off.
  await beta.page.getByRole("link", { name: title }).click();
  const tasks = beta.page.locator("section", { has: beta.page.getByRole("heading", { name: "Attività" }) });
  await tasks.getByRole("button", { name: "Aggiungi 8 attività suggerite" }).click();
  await expect(tasks.getByText("8 da fare")).toBeVisible();
  await expect(tasks.getByText("Comunicare alla sicurezza numero di addetti e turni")).toBeVisible();
  await expect(tasks.getByText("14 giorni prima dell'evento").first()).toBeVisible();
  await tasks.getByLabel("Nuova attività").fill("Chiamare il cliente per i badge");
  await tasks.getByLabel("Assegna a").selectOption({ label: "Titolare Beta" });
  await tasks.getByRole("button", { name: "Aggiungi", exact: true }).click();
  await expect(tasks.getByText("9 da fare")).toBeVisible();
  await expect(tasks.getByRole("region", { name: "Senza scadenza" })).toContainText("Chiamare il cliente per i badge");

  await beta.page.getByRole("link", { name: "Attività", exact: true }).click();
  await expect(beta.page.getByRole("heading", { level: 1, name: "Attività" })).toBeVisible();
  await beta.page.getByRole("button", { name: "Segna come fatta Chiamare il cliente per i badge" }).click();
  await expect(beta.page.getByRole("region", { name: "Fatte" })).toContainText("Chiamare il cliente per i badge");
  await beta.page.getByRole("link", { name: "Tutto il team" }).click();
  await expect(beta.page.getByRole("region", { name: "Più avanti" })).toContainText("Confermare il menu e le intolleranze");

  // Quote: Beta sends the detailed quote, the client asks for a change, then approves version 2.
  beta.page.on("dialog", (d) => d.accept());
  client.on("dialog", (d) => d.accept());
  await beta.page.goto("/pro/eventi");
  await beta.page.getByRole("link", { name: title }).click();
  await expect(beta.page).toHaveURL(/\/pro\/eventi\/[0-9a-f-]+$/);
  const eventUrl = new URL(beta.page.url()).pathname;
  const quote = beta.page.locator("section", { has: beta.page.getByRole("heading", { name: "Preventivo per il cliente" }) });
  await quote.getByRole("button", { name: "Prepara il preventivo" }).click();
  await expect(quote.getByLabel("Importo voce 1")).toHaveValue("1200");
  await quote.getByLabel("Importo voce 2").fill("2700");
  await quote.getByRole("button", { name: "Invia al cliente per l'approvazione" }).click();
  await expect(quote.getByRole("region", { name: "Versione 1" })).toContainText("Da approvare");

  await client.goto("/notifiche");
  await client.getByRole("link", { name: `Preventivo da approvare da Beta ${run}` }).click();
  await expect(client.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await client.getByRole("button", { name: "Chiedi modifiche" }).click();
  await client.getByLabel("Cosa vuoi cambiare?").fill("Potete fare uno sconto sulla sicurezza?");
  await client.getByRole("button", { name: "Invia richiesta di modifica" }).click();
  await expect(client.getByText("Hai chiesto modifiche")).toBeVisible();

  await beta.page.reload();
  await expect(quote.getByText("Potete fare uno sconto sulla sicurezza?")).toBeVisible();
  await quote.getByRole("button", { name: "Nuova versione" }).click();
  await expect(quote.getByLabel("Importo voce 2")).toHaveValue("2700");
  await quote.getByLabel("Importo voce 1").fill("1100");
  await quote.getByRole("button", { name: "Invia al cliente per l'approvazione" }).click();
  await expect(quote.getByRole("region", { name: "Versione 2" })).toContainText("Da approvare");

  await client.goto("/client/eventi");
  await expect(client.getByRole("article", { name: new RegExp(`^${title}, biglietto`) })).toContainText("preventivo: da approvare");
  await client.getByRole("link", { name: title }).click();
  await expect(client.getByRole("region", { name: "Versione 2" })).toContainText(/3\.800,00/);
  await client.getByRole("button", { name: "Approva il preventivo" }).click();
  await expect(client.getByText("Preventivo approvato.")).toBeVisible();

  // Beta's budget now follows the approved quote: sold 3800, forecast cost 2750, margin 1050.
  await beta.page.goto(eventUrl);
  await expect(beta.page.getByText("Venduto secondo il preventivo approvato (versione 2)", { exact: false })).toBeVisible();
  await expect(beta.page.getByRole("definition").filter({ hasText: "%" })).toHaveText(/^1\.050,00\s€28%$/);

  // Run of show: the usual evening around doors opening, one moment of our own, who has to arrive.
  await beta.page.getByRole("link", { name: "Prepara la scaletta" }).click();
  await expect(beta.page.getByRole("heading", { level: 1, name: "Scaletta e arrivi" })).toBeVisible();
  await beta.page.getByLabel("Apertura porte").fill("19:00");
  await beta.page.getByRole("button", { name: "Crea la scaletta tipo" }).click();
  await expect(beta.page.getByText("6 momenti")).toBeVisible();
  await expect(beta.page.getByRole("listitem", { name: "18:00 Arrivo sicurezza e controllo vie di fuga" })).toContainText("Vigilanza Rossi");
  const newItem = beta.page.getByRole("form", { name: "Nuovo momento" });
  await newItem.getByLabel("Inizio").fill("21:00");
  await newItem.getByLabel("Cosa succede").fill("Discorso dell'amministratore delegato");
  await newItem.getByLabel("Dove").fill("Palco");
  await newItem.getByRole("button", { name: "Aggiungi alla scaletta" }).click();
  await expect(beta.page.getByText("7 momenti")).toBeVisible();
  await expect(beta.page.getByRole("listitem", { name: "21:00 Discorso dell'amministratore delegato" })).toContainText("Palco");

  await beta.page.getByRole("button", { name: "Aggiungi 1 fornitore" }).click();
  await expect(beta.page.getByRole("listitem", { name: "Vigilanza Rossi" })).toContainText("Atteso alle 18:00");
  const newCrew = beta.page.getByRole("form", { name: "Nuovo arrivo" });
  await newCrew.getByLabel("Chi").selectOption("external");
  await newCrew.getByLabel("Nome").fill("Sara Bianchi");
  await newCrew.getByLabel("Telefono").fill("333 1234567");
  await newCrew.getByLabel("Ruolo").fill("Hostess");
  await newCrew.getByLabel("Orario di arrivo").fill("18:30");
  await newCrew.getByRole("button", { name: "Aggiungi agli arrivi" }).click();
  await expect(beta.page.getByText("0 di 2 arrivati")).toBeVisible();
  await expect(beta.page.getByRole("link", { name: "WhatsApp a Sara Bianchi" })).toHaveAttribute("href", "https://wa.me/393331234567");

  // Sara gets her pass on WhatsApp and opens it without an account: the QR to show at the entrance.
  const sendPass = beta.page.getByRole("link", { name: "Invia il pass a Sara Bianchi su WhatsApp" });
  await expect(sendPass).toHaveAttribute("href", /^https:\/\/wa\.me\/393331234567\?text=.*%2Fpass%2F[0-9a-f]{32}$/);
  const passLink = await beta.page.getByRole("link", { name: "Apri il pass di Sara Bianchi" }).getAttribute("href");
  const guest = await browser.newPage();
  await guest.goto(passLink!);
  const pass = guest.getByRole("article", { name: "Pass di Sara Bianchi" });
  await expect(pass).toContainText("Hostess");
  await expect(pass).toContainText("18:30");
  await expect(pass.getByRole("img", { name: "Codice QR del pass" }).locator("svg")).toBeVisible();
  await expect(pass).toContainText(passLink!.slice(-32, -26).toUpperCase());
  await guest.goto(passLink!.replace(/[0-9a-f]{32}$/, "0".repeat(32)));
  await expect(guest.getByRole("heading", { name: "Pass non trovato" })).toBeVisible();
  await guest.close();

  // Public area: Beta opens the event to the public with 3 places; anyone registers without an account.
  await beta.page.goto(eventUrl);
  const publicPage = beta.page.locator("section", { has: beta.page.getByRole("heading", { name: "Pagina pubblica" }) });
  await publicPage.getByLabel("Aperto al pubblico").check();
  await publicPage.getByLabel("Cosa succede").fill("Una serata di musica nel cortile.");
  await publicPage.getByLabel("Apertura").fill("19:00");
  await publicPage.getByLabel("Posti", { exact: true }).fill("3");
  await publicPage.getByRole("button", { name: "Salva pagina pubblica" }).click();
  await expect(publicPage.getByText("Pagina pubblica salvata.")).toBeVisible();

  const visitor = await browser.newPage();
  await visitor.goto("/eventi");
  await visitor.getByRole("link", { name: title }).click();
  await expect(visitor.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(visitor.getByText("Una serata di musica nel cortile.")).toBeVisible();
  await expect(visitor.getByText("Ultimi 3 posti")).toBeVisible();
  await visitor.getByLabel("Nome e cognome").fill("Giulia Rossi");
  await visitor.getByRole("textbox", { name: /^Email/ }).fill("giulia.rossi@example.test");
  await visitor.getByRole("button", { name: "Una persona in più" }).click();
  await visitor.getByRole("button", { name: "Conferma iscrizione" }).click();
  await expect(visitor.getByText("Controlla i campi evidenziati.")).toBeVisible();
  await expect(visitor.getByLabel("Nome e cognome")).toHaveValue("Giulia Rossi");
  await visitor.getByLabel("Accetto che chi organizza").check();
  await visitor.getByRole("button", { name: "Conferma iscrizione" }).click();
  await expect(visitor).toHaveURL(/\/biglietto\/[0-9a-f]{32}/);
  const publicTicket = visitor.getByRole("article", { name: `Biglietto per ${title}, a nome di Giulia Rossi` });
  await expect(publicTicket).toContainText("2 persone");
  await expect(publicTicket).toContainText("19:00");
  await expect(publicTicket.getByRole("img", { name: /^iscritto il/ })).toBeVisible();
  await expect(publicTicket.getByRole("img", { name: "Codice QR del biglietto" }).locator("svg")).toBeVisible();
  await visitor.getByRole("link", { name: "Biglietti" }).first().click();
  await expect(visitor.getByRole("link", { name: title })).toBeVisible();
  await visitor.getByRole("link", { name: title }).click();
  await visitor.getByText("Non puoi più venire?").click();
  await visitor.getByRole("button", { name: "Annulla l'iscrizione" }).click();
  await expect(visitor.getByText("Iscrizione annullata. Il posto è di nuovo libero.")).toBeVisible();
  await visitor.close();

  // On the day, from a phone at 18:20: the briefing is on, security is late. Check-ins work offline.
  const runOfShow = new URL(beta.page.url()).pathname;
  const phone = await beta.page.context().newPage();
  await phone.clock.setFixedTime(new Date("2027-06-15T16:20:00Z"));
  await phone.goto(runOfShow.replace(/scaletta$/, "live"));
  const now = phone.getByRole("region", { name: "Adesso" });
  await expect(now).toContainText("Briefing con tutto lo staff");
  await expect(now).toContainText("Dopo: 19:00 Apertura porte e accoglienza ospiti");
  const arrivals = phone.getByRole("region", { name: "Arrivi" });
  await expect(arrivals.getByRole("listitem", { name: "Vigilanza Rossi" })).toContainText("In ritardo");
  await expect(arrivals.getByRole("listitem", { name: "Sara Bianchi" })).toContainText("Atteso alle 18:30");
  // A second visit lets the device keep a copy of the page.
  await phone.evaluate(() => navigator.serviceWorker.ready);
  await phone.reload();
  await expect(now).toContainText("Briefing con tutto lo staff");

  await phone.context().setOffline(true);
  await expect(phone.getByText("Sei offline")).toBeVisible();
  await arrivals.getByRole("button", { name: "Check-in Vigilanza Rossi" }).click();
  await expect(arrivals.getByRole("listitem", { name: "Vigilanza Rossi" })).toContainText("Arrivato alle 18:20");
  await expect(phone.getByText("1 check-in da inviare")).toBeVisible();
  await phone.reload();
  await expect(arrivals.getByRole("listitem", { name: "Vigilanza Rossi" })).toContainText("Da inviare");

  await phone.context().setOffline(false);
  await expect(phone.getByText("1 check-in da inviare")).toBeHidden();
  await expect(arrivals).toContainText("1 di 2 arrivati");
  await expect(arrivals.getByRole("listitem", { name: "Vigilanza Rossi" })).not.toContainText("Da inviare");

  await beta.page.reload();
  await expect(beta.page.getByText("1 di 2 arrivati")).toBeVisible();
  await beta.page.getByRole("button", { name: "Annulla check-in di Vigilanza Rossi" }).click();
  await expect(beta.page.getByText("0 di 2 arrivati")).toBeVisible();

  // Supplier accounts: Beta asks its caterer, then invites them to I-Events from the address book.
  await beta.page.goto("/pro/rubrica/importa");
  await beta.page.getByLabel("Contatti da incollare").fill("Gusto Catering 333 7778899");
  await beta.page.getByRole("button", { name: "Riconosci contatti" }).click();
  await beta.page.getByLabel("Servizio di Gusto Catering").selectOption("catering");
  await beta.page.getByRole("button", { name: "Importa 1 contatto" }).click();
  await expect(beta.page.getByText("1 nuovo contatto")).toBeVisible();
  await beta.page.goto(eventUrl);
  const cateringRow = beta.page.getByRole("listitem", { name: "Catering e bar" });
  await cateringRow.getByLabel("Fornitore Catering e bar").selectOption({ label: "Gusto Catering" });
  await cateringRow.getByLabel("Dettaglio Catering e bar").fill("Buffet per 120 persone");
  await cateringRow.getByLabel("Stato Catering e bar").selectOption("requested");
  await cateringRow.getByRole("button", { name: "Salva Catering e bar" }).click();
  await expect(cateringRow.getByText("Catering e bar salvato.")).toBeVisible();
  await expect(cateringRow).toContainText("Gusto Catering non è ancora su I-Events");
  await cateringRow.getByRole("link", { name: "Invitalo" }).click();
  await beta.page.getByRole("button", { name: "Invita su I-Events" }).click();
  await expect(beta.page.getByRole("link", { name: "Manda l'invito su WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/393337778899\?text=/);
  const supplierInvite = new URL((await beta.page.locator("code").textContent())!).pathname;

  // The caterer signs up from the link as a supplier, claims the contact and finds the request waiting.
  const caterer = await (await browser.newContext()).newPage();
  await caterer.goto(supplierInvite);
  await caterer.getByRole("link", { name: "Accedi o registrati" }).click();
  await signUp(caterer, "Marta Gusto", `gusto-${run}@example.test`);
  await expect(caterer.getByText(`Beta ${run}`)).toBeVisible();
  await caterer.getByRole("link", { name: "Crea l'account fornitore" }).click();
  await expect(caterer.getByRole("radio", { name: /Fornitore/ })).toBeChecked();
  await caterer.getByLabel("Nome", { exact: true }).fill(`Gusto Srl ${run}`);
  await caterer.getByRole("button", { name: "Crea account" }).click();
  await expect(caterer).toHaveURL(/\/invito\//);
  await caterer.getByRole("button", { name: "Accetta" }).click();
  await expect(caterer).toHaveURL(/\/supplier\/richieste$/);
  await expect(caterer.getByText("1 richiesta aspetta la tua risposta.")).toBeVisible();
  await caterer.getByRole("link", { name: title }).click();
  await expect(caterer.getByText("Buffet per 120 persone")).toBeVisible();
  await expect(caterer.getByText("Margine")).toBeHidden();
  await caterer.getByRole("radio", { name: "Sì, sono disponibile" }).check();
  await caterer.getByLabel("Il tuo prezzo €").fill("1700");
  await caterer.getByLabel("Messaggio per l'agenzia").fill("Bevande incluse");
  await caterer.getByRole("button", { name: "Invia risposta" }).click();
  await expect(caterer.getByText("Risposta inviata all'agenzia.")).toBeVisible();

  // Beta sees the answer on the event and confirms; the caterer gets its schedule.
  await beta.page.goto("/notifiche");
  await beta.page.getByRole("link", { name: `Gusto Srl ${run} è disponibile` }).click();
  await expect(cateringRow.getByRole("note")).toHaveText(`Gusto Catering è disponibile a 1.700,00 €: “Bevande incluse”`);
  await cateringRow.getByLabel("Stato Catering e bar").selectOption("confirmed");
  await cateringRow.getByRole("button", { name: "Salva Catering e bar" }).click();
  await expect(cateringRow.getByText("Catering e bar salvato.")).toBeVisible();

  await caterer.goto("/notifiche");
  await caterer.getByRole("link", { name: `Beta ${run} ti ha confermato` }).click();
  const times = caterer.locator("section", { has: caterer.getByRole("heading", { name: "I tuoi orari" }) });
  await expect(times).toContainText("16:30–18:00Arrivo catering e allestimento buffet");
  await expect(times).toContainText("19:30–21:30Servizio catering");
  await expect(times).not.toContainText("Discorso");

  // The event ends: Beta reviews the caterer, the client reviews Beta, and Beta answers.
  await beta.page.goto(eventUrl);
  await beta.page.getByRole("button", { name: "Evento in corso" }).click();
  await beta.page.getByRole("button", { name: "Segna come concluso" }).click();
  const supplierReview = beta.page.getByRole("form", { name: "Recensione per Gusto Catering" });
  await supplierReview.getByRole("radio", { name: /^5 stelle/ }).check();
  await supplierReview.getByLabel("Racconta com'è andata").fill("Buffet impeccabile, puntuali.");
  await supplierReview.getByRole("button", { name: "Pubblica la recensione" }).click();
  await expect(supplierReview.getByText("Grazie, recensione pubblicata.")).toBeVisible();
  await caterer.goto("/supplier");
  await expect(caterer.locator("#recensioni")).toContainText("Buffet impeccabile, puntuali.");
  await expect(caterer.locator("#recensioni")).toContainText(`Beta ${run}`);

  await client.goto("/notifiche");
  await client.getByRole("link", { name: `Com'è andato ${title}?` }).click();
  const agencyReview = client.getByRole("form", { name: `Recensione per Beta ${run}` });
  await agencyReview.getByRole("radio", { name: /^4 stelle/ }).check();
  await agencyReview.getByLabel("Racconta com'è andata").fill("Organizzazione precisa.");
  await agencyReview.getByRole("button", { name: "Pubblica la recensione" }).click();
  await expect(agencyReview.getByText("Grazie, recensione pubblicata.")).toBeVisible();

  await beta.page.goto("/pro/profilo");
  const received = beta.page.locator("#recensioni");
  await expect(received).toContainText("4,0 · 1 recensione");
  await expect(received).toContainText("Organizzazione precisa.");
  await received.getByRole("button", { name: "Rispondi" }).click();
  await received.getByLabel("La tua risposta").fill("Grazie, alla prossima!");
  await received.getByRole("button", { name: "Pubblica" }).click();
  await expect(received.getByText("Grazie, alla prossima!")).toBeVisible();
  await client.reload();
  await expect(client.getByText("Grazie, alla prossima!")).toBeVisible();
});
