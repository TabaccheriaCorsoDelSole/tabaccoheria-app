import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bjkujoiluifkcdcwmbhm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqa3Vqb2lsdWlma2NkY3dtYmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNjk2MjQsImV4cCI6MjA5ODc0NTYyNH0.D4mkBcWsZWXeMLEVYDVOQ6HICMzhXxL2krfLIPiNUeE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getUtenteCorrente() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profilo } = await supabase.from('profili').select('*').eq('id', user.id).single();
  return { ...user, profilo };
}

// ── Catalogo ADM ──────────────────────────────────────────────────────────────
let _catalogoCache = null;

export async function caricaCatalogoADM() {
  if (_catalogoCache) return _catalogoCache;
  // Carica a pagine (Supabase limita a 1000 righe per query)
  let tutti = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('catalogo_adm')
      .select('codice, descrizione, confezione, prezzo_kg, prezzo_conf, categoria')
      .range(from, from + PAGE - 1)
      .order('codice');
    if (error) throw error;
    tutti = tutti.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  _catalogoCache = tutti;
  return tutti;
}

export async function cercaProdottoADM(codice) {
  const cat = await caricaCatalogoADM();
  return cat.find(p => p.codice === String(codice)) || null;
}

// ── Barcode (con unità e peso) ────────────────────────────────────────────────
export async function caricaBarcode() {
  const { data, error } = await supabase.from('barcode').select('ean, cod_aams, unita, peso_kg, note');
  if (error) throw error;
  // Mappa completa: { ean: { codAams, unita, pesoKg } }
  const mappa = {};
  for (const r of (data || [])) {
    mappa[r.ean] = { codAams: r.cod_aams, unita: r.unita || 'stecca', pesoKg: r.peso_kg, note: r.note };
  }
  return mappa;
}

export async function salvaBarcode(ean, codAams, unita = 'stecca', pesoKg = null, utenteNome = null) {
  const { data: esistente } = await supabase.from('barcode').select('ean').eq('ean', ean).maybeSingle();
  const { error } = await supabase.from('barcode').upsert({ ean, cod_aams: codAams, unita, peso_kg: pesoKg });
  if (error) throw error;
  // Log
  await logModifica('barcode', ean, esistente ? 'modificato' : 'inserito',
    { cod_aams: codAams, unita, peso_kg: pesoKg }, utenteNome);
}

export async function eliminaBarcode(ean, utenteNome = null) {
  const { error } = await supabase.from('barcode').delete().eq('ean', ean);
  if (error) throw error;
  await logModifica('barcode', ean, 'eliminato', null, utenteNome);
}

// ── Log modifiche ─────────────────────────────────────────────────────────────
async function logModifica(tabella, chiave, azione, dettaglio, utenteNome) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('log_modifiche').insert({
      tabella, chiave, azione, dettaglio,
      utente_id: user?.id || null,
      utente_nome: utenteNome || user?.email || 'sconosciuto',
    });
  } catch { /* log silenzioso */ }
}

export async function caricaLog(limite = 100) {
  const { data, error } = await supabase
    .from('log_modifiche')
    .select('*')
    .order('eseguito_il', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data || [];
}

// ── Ordini ────────────────────────────────────────────────────────────────────
export async function caricaOrdini() {
  const { data, error } = await supabase
    .from('ordini')
    .select('*')
    .order('chiuso_il', { ascending: false });
  if (error) throw error;
  return (data || []).map(o => ({
    id: o.id,
    numero: o.numero,
    data: o.data_consegna,
    comune: o.comune,
    chiusoIl: new Date(o.chiuso_il).toLocaleString('it-IT'),
    totaleAtteso: o.totale_atteso,
    totaleRicevuto: o.totale_ricevuto,
    discrepanze: o.discrepanze,
    items: o.dettaglio,
    foto: o.foto || [],
    noteDiscrepanze: o.note_discrepanze,
  }));
}

export async function salvaOrdine(ordine) {
  const { error } = await supabase.from('ordini').insert({
    numero: ordine.numero,
    data_consegna: ordine.data,
    comune: ordine.comune || null,
    totale_atteso: ordine.totaleAtteso,
    totale_ricevuto: ordine.totaleRicevuto,
    discrepanze: ordine.discrepanze,
    dettaglio: ordine.items,
    foto: ordine.foto || [],
    note_discrepanze: ordine.noteDiscrepanze || null,
  });
  if (error) throw error;
}

export async function eliminaOrdine(id) {
  const { error } = await supabase.from('ordini').delete().eq('id', id);
  if (error) throw error;
}

// ── Sessione attiva ───────────────────────────────────────────────────────────
export async function caricaSessioneAttiva() {
  const { data } = await supabase.from('sessione_attiva').select('dati').eq('id', 1).maybeSingle();
  return data?.dati || null;
}

export async function salvaSessioneAttiva(dati) {
  const { error } = await supabase.from('sessione_attiva').upsert({ id: 1, dati, aggiornata_il: new Date().toISOString() });
  if (error) throw error;
}

export async function chiudiSessioneAttiva() {
  await supabase.from('sessione_attiva').delete().eq('id', 1);
}

// ── Foto (bolle e discrepanze) ────────────────────────────────────────────────
// Comprimi immagine lato client prima dell'upload
export function comprimiFoto(file, maxDim = 1400, qualita = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scala = maxDim / Math.max(width, height);
        width = Math.round(width * scala);
        height = Math.round(height * scala);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Compressione fallita')), 'image/jpeg', qualita);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Immagine non valida')); };
    img.src = url;
  });
}

export async function caricaFoto(file, prefisso = 'foto') {
  const blob = await comprimiFoto(file);
  const nome = `${prefisso}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from('foto-ricevimenti').upload(nome, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return nome;
}

export async function urlFoto(nome) {
  const { data, error } = await supabase.storage.from('foto-ricevimenti').createSignedUrl(nome, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// ── Backup: esporta tutto in un file ─────────────────────────────────────────
export async function esportaBackup() {
  const [barcode, ordini, log] = await Promise.all([
    supabase.from('barcode').select('*'),
    supabase.from('ordini').select('*'),
    supabase.from('log_modifiche').select('*').order('eseguito_il', { ascending: false }).limit(500),
  ]);

  const backup = {
    esportato_il: new Date().toISOString(),
    barcode: barcode.data || [],
    ordini: ordini.data || [],
    log_modifiche: log.data || [],
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dataStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `backup_tabaccheria_${dataStr}.json`;
  a.click();
  URL.revokeObjectURL(url);

  // Anche CSV dei barcode per Excel
  const csvLines = ['EAN;Codice AAMS;Unità;Peso kg;Note',
    ...(barcode.data || []).map(b => `${b.ean};${b.cod_aams};${b.unita || 'stecca'};${b.peso_kg || ''};${b.note || ''}`)
  ].join('\n');
  const csvBlob = new Blob(['\ufeff' + csvLines], { type: 'text/csv;charset=utf-8' });
  const csvUrl = URL.createObjectURL(csvBlob);
  const a2 = document.createElement('a');
  a2.href = csvUrl;
  a2.download = `barcode_tabaccheria_${dataStr}.csv`;
  a2.click();
  URL.revokeObjectURL(csvUrl);
}
