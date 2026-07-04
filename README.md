# Tabaccheria Bibione — Gestionale Web v2.0
### Con login utenti e database Supabase

---

## PASSO 1 — Configura il database Supabase (5 minuti, una volta sola)

1. Vai su **supabase.com** → apri il tuo progetto `tabaccheria`
2. Nel menu a sinistra clicca **SQL Editor**
3. Clicca **New query**
4. Apri il file `supabase_schema.sql` (in questa cartella), copia TUTTO il contenuto
5. Incollalo nell'editor SQL e clicca **Run** (o Ctrl+Invio)
6. Deve apparire "Success. No rows returned"

## PASSO 2 — Crea gli utenti

1. Nel menu Supabase clicca **Authentication** → **Users**
2. Clicca **Add user** → **Create new user**
3. Crea il TUO account (titolare):
   - Email: la tua email
   - Password: scegli una password sicura
   - ✅ Auto Confirm User
4. Dopo averlo creato, vai su **Table Editor** → tabella `profili`
5. Trova la riga del tuo utente → clicca per modificare → campo `ruolo` → scrivi `titolare` → salva
6. Ripeti il passo 3 per ogni dipendente (il loro ruolo resta `dipendente`)

## PASSO 3 — Aggiorna i file su GitHub

1. Vai sul tuo repository `tabaccheria-app` su GitHub
2. Add file → Upload files
3. Carica TUTTI i file di questa cartella (sostituiscono i vecchi):
   - `package.json`
   - tutta la cartella `src/`
4. Commit changes
5. Vercel ridistribuisce automaticamente in 2-3 minuti

## PASSO 4 — Accedi

Apri l'URL Vercel → appare la schermata di login → entra con email e password.

---

## Cosa cambia con la v2.0

| Funzione | Prima | Ora |
|---|---|---|
| Accesso | Chiunque con il link | Solo utenti registrati |
| Barcode | Salvati nel browser | Database cloud, condivisi tra tutti |
| Storico ordini | Solo sul tuo browser | Visibile a tutti gli utenti |
| Sessione attiva | Per browser | Condivisa (una sola per il negozio) |
| Eliminare ordini | Chiunque | Solo il titolare |
| Ruoli | Nessuno | Titolare / Dipendente |

## File del progetto

```
src/
├── App.js               # Navigazione + gestione auth
├── Login.jsx            # Schermata di accesso
├── supabaseClient.js    # Connessione database
├── RicevimentoMerce.jsx # Modulo ricevimento (con PDF.js)
├── StoricoOrdini.jsx    # Storico ordini
├── CatalogoBarcode.jsx  # Gestione barcode
├── logistaParsers.js    # Motore lettura PDF Logista
├── catalogoADM.js       # Catalogo prodotti ADM
└── index.js
supabase_schema.sql      # Schema database (da eseguire in Supabase)
```
