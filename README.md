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
- `GET /api/cron/notifications` invia a ogni persona un riepilogo email delle notifiche non lette, tramite Resend. Va chiamato dallo scheduler con `Authorization: Bearer $CRON_SECRET` (su Vercel lo fa `apps/web/vercel.json` ogni 10 minuti; i cron così frequenti richiedono il piano Pro). Servono `SUPABASE_SECRET_KEY`, `CRON_SECRET`, `RESEND_API_KEY` ed `EMAIL_FROM`; senza Resend le notifiche restano solo nell'app.

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

Gli stati cambiano solo tramite le funzioni `submit_request`, `submit_proposal`, `request_revision`, `accept_proposal` e `set_proposal_status`.
