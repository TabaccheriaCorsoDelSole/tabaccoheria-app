import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bjkujoiluifkcdcwmbhm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqa3Vqb2lsdWlma2NkY3dtYmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNjk2MjQsImV4cCI6MjA5ODc0NTYyNH0.D4mkBcWsZWXeMLEVYDVOQ6HICMzhXxL2krfLIPiNUeE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Auth helpers ──────────────────────────────────────────────────────────────
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
  const { data: profilo } = await supabase
    .from('profili')
    .select('*')
    .eq('id', user.id)
    .single();
  return { ...user, profilo };
}

// ── Barcode ───────────────────────────────────────────────────────────────────
export async function caricaBarcode() {
  const { data, error } = await supabase.from('barcode').select('ean, cod_aams');
  if (error) throw error;
  // Ritorna come oggetto { ean: codAams } per compatibilità con il codice esistente
  return Object.fromEntries((data || []).map(r => [r.ean, r.cod_aams]));
}

export async function salvaBarcode(ean, codAams) {
  const { error } = await supabase.from('barcode').upsert({ ean, cod_aams: codAams });
  if (error) throw error;
}

export async function eliminaBarcode(ean) {
  const { error } = await supabase.from('barcode').delete().eq('ean', ean);
  if (error) throw error;
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
  });
  if (error) throw error;
}

export async function eliminaOrdine(id) {
  const { error } = await supabase.from('ordini').delete().eq('id', id);
  if (error) throw error;
}

// ── Sessione attiva ───────────────────────────────────────────────────────────
export async function caricaSessioneAttiva() {
  const { data } = await supabase.from('sessione_attiva').select('dati').eq('id', 1).single();
  return data?.dati || null;
}

export async function salvaSessioneAttiva(dati) {
  const { error } = await supabase.from('sessione_attiva').upsert({ id: 1, dati, aggiornata_il: new Date().toISOString() });
  if (error) throw error;
}

export async function chiudiSessioneAttiva() {
  await supabase.from('sessione_attiva').delete().eq('id', 1);
}
