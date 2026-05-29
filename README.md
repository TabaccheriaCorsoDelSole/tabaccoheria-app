# Tabaccheria Bibione — Gestionale Web

## Come pubblicare su Vercel (10 minuti)

### Cosa ti serve
- Un account **GitHub** gratuito → https://github.com
- Un account **Vercel** gratuito → https://vercel.com (puoi accedere con GitHub)

---

### Passo 1 — Carica il progetto su GitHub

1. Vai su https://github.com e accedi
2. Clicca il **+** in alto a destra → **New repository**
3. Nome: `tabaccheria-app` → clicca **Create repository**
4. Nella pagina del repository vuoto, clicca **uploading an existing file**
5. Trascina TUTTA la cartella `tabaccheria-app` oppure carica i file uno per uno:
   - `package.json`
   - `public/index.html`
   - `src/index.js`
   - `src/App.js`
   - `src/RicevimentoMerce.jsx`
6. Clicca **Commit changes**

---

### Passo 2 — Pubblica su Vercel

1. Vai su https://vercel.com e accedi con GitHub
2. Clicca **Add New → Project**
3. Seleziona il repository `tabaccheria-app`
4. Vercel rileva automaticamente che è un progetto React
5. Clicca **Deploy** — attendi 2-3 minuti
6. Vercel ti dà un URL tipo: `tabaccheria-app.vercel.app`

---

### Passo 3 — Usa l'app

- Apri l'URL dal **computer in negozio** → aggiungilo ai preferiti
- Apri l'URL dal **telefono** → in Safari/Chrome clicca "Aggiungi a schermata Home" per usarla come app

---

### Aggiornamenti futuri

Ogni volta che vuoi aggiornare l'app:
1. Modifica i file su GitHub
2. Vercel ridistribuisce automaticamente in 2-3 minuti

---

## Struttura del progetto

```
tabaccheria-app/
├── public/
│   └── index.html          # Pagina HTML base
├── src/
│   ├── index.js            # Entry point React
│   ├── App.js              # Navigazione principale
│   └── RicevimentoMerce.jsx # Modulo ricevimento Logista
└── package.json            # Dipendenze
```

## Moduli attivi

- ✅ **Ricevimento Logista** — carica PDF, scansiona stecche, catalogo barcode automatico
- 🔜 Magazzino
- 🔜 Ordine settimanale automatico
- 🔜 Statistiche e AGGI
