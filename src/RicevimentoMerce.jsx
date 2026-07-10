import { useState, useRef, useEffect } from 'react';
import { parseTestoLogista } from './logistaParsers';
import {
  caricaBarcode, salvaBarcode, caricaCatalogoADM,
  caricaSessioneAttiva, salvaSessioneAttiva, chiudiSessioneAttiva,
  salvaOrdine, caricaFoto,
} from './supabaseClient';

const KGC_PER_STECCA = 0.200;

// ── Badge stato ───────────────────────────────────────────────────────────────
function StatusBadge({ item }) {
  if (item.ricevuto === 0) return <span style={B.pending}>In attesa</span>;
  if (item.ricevuto === item.stecche) return <span style={B.ok}>✓ OK</span>;
  if (item.ricevuto > item.stecche) return <span style={B.over}>+{item.ricevuto - item.stecche}</span>;
  return <span style={B.partial}>{item.ricevuto}/{item.stecche}</span>;
}

// ── Modal abbinamento con catalogo ADM completo ───────────────────────────────
function ModalAbbinamento({ ean, items, catalogoADM, onConfirm, onSkip }) {
  const [query, setQuery] = useState('');
  const [sugger, setSugger] = useState([]);
  const [selIdx, setSelIdx] = useState(-1);
  const [scelto, setScelto] = useState(null); // prodotto ADM scelto
  const [unita, setUnita] = useState('stecca');
  const [pesoKg, setPesoKg] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleInput(val) {
    setQuery(val);
    setScelto(null);
    setSelIdx(-1);
    if (!val.trim()) { setSugger([]); return; }
    const q = val.toLowerCase();
    // Cerca prima nei prodotti in fattura, poi nel catalogo completo
    const inFattura = items.filter(i =>
      i.codAams.startsWith(val) || i.descrizione.toLowerCase().includes(q)
    ).map(i => ({ codice: i.codAams, descrizione: i.descrizione, categoria: 'In fattura', prezzo_conf: i.prezzoConf, _inFattura: true }));
    const inCatalogo = (catalogoADM || []).filter(p =>
      p.codice.startsWith(val) || p.descrizione.toLowerCase().includes(q)
    ).slice(0, 10).filter(p => !inFattura.some(f => f.codice === p.codice));
    setSugger([...inFattura, ...inCatalogo].slice(0, 12));
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(i => Math.min(i + 1, sugger.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && selIdx >= 0 && sugger[selIdx]) seleziona(sugger[selIdx]);
    if (e.key === 'Escape') onSkip();
  }

  function seleziona(p) {
    setScelto(p);
    setQuery(p.descrizione);
    setSugger([]);
    // Se è un trinciato/tabacco a peso, suggerisci il campo peso
    if (p.categoria === 'Trinciati per sigaretta' || p.categoria === 'Altri tabacchi da fumo') {
      // estrai peso dalla confezione se presente (es. "busta da 30 g")
      const m = (p.confezione || '').match(/(\d+)\s*g/i);
      if (m) setPesoKg((parseInt(m[1]) / 1000).toString());
    }
  }

  const isTrinciato = scelto && (scelto.categoria === 'Trinciati per sigaretta' || scelto.categoria === 'Altri tabacchi da fumo' || scelto.categoria === 'Fiuto e mastico');

  return (
    <div style={M.overlay}>
      <div style={M.box}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <p style={{ fontSize:15, fontWeight:700, marginBottom:3 }}>Nuovo barcode</p>
            <p style={{ fontSize:12, color:C.muted }}>Abbina al prodotto — cerca per codice AAMS o nome</p>
          </div>
          <code style={M.eanBadge}>{ean}</code>
        </div>

        <div style={{ position:'relative', marginBottom:14 }}>
          <input ref={inputRef} style={M.input} value={query}
            onChange={e => handleInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Es: 395 oppure Marlboro..." autoComplete="off" />
          {sugger.length > 0 && (
            <div style={M.dropdown}>
              {sugger.map((p, i) => (
                <div key={p.codice + i}
                  style={{ ...M.dropItem, ...(i === selIdx ? M.dropItemSel : {}) }}
                  onMouseDown={() => seleziona(p)}>
                  <code style={{ fontSize:11, color:C.muted, minWidth:52 }}>{p.codice}</code>
                  <div style={{ flex:1, minWidth:0 }}>
                    <span style={{ fontSize:13, display:'block' }}>{p.descrizione}</span>
                    <span style={{ fontSize:10, color: p._inFattura ? C.green : C.muted }}>
                      {p._inFattura ? '📄 In fattura' : p.categoria}
                    </span>
                  </div>
                  {p.prezzo_conf && <span style={{ fontSize:11, color:C.muted }}>€ {Number(p.prezzo_conf).toFixed(2)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {scelto && (
          <>
            <div style={M.prodCard}>
              <p style={{ fontSize:13, fontWeight:600 }}>{scelto.descrizione}</p>
              <p style={{ fontSize:11, color:C.muted, marginTop:3 }}>
                AAMS {scelto.codice}{scelto.confezione ? ` · ${scelto.confezione}` : ''}
                {scelto.prezzo_conf ? ` · € ${Number(scelto.prezzo_conf).toFixed(2)}` : ''}
              </p>
            </div>

            {/* Unità */}
            <p style={{ ...M.label, marginTop:14 }}>Questo barcode corrisponde a:</p>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <button
                style={{ ...M.unitaBtn, ...(unita === 'stecca' ? M.unitaBtnSel : {}) }}
                onClick={() => setUnita('stecca')}>
                📦 1 stecca<br/><span style={{ fontSize:10, opacity:0.7 }}>= 10 pacchetti</span>
              </button>
              <button
                style={{ ...M.unitaBtn, ...(unita === 'pacchetto' ? M.unitaBtnSel : {}) }}
                onClick={() => setUnita('pacchetto')}>
                🚬 1 pacchetto<br/><span style={{ fontSize:10, opacity:0.7 }}>= 1/10 di stecca</span>
              </button>
            </div>

            {/* Peso per trinciati */}
            {isTrinciato && (
              <div style={{ marginBottom:12 }}>
                <p style={M.label}>Peso confezione (kg)</p>
                <input style={{ ...M.input, maxWidth:140 }} type="number" step="0.001"
                  value={pesoKg} onChange={e => setPesoKg(e.target.value)} placeholder="es. 0.030" />
                <p style={{ fontSize:11, color:C.muted, marginTop:4 }}>Per prodotti a peso: 30g = 0.030</p>
              </div>
            )}
          </>
        )}

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:14 }}>
          <button style={M.btnSec} onClick={onSkip}>Salta (Esc)</button>
          <button
            style={{ ...M.btnPri, ...(!scelto ? { background:'#CCC', cursor:'not-allowed' } : {}) }}
            disabled={!scelto}
            onClick={() => onConfirm(ean, scelto.codice, unita, pesoKg ? parseFloat(pesoKg) : null)}>
            Abbina e registra →
          </button>
        </div>
        <p style={{ fontSize:11, color:C.muted, textAlign:'center', marginTop:12 }}>
          💾 Salvato per sempre nel database condiviso
        </p>
      </div>
    </div>
  );
}

// ── Modal chiusura con discrepanze ────────────────────────────────────────────
function ModalChiusura({ items, foto, onConferma, onAnnulla, onAggiungiFoto }) {
  const [note, setNote] = useState('');
  const [caricandoFoto, setCaricandoFoto] = useState(false);
  const fileRef = useRef(null);

  const discrepanti = items.filter(i => i.ricevuto !== i.stecche);
  const mancanti = discrepanti.filter(i => i.ricevuto < i.stecche);
  const eccessi = discrepanti.filter(i => i.ricevuto > i.stecche);

  const testoReclamo = [
    `RECLAMO ORDINE — discrepanze rilevate al ricevimento`,
    '',
    ...(mancanti.length > 0 ? [
      'PRODOTTI MANCANTI:',
      ...mancanti.map(i => `- ${i.descrizione} (AAMS ${i.codAams}): attese ${i.stecche} stecche, ricevute ${i.ricevuto} → mancano ${i.stecche - i.ricevuto}`),
      '',
    ] : []),
    ...(eccessi.length > 0 ? [
      'PRODOTTI IN ECCESSO:',
      ...eccessi.map(i => `- ${i.descrizione} (AAMS ${i.codAams}): attese ${i.stecche} stecche, ricevute ${i.ricevuto} → eccesso di ${i.ricevuto - i.stecche}`),
    ] : []),
  ].join('\n');

  async function handleFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCaricandoFoto(true);
    try {
      await onAggiungiFoto(file, 'discrepanza');
    } finally {
      setCaricandoFoto(false);
      e.target.value = '';
    }
  }

  return (
    <div style={M.overlay}>
      <div style={{ ...M.box, maxWidth:560 }}>
        <p style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>
          {discrepanti.length > 0 ? '⚠ Chiusura con discrepanze' : '✓ Chiusura sessione'}
        </p>

        {discrepanti.length > 0 ? (
          <>
            <p style={{ fontSize:13, color:C.muted, marginBottom:14 }}>
              {mancanti.length > 0 && `${mancanti.length} prodotti con mancanze`}
              {mancanti.length > 0 && eccessi.length > 0 && ' · '}
              {eccessi.length > 0 && `${eccessi.length} in eccesso`}
              — verifica prima di chiudere.
            </p>

            <div style={{ background:'#FFFBF0', border:'1px solid #EF9F27', borderRadius:8, padding:'12px 14px', marginBottom:14, maxHeight:180, overflowY:'auto' }}>
              {mancanti.map((i, k) => (
                <p key={k} style={{ fontSize:12, color:'#7B4F00', padding:'3px 0' }}>
                  ▼ <b>{i.descrizione}</b> — mancano {i.stecche - i.ricevuto} stecche ({i.ricevuto}/{i.stecche})
                </p>
              ))}
              {eccessi.map((i, k) => (
                <p key={k} style={{ fontSize:12, color:'#0C447C', padding:'3px 0' }}>
                  ▲ <b>{i.descrizione}</b> — eccesso di {i.ricevuto - i.stecche} stecche ({i.ricevuto}/{i.stecche})
                </p>
              ))}
            </div>

            <button style={{ ...M.btnSec, width:'100%', marginBottom:14 }}
              onClick={() => navigator.clipboard.writeText(testoReclamo)}>
              📋 Copia testo reclamo per Logista
            </button>

            <p style={M.label}>Note sulla discrepanza (facoltative)</p>
            <textarea
              style={{ ...M.input, resize:'vertical', minHeight:60, marginBottom:14 }}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Es: collo danneggiato, manca scatolo Marlboro..."
            />
          </>
        ) : (
          <p style={{ fontSize:13, color:C.muted, marginBottom:14 }}>
            Tutti i prodotti corrispondono. La sessione verrà salvata nello storico.
          </p>
        )}

        {/* Foto */}
        <p style={M.label}>Foto allegate ({foto.length})</p>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
          {foto.map((f, i) => (
            <div key={i} style={{ background:C.borderLight, borderRadius:6, padding:'6px 10px', fontSize:11, color:C.muted }}>
              📷 {f.tipo === 'bolla' ? 'Bolla' : 'Discrepanza'} {i + 1}
            </div>
          ))}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleFoto} />
          <button style={{ ...M.btnSec, fontSize:11 }} disabled={caricandoFoto} onClick={() => fileRef.current?.click()}>
            {caricandoFoto ? '⏳ Carico...' : '+ Aggiungi foto'}
          </button>
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button style={M.btnSec} onClick={onAnnulla}>Torna al controllo</button>
          <button style={M.btnPri} onClick={() => onConferma(note)}>
            ✓ Chiudi e salva sessione
          </button>
        </div>
      </div>
    </div>
  );
}

// ── App principale ────────────────────────────────────────────────────────────
export default function RicevimentoMerce({ utente }) {
  const [phase, setPhase] = useState('upload');
  const [items, setItems] = useState([]);
  const [sessione, setSessione] = useState(null);
  const [validazione, setValidazione] = useState(null);
  const [activeIdx, setActiveIdx] = useState(null);
  const [scanInput, setScanInput] = useState('');
  const [manualQty, setManualQty] = useState('');
  const [ricerca, setRicerca] = useState('');
  const [toast, setToast] = useState(null);
  const [pendingEan, setPendingEan] = useState(null);
  const [catalogo, setCatalogo] = useState({});
  const [catalogoADM, setCatalogoADM] = useState([]);
  const [foto, setFoto] = useState([]);
  const [mostraChiusura, setMostraChiusura] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [mostraIncolla, setMostraIncolla] = useState(false);
  const [testoIncolla, setTestoIncolla] = useState('');
  const [caricandoBolla, setCaricandoBolla] = useState(false);

  const scanRef = useRef(null);
  const fileRef = useRef(null);
  const bollaRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [cat, adm, sess] = await Promise.all([
        caricaBarcode().catch(() => ({})),
        caricaCatalogoADM().catch(() => []),
        caricaSessioneAttiva().catch(() => null),
      ]);
      setCatalogo(cat);
      setCatalogoADM(adm);
      if (sess) {
        setItems(sess.items || []);
        setSessione(sess.info);
        setValidazione(sess.validazione);
        setFoto(sess.foto || []);
        setPhase('check');
        setActiveIdx(sess.activeIdx || 0);
      }
    })();
  }, []);

  useEffect(() => {
    if (phase === 'check' && activeIdx !== null) {
      setTimeout(() => scanRef.current?.focus(), 80);
    }
  }, [phase, activeIdx]);

  useEffect(() => {
    if (phase === 'check' && sessione) {
      salvaSessioneAttiva({ items, info: sessione, validazione, activeIdx, foto }).catch(() => {});
    }
  }, [items, phase, sessione, activeIdx, foto]);

  function showToast(msg, tipo = 'ok') {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 2800);
  }

  // ── Caricamento PDF/testo ──────────────────────────────────────────────────
  async function elaboraPDF(file) {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      let testo = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        let lastY = null, riga = '';
        for (const item of content.items) {
          const y = Math.round(item.transform[5]);
          if (lastY !== null && Math.abs(y - lastY) > 3) {
            testo += riga + '\n';
            riga = '';
          }
          riga += item.str + ' ';
          lastY = y;
        }
        if (riga) testo += riga + '\n';
      }
      caricaRisultato(parseTestoLogista(testo));
    } catch (err) {
      showToast('Errore lettura PDF: ' + err.message, 'warn');
    }
  }

  function caricaRisultato(ris) {
    if (ris.prodotti.length === 0) {
      showToast('Nessun prodotto trovato nel file', 'warn');
      return;
    }
    // Arricchisci con dati ADM
    const arricchiti = ris.prodotti.map(p => {
      const adm = catalogoADM.find(a => a.codice === p.codAams);
      return adm ? { ...p, descrizione: adm.descrizione, prezzoConf: adm.prezzo_conf, confezione: adm.confezione } : p;
    });
    setItems(arricchiti);
    setSessione(ris.info);
    setValidazione(ris.validazione);
    setFoto([]);
    setPhase('check');
    setActiveIdx(0);
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.pdf')) elaboraPDF(file);
    else showToast('Carica un file PDF', 'warn');
  }

  function loadDemo() {
    const demo = `Numero ordine 377902938
Data Consegna 29.05.2026
Comune SAN MICHELE AL TAGLIAMENTO
1 630 DIANA BLU KS*AST20 0,600
2 233 DIANA ROSSA KS*AST20 0,600
3 1313 L&M RED LABEL KS*AST20 2,000
4 9 MARLBORO GOLD KS*AST20 2,000
5 395 MARLBORO KS*AST20 2,000
6 3840 WEST ORIGINAL 100S*AST20 2,000
7 21232 DELIA CLASSIC GREEN*20PZ 2,000
8 21109 DELIA CLASSIC RED*20PZ 2,000
Totale 13,200`;
    caricaRisultato(parseTestoLogista(demo));
  }

  // ── Scansione ──────────────────────────────────────────────────────────────
  function handleScan(e) {
    if (e.key !== 'Enter' || !scanInput.trim()) return;
    const ean = scanInput.trim();
    setScanInput('');

    const info = catalogo[ean];
    if (info) {
      const idx = items.findIndex(i => i.codAams === info.codAams);
      if (idx !== -1) {
        // Quantità: stecca = 1, pacchetto = 0.1
        const qty = info.unita === 'pacchetto' ? 0.1 : 1;
        registra(idx, qty, ean);
        setActiveIdx(idx);
        return;
      }
      showToast(`Barcode noto (${info.codAams}) ma il prodotto non è in questa fattura`, 'warn');
      return;
    }
    const direct = items.findIndex(i => i.codAams === ean);
    if (direct !== -1) { registra(direct, 1, ean); setActiveIdx(direct); return; }
    setPendingEan(ean);
  }

  async function onAbbina(ean, codAams, unita, pesoKg) {
    setCatalogo(prev => ({ ...prev, [ean]: { codAams, unita, pesoKg } }));
    salvaBarcode(ean, codAams, unita, pesoKg, utente?.profilo?.nome).catch(err =>
      showToast('Errore salvataggio: ' + err.message, 'warn'));
    setPendingEan(null);
    const idx = items.findIndex(i => i.codAams === codAams);
    if (idx !== -1) {
      const qty = unita === 'pacchetto' ? 0.1 : 1;
      registra(idx, qty, ean);
      setActiveIdx(idx);
    } else {
      showToast(`Barcode salvato — ${codAams} non è in questa fattura`, 'info');
    }
    setTimeout(() => scanRef.current?.focus(), 100);
  }

  function registra(idx, qty, barcode = 'manuale') {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const n = Math.round((item.ricevuto + qty) * 10) / 10;
      const sc = [...item.scansioni, { qty, barcode, ts: new Date().toLocaleTimeString('it-IT') }];
      if (n === item.stecche) showToast(`✓ ${item.descrizione} — completato!`);
      else if (n > item.stecche) showToast(`⚠ ${item.descrizione} — eccesso`, 'warn');
      else showToast(`${item.descrizione}: ${n}/${item.stecche}`, 'info');
      return { ...item, ricevuto: n, scansioni: sc };
    }));
  }

  function aggiungiManuale() {
    const q = parseFloat(manualQty);
    if (!q || isNaN(q) || activeIdx === null) return;
    registra(activeIdx, q, q < 0 ? 'rimosso' : 'manuale');
    setManualQty('');
    setTimeout(() => scanRef.current?.focus(), 50);
  }

  // ── Foto ───────────────────────────────────────────────────────────────────
  async function aggiungiFoto(file, tipo) {
    try {
      const nome = await caricaFoto(file, tipo);
      setFoto(prev => [...prev, { nome, tipo, caricataIl: new Date().toISOString() }]);
      showToast(`📷 Foto ${tipo === 'bolla' ? 'bolla' : 'discrepanza'} caricata`);
    } catch (err) {
      showToast('Errore caricamento foto: ' + err.message, 'warn');
    }
  }

  async function handleFotoBolla(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCaricandoBolla(true);
    try { await aggiungiFoto(file, 'bolla'); }
    finally { setCaricandoBolla(false); e.target.value = ''; }
  }

  // ── Chiusura sessione ──────────────────────────────────────────────────────
  async function confermaChiusura(note) {
    const nuovo = {
      ...sessione,
      items: items.map(i => ({ ...i })),
      totaleAtteso: items.reduce((a, i) => a + i.stecche, 0),
      totaleRicevuto: Math.round(items.reduce((a, i) => a + i.ricevuto, 0) * 10) / 10,
      discrepanze: items.filter(i => i.ricevuto !== i.stecche).length,
      foto,
      noteDiscrepanze: note || null,
    };
    try {
      await salvaOrdine(nuovo);
      await chiudiSessioneAttiva();
      setMostraChiusura(false);
      setPhase('upload');
      setItems([]); setSessione(null); setActiveIdx(null); setFoto([]);
      showToast('✓ Sessione chiusa e salvata');
    } catch (err) {
      showToast('Errore salvataggio: ' + err.message, 'warn');
    }
  }

  async function annullaSessione() {
    await chiudiSessioneAttiva().catch(() => {});
    setPhase('upload');
    setItems([]); setSessione(null); setActiveIdx(null); setFoto([]);
  }

  // ── Derivati ───────────────────────────────────────────────────────────────
  const totAtt = items.reduce((a, i) => a + i.stecche, 0);
  const totRic = Math.round(items.reduce((a, i) => a + i.ricevuto, 0) * 10) / 10;
  const completati = items.filter(i => i.ricevuto === i.stecche).length;
  const progresso = totAtt > 0 ? Math.min(100, Math.round(totRic / totAtt * 100)) : 0;
  const activeItem = activeIdx !== null ? items[activeIdx] : null;

  const itemsFiltrati = ricerca
    ? items.map((item, idx) => ({ item, idx })).filter(({ item }) =>
        item.descrizione.toLowerCase().includes(ricerca.toLowerCase()) ||
        item.codAams.includes(ricerca))
    : items.map((item, idx) => ({ item, idx }));

  // ── UPLOAD ─────────────────────────────────────────────────────────────────
  if (phase === 'upload') return (
    <div style={{ fontFamily:C.font, background:C.bg, minHeight:'calc(100vh - 50px)' }}>
      <div style={{ maxWidth:480, margin:'0 auto', padding:'50px 24px 40px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <span style={{ background:C.red, color:'#fff', fontWeight:700, fontSize:22, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:4 }}>L</span>
          <span style={{ fontSize:16, fontWeight:600 }}>ogista · Ricevimento Merce</span>
        </div>
        <p style={{ fontSize:13, color:C.muted, marginBottom:24 }}>Carica il PDF dell'ordine per aprire la sessione</p>

        <div style={{ border:'2px dashed #C8C4BA', borderRadius:10, padding:'32px 24px', textAlign:'center', cursor:'pointer', background:'#fff', ...(dragOver ? { borderColor:C.red, background:'#FFF5F5' } : {}) }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".pdf" style={{ display:'none' }}
            onChange={e => e.target.files[0] && elaboraPDF(e.target.files[0])} />
          <div style={{ fontSize:36, marginBottom:8 }}>📄</div>
          <p style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Trascina il PDF Logista qui</p>
          <p style={{ fontSize:12, color:C.muted }}>oppure clicca per selezionare</p>
        </div>

        <div style={{ textAlign:'center', color:'#CCC', fontSize:12, margin:'16px 0' }}>oppure</div>

        <button style={{ ...S.btnSec, width:'100%', marginBottom:8 }} onClick={() => setMostraIncolla(!mostraIncolla)}>
          {mostraIncolla ? '▲ Nascondi' : '📋 Incolla il testo del PDF'}
        </button>

        {mostraIncolla && (
          <div style={{ marginBottom:12 }}>
            <textarea style={{ width:'100%', padding:'10px 12px', fontSize:13, border:`1.5px solid ${C.border}`, borderRadius:8, fontFamily:C.font, outline:'none', marginBottom:8, boxSizing:'border-box', resize:'vertical' }}
              rows={7} value={testoIncolla} onChange={e => setTestoIncolla(e.target.value)}
              placeholder="Ctrl+A e Ctrl+C sul PDF, poi Ctrl+V qui..." />
            <button style={{ ...S.btnPri, width:'100%' }}
              onClick={() => testoIncolla.trim() && caricaRisultato(parseTestoLogista(testoIncolla))}>
              Leggi ordine
            </button>
          </div>
        )}

        <button style={{ ...S.btnPri, width:'100%', background:'#444' }} onClick={loadDemo}>
          Carica ordine di esempio
        </button>

        <p style={{ fontSize:11, color:'#BBB', textAlign:'center', marginTop:16, lineHeight:1.6 }}>
          Catalogo ADM: {catalogoADM.length} prodotti · {Object.keys(catalogo).length} barcode salvati
        </p>
      </div>
      {toast && <Toast toast={toast} />}
    </div>
  );

  // ── CHECK ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:C.font, background:C.bg, minHeight:'calc(100vh - 50px)', paddingBottom:40 }}>
      {pendingEan && (
        <ModalAbbinamento ean={pendingEan} items={items} catalogoADM={catalogoADM}
          onConfirm={onAbbina}
          onSkip={() => { setPendingEan(null); showToast('Ignorato', 'info'); setTimeout(() => scanRef.current?.focus(), 100); }} />
      )}

      {mostraChiusura && (
        <ModalChiusura items={items} foto={foto}
          onConferma={confermaChiusura}
          onAnnulla={() => setMostraChiusura(false)}
          onAggiungiFoto={aggiungiFoto} />
      )}

      {/* Header */}
      <div style={{ background:C.text, color:'#fff', padding:'10px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
        <div>
          <span style={{ fontSize:14, fontWeight:600 }}>Ordine {sessione?.numero}</span>
          <span style={{ fontSize:12, color:'#AAA' }}> · {sessione?.data}</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input ref={bollaRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleFotoBolla} />
          <button style={S.hBtn} disabled={caricandoBolla} onClick={() => bollaRef.current?.click()}>
            {caricandoBolla ? '⏳' : `📷 Bolla${foto.filter(f => f.tipo === 'bolla').length > 0 ? ` (${foto.filter(f => f.tipo === 'bolla').length})` : ''}`}
          </button>
          <button style={S.hBtn} onClick={() => setMostraChiusura(true)}>Chiudi sessione</button>
          <button style={{ ...S.hBtn, color:'#F09595' }} onClick={annullaSessione}>✕</button>
        </div>
      </div>

      {/* Validazione */}
      {validazione && (
        <div style={{ padding:'8px 20px', fontSize:12, fontWeight:500, background:validazione.ok ? '#D4EDDA' : '#FDECEA', color:validazione.ok ? C.green : C.red }}>
          {validazione.messaggio}
        </div>
      )}

      {/* Progress */}
      <div style={{ background:'#fff', borderBottom:`1px solid ${C.border}`, padding:'8px 20px', display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ flex:1, height:6, background:C.border, borderRadius:4, overflow:'hidden' }}>
          <div style={{ height:'100%', background:C.green, borderRadius:4, transition:'width .3s', width:`${progresso}%` }} />
        </div>
        <span style={{ fontSize:12, color:C.muted, whiteSpace:'nowrap' }}>{totRic}/{totAtt} · {completati}/{items.length}</span>
      </div>

      <div style={{ display:'flex', maxHeight:'calc(100vh - 180px)', overflow:'hidden' }}>
        {/* Lista con ricerca */}
        <div style={{ width:320, borderRight:`1px solid ${C.border}`, background:'#fff', flexShrink:0, display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'8px 10px', borderBottom:`1px solid ${C.borderLight}` }}>
            <input
              style={{ width:'100%', padding:'7px 10px', fontSize:12, border:`1.5px solid ${C.border}`, borderRadius:6, fontFamily:C.font, outline:'none', boxSizing:'border-box' }}
              placeholder="🔍 Cerca prodotto o codice..."
              value={ricerca}
              onChange={e => setRicerca(e.target.value)}
            />
          </div>
          <div style={{ overflowY:'auto', flex:1 }}>
            {itemsFiltrati.map(({ item, idx }) => {
              const isActive = idx === activeIdx, isDone = item.ricevuto === item.stecche, isOver = item.ricevuto > item.stecche;
              const hasEan = Object.values(catalogo).some(v => v.codAams === item.codAams);
              return (
                <div key={idx}
                  style={{ padding:'10px 14px', borderBottom:`1px solid ${C.borderLight}`, cursor:'pointer',
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    ...(isActive ? { background:'#FFF8F0', borderLeft:`3px solid ${C.red}` } : {}),
                    ...(isDone ? { background:'#F0FAF3' } : {}),
                    ...(isOver ? { background:'#FFF0F0' } : {}) }}
                  onClick={() => { setActiveIdx(idx); setTimeout(() => scanRef.current?.focus(), 50); }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:3, flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                      <code style={S.code}>{item.codAams}</code>
                      {hasEan && <span style={{ fontSize:8, color:C.green }}>●</span>}
                    </div>
                    <span style={{ fontSize:12, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.descrizione}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, marginLeft:8 }}>
                    <span style={{ fontSize:16, fontWeight:700 }}>{item.ricevuto}<span style={{ fontSize:12, color:C.muted, fontWeight:400 }}>/{item.stecche}</span></span>
                    <StatusBadge item={item} />
                  </div>
                </div>
              );
            })}
            {itemsFiltrati.length === 0 && <p style={{ padding:20, fontSize:12, color:C.muted, textAlign:'center' }}>Nessun risultato</p>}
          </div>
        </div>

        {/* Pannello */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {activeItem ? (
            <>
              <div style={S.card}>
                <p style={{ fontSize:10, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Prodotto</p>
                <p style={{ fontSize:17, fontWeight:700, marginBottom:10 }}>{activeItem.descrizione}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:4, fontSize:12, color:'#666', marginBottom:10 }}>
                  <span><b>AAMS:</b> {activeItem.codAams} · <b>Kgc:</b> {activeItem.kgc?.toFixed(3)}</span>
                  <span><b>Attese:</b> {activeItem.stecche} stecche ({activeItem.pacchi} pacchetti)</span>
                  {activeItem.prezzoConf && <span><b>Prezzo:</b> € {Number(activeItem.prezzoConf).toFixed(2)} · <b>Aggio:</b> € {(activeItem.prezzoConf * 0.1).toFixed(2)}</span>}
                </div>
                {(() => {
                  const eans = Object.entries(catalogo).filter(([, v]) => v.codAams === activeItem.codAams);
                  return eans.length > 0
                    ? <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', fontSize:11, marginBottom:8 }}>
                        <span style={{ color:C.muted }}>Barcode:</span>
                        {eans.map(([e, v]) => (
                          <code key={e} style={{ background:'#EAF3DE', color:'#27500A', padding:'2px 8px', borderRadius:20 }}>
                            {e} <span style={{ opacity:0.6 }}>({v.unita === 'pacchetto' ? 'pacch.' : 'stecca'})</span>
                          </code>
                        ))}
                      </div>
                    : <p style={{ fontSize:11, color:'#AAA', fontStyle:'italic', marginBottom:8 }}>Nessun barcode — scansiona per abbinare</p>;
                })()}
                <div style={{ height:8, background:C.borderLight, borderRadius:4, overflow:'hidden', marginBottom:6 }}>
                  <div style={{ height:'100%', borderRadius:4, transition:'width .3s', width:`${Math.min(100, activeItem.ricevuto / activeItem.stecche * 100)}%`, background:activeItem.ricevuto > activeItem.stecche ? C.red : C.green }} />
                </div>
                <p style={{ fontSize:13, fontWeight:600 }}>{activeItem.ricevuto} / {activeItem.stecche} stecche</p>
              </div>

              <div style={S.card}>
                <p style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>🔫 Scansiona</p>
                <input ref={scanRef} style={S.scanInput} value={scanInput}
                  onChange={e => setScanInput(e.target.value)} onKeyDown={handleScan}
                  placeholder="Scansiona o digita + Invio" autoComplete="off" />
              </div>

              <div style={S.card}>
                <p style={{ fontSize:12, fontWeight:600, marginBottom:10 }}>Inserimento manuale</p>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <button style={S.qtyBtn} onClick={() => registra(activeIdx, -1, 'rimosso')}>−</button>
                  <input type="number" style={S.qtyInput} value={manualQty} onChange={e => setManualQty(e.target.value)}
                    placeholder="0" onKeyDown={e => e.key === 'Enter' && aggiungiManuale()} />
                  <button style={S.qtyBtn} onClick={() => setManualQty(q => (parseFloat(q) || 0) + 1)}>+</button>
                  <span style={{ fontSize:12, color:C.muted }}>stecche</span>
                  <button style={{ ...S.btnPri, marginLeft:'auto', padding:'8px 18px' }} onClick={aggiungiManuale}>Aggiungi</button>
                </div>
                <p style={{ fontSize:11, color:C.muted, marginTop:8 }}>Numero negativo per rimuovere · − toglie 1 stecca</p>
              </div>

              {activeItem.scansioni.length > 0 && (
                <div style={S.card}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <p style={{ fontSize:12, fontWeight:600 }}>Scansioni ({activeItem.scansioni.length})</p>
                    <button style={{ fontSize:11, color:C.red, background:'none', border:'none', cursor:'pointer', fontFamily:C.font }}
                      onClick={() => setItems(prev => prev.map((item, i) => i === activeIdx ? { ...item, ricevuto:0, scansioni:[] } : item))}>Reset</button>
                  </div>
                  {activeItem.scansioni.slice(-8).map((sc, j) => (
                    <div key={j} style={{ display:'flex', gap:12, fontSize:12, padding:'4px 0', borderBottom:`1px solid ${C.borderLight}` }}>
                      <span style={{ color:'#AAA' }}>{sc.ts}</span>
                      <span style={{ color:sc.qty < 0 ? C.red : C.green, fontWeight:500 }}>{sc.qty > 0 ? '+' : ''}{sc.qty}</span>
                      <code style={{ color:'#AAA', fontSize:11 }}>{sc.barcode}</code>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display:'flex', gap:8 }}>
                <button style={{ ...S.btnSec, flex:1 }} disabled={activeIdx === 0}
                  onClick={() => { setActiveIdx(i => i - 1); setTimeout(() => scanRef.current?.focus(), 50); }}>← Prec.</button>
                <button style={{ ...S.btnSec, flex:1 }} disabled={activeIdx === items.length - 1}
                  onClick={() => { setActiveIdx(i => i + 1); setTimeout(() => scanRef.current?.focus(), 50); }}>Succ. →</button>
              </div>
            </>
          ) : <p style={{ color:C.muted }}>Seleziona un prodotto</p>}
        </div>
      </div>

      {toast && <Toast toast={toast} />}
    </div>
  );
}

function Toast({ toast }) {
  const bg = toast.tipo === 'warn' ? '#8B3A0F' : toast.tipo === 'info' ? '#0C447C' : '#1a6b2e';
  return <div style={{ position:'fixed', top:70, right:20, background:bg, color:'#fff', padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:500, boxShadow:'0 4px 16px rgba(0,0,0,0.15)', zIndex:999 }}>{toast.msg}</div>;
}

// ── Stili ─────────────────────────────────────────────────────────────────────
const C = {
  font:"'IBM Plex Mono', monospace", bg:'#F7F5F0', white:'#fff',
  border:'#E8E4DC', borderLight:'#F0EDE6', text:'#1a1a1a',
  muted:'#888', red:'#C41E1E', green:'#1a6b2e',
};

const S = {
  btnPri:{ padding:'9px 20px', background:C.text, color:'#fff', border:'none', borderRadius:7, fontSize:13, cursor:'pointer', fontFamily:C.font, fontWeight:600 },
  btnSec:{ padding:'9px 16px', background:'none', border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, cursor:'pointer', fontFamily:C.font, color:C.muted },
  hBtn:{ background:'transparent', border:'1px solid #555', color:'#ddd', padding:'5px 14px', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:C.font },
  card:{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 16px' },
  code:{ background:C.borderLight, padding:'2px 6px', borderRadius:3, fontSize:11 },
  scanInput:{ width:'100%', padding:'10px 12px', fontSize:14, border:`2px solid ${C.text}`, borderRadius:6, background:'#FAFAF8', fontFamily:C.font, outline:'none', boxSizing:'border-box' },
  qtyBtn:{ width:36, height:36, background:C.borderLight, border:'none', borderRadius:6, fontSize:20, cursor:'pointer', fontFamily:C.font },
  qtyInput:{ width:70, padding:'7px 10px', fontSize:16, fontWeight:700, border:`2px solid ${C.border}`, borderRadius:7, fontFamily:C.font, textAlign:'center', outline:'none' },
};

const M = {
  overlay:{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 },
  box:{ background:'#fff', borderRadius:12, padding:24, width:'100%', maxWidth:520, maxHeight:'88vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' },
  eanBadge:{ background:'#FFF3CD', color:'#7B4F00', padding:'4px 12px', borderRadius:20, fontSize:13, fontWeight:600 },
  label:{ fontSize:12, fontWeight:600, color:C.text, marginBottom:8 },
  input:{ width:'100%', padding:'10px 12px', fontSize:14, border:`2px solid ${C.text}`, borderRadius:7, fontFamily:C.font, outline:'none', boxSizing:'border-box' },
  dropdown:{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:10, maxHeight:280, overflowY:'auto' },
  dropItem:{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', cursor:'pointer', fontSize:13, borderBottom:`1px solid ${C.borderLight}` },
  dropItemSel:{ background:'#EAF3DE' },
  prodCard:{ background:'#F8FAF5', border:'1px solid #97C459', borderRadius:8, padding:'12px 14px' },
  unitaBtn:{ flex:1, padding:'12px 10px', background:'#fff', border:`2px solid ${C.border}`, borderRadius:8, fontSize:13, cursor:'pointer', fontFamily:C.font, textAlign:'center', lineHeight:1.4 },
  unitaBtnSel:{ borderColor:'#1a6b2e', background:'#F0FAF3', fontWeight:600 },
  btnPri:{ padding:'9px 20px', background:C.text, color:'#fff', border:'none', borderRadius:7, fontSize:13, cursor:'pointer', fontFamily:C.font, fontWeight:600 },
  btnSec:{ padding:'9px 16px', background:'none', border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, cursor:'pointer', fontFamily:C.font, color:C.muted },
};

const B = {
  ok:{ background:'#D4EDDA', color:C.green, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 },
  pending:{ background:C.borderLight, color:C.muted, padding:'2px 8px', borderRadius:20, fontSize:11 },
  partial:{ background:'#FFF3CD', color:'#7B4F00', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 },
  over:{ background:'#FDECEA', color:C.red, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 },
};
