# Tabaccheria Bibione — Gestionale v3.0

## Novità v3
- Catalogo ADM completo: 4.208 prodotti (tutte le 7 categorie)
- Barcode con unità (stecca/pacchetto) e peso in kg per trinciati
- Alert discrepanze alla chiusura sessione + testo reclamo pronto per Logista
- Foto della bolla di consegna e foto per le discrepanze
- Ricerca rapida prodotti durante la scansione
- Storico prezzi ADM (traccia gli aumenti)
- Struttura multi-fornitore
- Backup con un clic (JSON + CSV)
- Log modifiche barcode (chi, cosa, quando)

## AGGIORNAMENTO — 2 passi

### Passo 1 — Database (una volta sola)
1. supabase.com → progetto → **SQL Editor** → New query
2. Apri `aggiornamento_v3.sql` con TextEdit/Blocco note
3. Copia TUTTO (Cmd+A / Ctrl+A) → incolla nell'editor → **Run**
4. Attendi ~10 secondi → "Success"

⚠️ Il file è grande (330 KB) — se l'editor si blocca, incolla e lancia
   una sezione per volta (ogni blocco separato da commenti).

I barcode già salvati NON vengono toccati.

### Passo 2 — GitHub
1. Repository `tabaccheria-app` → Add file → Upload files
2. Carica: `package.json` + cartella `src/` completa
3. Commit → Vercel aggiorna da solo in 2-3 minuti

## File
```
src/
├── App.js                # Navigazione + auth
├── Login.jsx             # Accesso
├── supabaseClient.js     # Database + foto + backup + log
├── RicevimentoMerce.jsx  # Ricevimento con ricerca, foto, alert
├── StoricoOrdini.jsx     # Storico con foto e note
├── CatalogoBarcode.jsx   # Barcode raggruppati + unità + log
├── logistaParsers.js     # Motore lettura PDF
└── index.js
aggiornamento_v3.sql      # Migrazione database (catalogo ADM incluso)
```
