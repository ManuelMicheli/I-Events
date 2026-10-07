# I-Events

Piattaforma web e mobile che collega agenzie di eventi (PRO), aziende (CLIENT), fornitori (SUPPLIER) e pubblico (PUBBLICO).
Il piano di prodotto completo è nel documento di progetto su Claude.

## Struttura

| Percorso | Contenuto |
| --- | --- |
| `apps/web` | Next.js: aree PRO, CLIENT, SUPPLIER e pagine pubbliche |
| `apps/mobile` | Expo (iOS e Android), in arrivo |
| `packages/db` | Tipi TypeScript generati dallo schema del database |
| `packages/core` | Regole condivise: catalogo servizi, validazione richieste, stati, permessi, piani |
| `supabase/migrations` | Schema del database, permessi (RLS) e funzioni che cambiano gli stati |
| `supabase/seed` | Catalogo servizi (generato da `packages/core`) |
| `supabase/tests` | Test SQL dello schema e dei permessi |

## Sviluppo

```bash
pnpm install
npx supabase@2.119.0 start                              # stack Supabase locale (Docker)
cp apps/web/.env.example apps/web/.env.local    # inserisci API_URL e PUBLISHABLE_KEY stampati da supabase start
pnpm dev                                        # http://localhost:3000

pnpm test                                       # test di packages/core
pnpm db:test                                    # test del database su un Postgres locale (DATABASE_URL)
pnpm --filter @i-events/web test:e2e            # test end-to-end (app avviata + Supabase locale)
```

Dopo una nuova migrazione: `npx supabase@2.119.0 db reset` e `pnpm --filter @i-events/db gen:types`.

Dopo aver cambiato il catalogo servizi in `packages/core/src/services.ts`:

```bash
pnpm --filter @i-events/core catalog:sql
```

## Flusso principale

1. Il Client compila una richiesta (evento singolo o campagna) e la invia a una o più agenzie.
2. Ogni agenzia riceve il brief e risponde con una proposta.
3. Il Client confronta le proposte e ne accetta una: la richiesta passa ad "awarded", le altre proposte vengono rifiutate e nascono gli eventi (uno per tappa nelle campagne).

## Allegati e notifiche

- Gli allegati stanno nel bucket privato `attachments` di Supabase Storage. Ogni file ha una riga in `request_attachments` e Storage concede lettura, caricamento e rimozione solo a chi può farlo su quella riga.
- Le notifiche nascono da trigger nel database (nuova richiesta, proposta, modifiche, decisione, messaggi) e si vedono in `/notifiche`.
- `GET /api/cron/notifications` invia a ogni persona un riepilogo email delle notifiche non lette, tramite Resend. Va chiamato dallo scheduler con `Authorization: Bearer $CRON_SECRET` (sul piano Hobby di Vercel `apps/web/vercel.json` lo chiama una volta al giorno alle 7:00 UTC, l'unica frequenza ammessa; le chiamate frequenti a questa route e a `/api/cron/push` partono da Supabase con `pg_cron` e `pg_net`, con il `CRON_SECRET` nel Vault del database). Servono `SUPABASE_SECRET_KEY`, `CRON_SECRET`, `RESEND_API_KEY` ed `EMAIL_FROM`; senza Resend le notifiche restano solo nell'app.

## Rubrica e import contatti

- Ogni agenzia ha una rubrica privata di fornitori (`contacts`) in `/pro/rubrica`, con chiamata, WhatsApp ed email a un tocco.
- L'import accetta CSV (anche export di Excel italiano con `;` e di Google Contacts), Excel `.xlsx`, vCard `.vcf` e testo incollato. Le colonne vengono riconosciute in automatico, i doppioni nel file vengono uniti e a ogni contatto viene proposto un servizio del catalogo.
- `import_contacts` unisce con i contatti già presenti per email o telefono: completa i campi vuoti e aggiunge servizi, non sovrascrive mai.
- La proposta dei servizi passa da `getServiceClassifier()` in `apps/web/src/lib/service-classifier.ts`. Con `TYPESAFE_API_KEY` impostata usa Jev (TypeSafe AI): ogni contatto diventa una domanda a scelta sulle categorie del catalogo, fino a 32 contatti per richiesta. Se Jev risponde con un errore, non è sicuro o supera il tempo massimo (12 secondi per tutto l'import), per quel contatto restano le regole per parole chiave, che sono anche l'unico metodo senza chiave. Facoltativi: `TYPESAFE_MODEL` (predefinito `jev-latest`) e `TYPESAFE_BASE_URL`.

## Spazio di lavoro dell'evento

- Quando il cliente accetta una proposta, ogni evento creato parte con una prenotazione per ciascun servizio richiesto nel brief (`event_bookings`). L'agenzia ne può aggiungere o togliere.
- Per ogni servizio l'agenzia sceglie un fornitore dalla rubrica, segue lo stato (da prenotare, richiesto, confermato, annullato) e segna costo previsto e reale. Un servizio si può confermare solo dopo aver scelto il fornitore.
- `/pro/eventi/[id]` mostra il budget: venduto al cliente (le voci della proposta accettata, solo per eventi singoli), costi e margine stimato. Fornitori e costi restano interni all'agenzia: il cliente non li vede.

## Attività e timeline

- Ogni evento ha le sue attività (`event_tasks`) con scadenza, persona assegnata e, se serve, il servizio a cui si riferiscono. Chi riceve un'attività da un collega riceve una notifica.
- Da un evento senza attività si può partire dalla checklist tipica dei suoi servizi (`suggestedTasks` in `packages/core/src/tasks.ts`), con le scadenze calcolate sulla data dell'evento.
- Le attività sono raggruppate come una timeline: in ritardo, oggi, prossimi 7 giorni, più avanti, senza scadenza, fatte. `/pro/attivita` mostra le proprie attività su tutti gli eventi, o quelle di tutto il team. Chi e quando ha completato un'attività lo registra il database.

## Preventivo dell'evento

- Dopo l'assegnazione l'agenzia prepara per ogni evento il preventivo dettagliato (`event_quotes`): parte dalla proposta accettata, o dai servizi dell'evento per le tappe di una campagna, e lo invia al cliente con `send_event_quote`. Ogni invio è una nuova versione e sostituisce quelle ancora aperte; una versione inviata non si modifica più.
- Il cliente lo vede in `/client/eventi/[id]`. Solo titolare, amministratore e approvatore spesa lo approvano o chiedono modifiche con `decide_event_quote`; gli altri vedono che è in attesa. Ogni passaggio arriva come notifica alla controparte.
- L'ultimo preventivo approvato diventa il venduto del budget dell'evento, al posto della proposta.

Gli stati cambiano solo tramite le funzioni `submit_request`, `submit_proposal`, `request_revision`, `accept_proposal` e `set_proposal_status`.

## Scaletta e giorno dell'evento

- `/pro/eventi/[id]/scaletta`: la scaletta minuto per minuto (`event_schedule_items`), con luogo, fornitore e referente di ogni momento. Si può partire dalla scaletta tipo per i servizi dell'evento (`suggestedSchedule` in `packages/core/src/run-of-show.ts`), calcolata sull'orario di apertura porte.
- Nella stessa pagina l'elenco di chi deve arrivare (`event_crew`): fornitori prenotati, colleghi e persone esterne, ognuno con l'orario di arrivo. I fornitori si aggiungono in un clic, con l'orario preso dalla scaletta.
- `/pro/eventi/[id]/live` è la vista da telefono del giorno dell'evento: cosa succede adesso e dopo, chi è arrivato e chi è in ritardo, check-in con un tocco. Funziona anche offline: i check-in restano in coda sul dispositivo e partono quando torna la rete, conservando l'orario di arrivo reale (il database lo accetta solo nel passato e al massimo di due giorni). Un service worker (`public/sw.js`) tiene una copia della pagina; l'uscita dall'account la cancella.

## Account dei fornitori

- Dalla scheda di un contatto in rubrica l'agenzia crea un link d'invito (`invite_supplier`) da mandare su WhatsApp o per email. Il fornitore crea il suo account fornitore e rivendica il contatto (`accept_supplier_invitation`): da lì `contacts.supplier_org_id` collega i due.
- Le prenotazioni richieste o confermate a quel contatto arrivano in `/supplier/richieste`, con notifica. Il fornitore legge solo quello che gli serve tramite `supplier_bookings` e `supplier_booking_schedule`, mai la tabella: costi, note interne e cliente restano dell'agenzia.
- Il fornitore risponde con `respond_to_booking`: disponibile, con prezzo e messaggio, oppure no. L'agenzia vede la risposta sulla riga del servizio e il prezzo diventa il costo previsto se non ne aveva uno. Una volta confermato, il fornitore vede l'orario di arrivo e i suoi momenti della scaletta.

## Marketplace

- Agenzie e fornitori con il profilo visibile compaiono nella ricerca (`search_marketplace`): per parole, servizio e zona (città o regioni coperte). Le aziende cercano agenzie in `/client/agenzie`, le agenzie cercano fornitori in `/pro/fornitori`.
- Dal profilo di un'agenzia l'azienda apre una nuova richiesta con quell'agenzia già scelta. Dal profilo di un fornitore l'agenzia lo aggiunge alla rubrica (`add_marketplace_supplier`), già collegato al suo account: un contatto con la stessa email o lo stesso telefono viene collegato invece di essere duplicato.
- Il profilo può mostrare email e telefono pubblici, e su ogni scheda compaiono da quando è su I-Events e quanti eventi ha concluso.


## Portfolio, recensioni e disponibilità

- Agenzie e fornitori raccolgono nel portfolio i lavori passati con le foto (al massimo 30 lavori e 12 foto ciascuno). Le foto stanno nel bucket pubblico `portfolio`, ma si caricano solo al percorso di una riga di `portfolio_photos` creata da un titolare o amministratore.
- Quando un evento è concluso l'azienda recensisce l'agenzia e l'agenzia i fornitori su I-Events che aveva confermato (`leave_review`); chi è recensito risponde dal proprio profilo (`reply_to_review`). Sul profilo pubblico compaiono media, recensioni e nome dell'organizzazione che le ha scritte, mai l'evento.
- Il fornitore segna i giorni in cui non è disponibile in `/supplier/disponibilita`; i giorni degli eventi confermati si aggiungono da soli. Le agenzie vedono solo che è impegnato (`supplier_busy_days`), possono cercare fornitori liberi in una data e, nello spazio evento, vedono chi tra i fornitori in rubrica è già impegnato in quelle date (`event_busy_contacts`).
