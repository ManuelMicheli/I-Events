# I-Events

Piattaforma web e mobile che collega agenzie di eventi (PRO), aziende (CLIENT), fornitori (SUPPLIER) e pubblico (PUBBLICO).
Il piano di prodotto completo è nel documento di progetto su Claude.

## Struttura

| Percorso | Contenuto |
| --- | --- |
| `apps/web` | Next.js: aree PRO, CLIENT, SUPPLIER e pagine pubbliche |
| `apps/mobile` | Expo (iOS e Android) |
| `packages/core` | Regole condivise: catalogo servizi, validazione richieste, stati, permessi, piani |
| `supabase/migrations` | Schema del database, permessi (RLS) e funzioni che cambiano gli stati |
| `supabase/seed` | Catalogo servizi (generato da `packages/core`) |
| `supabase/tests` | Test SQL dello schema e dei permessi |

## Sviluppo

```bash
pnpm install
pnpm test          # test di packages/core
pnpm db:test       # test del database su un Postgres locale (DATABASE_URL)
npx supabase start # stack Supabase locale (Docker)
pnpm dev
```

Dopo aver cambiato il catalogo servizi in `packages/core/src/services.ts`:

```bash
pnpm --filter @i-events/core catalog:sql
```

## Flusso principale

1. Il Client compila una richiesta (evento singolo o campagna) e la invia a una o più agenzie.
2. Ogni agenzia riceve il brief e risponde con una proposta.
3. Il Client confronta le proposte e ne accetta una: la richiesta passa ad "awarded", le altre proposte vengono rifiutate e nascono gli eventi (uno per tappa nelle campagne).

Gli stati cambiano solo tramite le funzioni `submit_request`, `submit_proposal`, `request_revision`, `accept_proposal` e `set_proposal_status`.
