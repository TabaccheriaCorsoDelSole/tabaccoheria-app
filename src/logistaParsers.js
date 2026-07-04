// ── Motore di lettura ordini Logista ─────────────────────────────────────────
// Supporta:
//   - PDF multipagina (tramite PDF.js)
//   - Testo copiato dal PDF
//   - Validazione somma Kgc vs totale dichiarato
//   - Estrazione intestazione (numero ordine, data, rivendita, titolare)
//   - Normalizzazione descrizioni con catalogo ADM

import { PRODOTTO_BY_AAMS } from './catalogoADM';

const KGC_PER_STECCA = 0.200;
const PACKS_PER_STECCA = 10;

// ── Parser riga prodotto ──────────────────────────────────────────────────────
// Formato Logista: "  1  630  DIANA BLU KS*AST20  0,600"
const ROW_RE = /^\s*(\d{1,3})\s+(\d+)\s+(.+?)\s+([\d][,.][\d]{3})\s*$/;

function parseRiga(line) {
  const m = line.match(ROW_RE);
  if (!m) return null;
  const kgc = parseFloat(m[4].replace(',', '.'));
  const stecche = Math.round(kgc / KGC_PER_STECCA);
  const adm = PRODOTTO_BY_AAMS[m[2]];
  return {
    riga: parseInt(m[1]),
    codAams: m[2],
    descrizione: adm?.nome || m[3].trim(),
    descrizioneOriginale: m[3].trim(),
    confezione: adm?.confezione || 'astuccio',
    pezzi: adm?.pezzi || 20,
    prezzoConf: adm?.prezzoConf || null,
    kgcPerStecca: adm?.kgcPerStecca || KGC_PER_STECCA,
    kgc,
    stecche,
    pacchi: stecche * PACKS_PER_STECCA,
    ricevuto: 0,
    scansioni: [],
  };
}

// ── Estrai intestazione ───────────────────────────────────────────────────────
function parseIntestazione(testo) {
  const info = { numero: '—', data: '—', fornitore: 'Logista', rivendita: '—', titolare: '—', comune: '—' };
  const num = testo.match(/[Nn]umero\s+ordine\s+(\d+)/);
  const data = testo.match(/[Dd]ata\s+[Cc]onsegna\s+([\d.]+)/);
  const riv = testo.match(/[Rr]ivendita\s+N[°º]?\s*([\w\d]+)/);
  const tit = testo.match(/[Tt]itolare\s+([A-Z][A-Z\s]+?)(?:\n|[A-Z][a-z])/);
  const com = testo.match(/[Cc]omune\s+([A-Z][A-Z\s]+?)(?:\s{2,}|\n)/);
  if (num) info.numero = num[1];
  if (data) info.data = data[1];
  if (riv) info.rivendita = riv[1];
  if (tit) info.titolare = tit[1].trim();
  if (com) info.comune = com[1].trim();
  return info;
}

// ── Estrai totale Kgc dichiarato ──────────────────────────────────────────────
function parseTotale(testo) {
  const m = testo.match(/[Tt]otale\s+([\d][,.][\d]{3})/);
  if (m) return parseFloat(m[1].replace(',', '.'));
  return null;
}

// ── Risultato parsing ─────────────────────────────────────────────────────────
export function parseTestoLogista(testo) {
  const righe = testo.split('\n');
  const prodotti = [];
  const errori = [];
  const righeNonRiconosciute = [];

  for (const line of righe) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Salta righe note non-prodotto
    if (/^(Totale|Pagina|Modello|Dep\.|Rivendita|Comune|Titolare|Cod\.|Tipo|Data|Numero|Riga)/i.test(trimmed)) continue;
    if (/D\.P\.R\.|Art\.|Monopoli|Amministrazione/i.test(trimmed)) continue;

    const parsed = parseRiga(line);
    if (parsed) {
      // Controlla duplicati (stesso codAams)
      const esistente = prodotti.find(p => p.codAams === parsed.codAams);
      if (esistente) {
        // Somma le quantità (può capitare su ordini multipagina)
        esistente.kgc = Math.round((esistente.kgc + parsed.kgc) * 1000) / 1000;
        esistente.stecche = Math.round(esistente.kgc / KGC_PER_STECCA);
        esistente.pacchi = esistente.stecche * PACKS_PER_STECCA;
      } else {
        prodotti.push(parsed);
      }
    } else if (trimmed.length > 5 && /\d/.test(trimmed)) {
      righeNonRiconosciute.push(trimmed);
    }
  }

  // ── Validazione somma ─────────────────────────────────────────────────────
  const totaleDichiarato = parseTotale(testo);
  const totaleCalcolato = Math.round(prodotti.reduce((a, p) => a + p.kgc, 0) * 1000) / 1000;
  let validazione = { ok: true, messaggio: null };

  if (totaleDichiarato !== null) {
    const diff = Math.abs(totaleDichiarato - totaleCalcolato);
    if (diff > 0.001) {
      validazione = {
        ok: false,
        messaggio: `⚠ Totale Kgc dichiarato (${totaleDichiarato.toFixed(3)}) ≠ somma prodotti (${totaleCalcolato.toFixed(3)}). Differenza: ${diff.toFixed(3)} Kgc. Verificare che il file sia completo.`,
        totaleDichiarato,
        totaleCalcolato,
      };
      errori.push(validazione.messaggio);
    } else {
      validazione = {
        ok: true,
        messaggio: `✓ Totale Kgc verificato: ${totaleCalcolato.toFixed(3)} Kgc — ${prodotti.length} prodotti`,
        totaleDichiarato,
        totaleCalcolato,
      };
    }
  } else {
    validazione = {
      ok: true,
      messaggio: `${prodotti.length} prodotti letti · totale non trovato nel file`,
      totaleCalcolato,
    };
  }

  // Prodotti con codAams non nel catalogo ADM
  const sconosciuti = prodotti.filter(p => !PRODOTTO_BY_AAMS[p.codAams]);
  if (sconosciuti.length > 0) {
    errori.push(`${sconosciuti.length} prodotti non nel catalogo ADM: ${sconosciuti.map(p => p.codAams).join(', ')}`);
  }

  return {
    prodotti,
    info: parseIntestazione(testo),
    validazione,
    errori,
    righeNonRiconosciute,
    totaleCalcolato,
    totaleDichiarato,
  };
}

// ── Lettura PDF tramite PDF.js ────────────────────────────────────────────────
export async function parsePDFLogista(base64Data) {
  // Carica PDF.js dinamicamente
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

  // Converti base64 in Uint8Array
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  let testoCompleto = '';

  // Estrai testo da tutte le pagine
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Ricostruisci le righe mantenendo la struttura tabellare
    const items = content.items;
    let lastY = null;
    let rigaCorrente = '';

    for (const item of items) {
      const y = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 3) {
        testoCompleto += rigaCorrente + '\n';
        rigaCorrente = '';
      }
      rigaCorrente += item.str + ' ';
      lastY = y;
    }
    if (rigaCorrente) testoCompleto += rigaCorrente + '\n';
    testoCompleto += '\n'; // Separatore pagina
  }

  return parseTestoLogista(testoCompleto);
}

// ── Lettura da testo incollato ────────────────────────────────────────────────
export function parseTestoIncollato(testo) {
  return parseTestoLogista(testo);
}
