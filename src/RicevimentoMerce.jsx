import { useState, useRef, useEffect, useCallback } from 'react';
import { parsePDFLogista, parseTestoIncollato } from './logistaParsers';
import { CATALOGO_ADM, PRODOTTO_BY_AAMS } from './catalogoADM';
import { caricaBarcode, salvaBarcode, caricaSessioneAttiva, salvaSessioneAttiva, chiudiSessioneAttiva, salvaOrdine } from './supabaseClient';

// ── Costanti ──────────────────────────────────────────────────────────────────
const isElectron = false;

// ── Badge stato ───────────────────────────────────────────────────────────────
function StatusBadge({ item }) {
  if (item.ricevuto === 0) return <span style={B.pending}>In attesa</span>;
  if (item.ricevuto === item.stecche) return <span style={B.ok}>✓ OK</span>;
  if (item.ricevuto > item.stecche) return <span style={B.over}>+{item.ricevuto - item.stecche} eccesso</span>;
  return <span style={B.partial}>{item.ricevuto}/{item.stecche}</span>;
}

// ── Modal abbinamento barcode ─────────────────────────────────────────────────
function ModalAbbinamento({ ean, items, catalogo, onConfirm, onSkip }) {
  const [codAams, setCodAams] = useState('');
  const [suggerimenti, setSuggerimenti] = useState([]);
  const [selIdx, setSelIdx] = useState(-1);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleInput(val) {
    setCodAams(val);
    setSelIdx(-1);
    if (!val.trim()) { setSuggerimenti([]); return; }
    const q = val.toLowerCase();
    const found = CATALOGO_ADM.filter(p =>
      p.codAams.startsWith(val) ||
      p.nome.toLowerCase().includes(q)
    ).slice(0, 8);
    setSuggerimenti(found);
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(i => Math.min(i + 1, suggerimenti.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') {
      if (selIdx >= 0 && suggerimenti[selIdx]) {
        seleziona(suggerimenti[selIdx]);
      } else if (codAams.trim()) {
        conferma(codAams.trim());
      }
    }
    if (e.key === 'Escape') onSkip();
  }

  function seleziona(prod) {
    setCodAams(prod.codAams);
    setSuggerimenti([]);
    setSelIdx(-1);
    conferma(prod.codAams);
  }

  function conferma(aams) {
    if (!aams) return;
    onConfirm(ean, aams);
  }

  const prodSel = PRODOTTO_BY_AAMS[codAams];

  return (
    <div style={M.overlay}>
      <div style={M.box}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <p style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:3 }}>Nuovo barcode stecca</p>
            <p style={{ fontSize:12, color:C.muted }}>Prima scansione — abbina al prodotto</p>
          </div>
          <code style={M.eanBadge}>{ean}</code>
        </div>

        {/* Campo AAMS digitabile con autocompletamento */}
        <p style={M.label}>Codice AAMS o nome prodotto</p>
        <div style={{ position:'relative', marginBottom:suggerimenti.length>0?0:14 }}>
          <input
            ref={inputRef}
            style={M.input}
            value={codAams}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Es: 395 oppure Marlboro..."
            autoComplete="off"
          />
          {suggerimenti.length > 0 && (
            <div style={M.dropdown}>
              {suggerimenti.map((p, i) => (
                <div key={p.codAams}
                  style={{ ...M.dropItem, ...(i === selIdx ? M.dropItemSel : {}) }}
                  onMouseDown={() => seleziona(p)}>
                  <code style={{ fontSize:11, color:C.muted, marginRight:8, minWidth:50 }}>{p.codAams}</code>
                  <span style={{ fontSize:13 }}>{p.nome}</span>
                  {p.prezzoConf && <span style={{ fontSize:11, color:C.muted, marginLeft:'auto' }}>€ {p.prezzoConf.toFixed(2)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conferma prodotto selezionato */}
        {prodSel && suggerimenti.length === 0 && (
          <div style={M.prodCard}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:C.text }}>{prodSel.nome}</p>
                <p style={{ fontSize:11, color:C.muted, marginTop:3 }}>
                  AAMS {prodSel.codAams} · {prodSel.confezione} da {prodSel.pezzi} pz
                  {prodSel.prezzoConf ? ` · € ${prodSel.prezzoConf.toFixed(2)}` : ''}
                </p>
              </div>
              <span style={{ color:C.green, fontSize:20, fontWeight:700 }}>✓</span>
            </div>
            <div style={{ marginTop:10, padding:'8px 10px', background:'#F0FAF3', borderRadius:6, fontSize:12, color:'#1a6b2e' }}>
              📦 Questo barcode = <strong>1 stecca = 10 pacchetti</strong>
            </div>
          </div>
        )}

        {/* Prodotto non nel catalogo */}
        {codAams && !prodSel && suggerimenti.length === 0 && (
          <div style={{ ...M.prodCard, background:'#FFFBF0', borderColor:'#EF9F27' }}>
            <p style={{ fontSize:12, color:'#7B4F00' }}>⚠ Codice AAMS "{codAams}" non nel catalogo ADM — verrà abbinato comunque.</p>
          </div>
        )}

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
          <button style={M.btnSec} onClick={onSkip}>Salta (Esc)</button>
          <button
            style={{ ...M.btnPri, ...((!codAams.trim()) ? { background:'#CCC', cursor:'not-allowed' } : {}) }}
            disabled={!codAams.trim()}
            onClick={() => conferma(codAams.trim())}>
            Abbina e registra stecca →
          </button>
        </div>
        <p style={{ fontSize:11, color:C.muted, textAlign:'center', marginTop:12 }}>
          💾 Abbinamento salvato permanentemente · usa ↑↓ per navigare i suggerimenti
        </p>
      </div>
    </div>
  );
}

// ── Schermata upload ──────────────────────────────────────────────────────────
function UploadScreen({ onCaricato, catalogo, onAzzeraCatalogo }) {
  const [stato, setStato] = useState('idle'); // idle | loading | errore
  const [messaggio, setMessaggio] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [mostraIncolla, setMostraIncolla] = useState(false);
  const [testo, setTesto] = useState('');
  const fileRef = useRef(null);

  async function elaboraPDF(base64, nome) {
    setStato('loading');
    setMessaggio({ tipo:'info', testo:`Lettura ${nome}...` });
    try {
      const risultato = await parsePDFLogista(base64);
      if (risultato.prodotti.length === 0) {
        setStato('errore');
        setMessaggio({ tipo:'errore', testo:'Nessun prodotto trovato nel PDF. Prova a incollare il testo.' });
        return;
      }
      setStato('idle');
      onCaricato(risultato);
    } catch (err) {
      setStato('errore');
      setMessaggio({ tipo:'errore', testo:`Errore lettura PDF: ${err.message}` });
    }
  }

  async function handleBrowse() {
    if (isElectron) {
      // Usa dialogo nativo Electron
      const file = await window.electronAPI.openPDF();
      if (file) await elaboraPDF(file.data, file.name);
    } else {
      fileRef.current?.click();
    }
  }

  async function handleFileInput(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const base64 = ev.target.result.split(',')[1];
      await elaboraPDF(base64, file.name);
    };
    reader.readAsDataURL(file);
  }

  async function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.endsWith('.pdf')) {
      setMessaggio({ tipo:'errore', testo:'Carica un file PDF.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async ev => {
      const base64 = ev.target.result.split(',')[1];
      await elaboraPDF(base64, file.name);
    };
    reader.readAsDataURL(file);
  }

  function handleIncolla() {
    if (!testo.trim()) return;
    const risultato = parseTestoIncollato(testo);
    if (risultato.prodotti.length === 0) {
      setMessaggio({ tipo:'errore', testo:'Nessun prodotto trovato. Assicurati di aver copiato tutto il testo del PDF.' });
      return;
    }
    onCaricato(risultato);
  }

  function loadDemo() {
    const demo = `Dep.Fisc. DFL VE-(NOVENTA DI PIAVE) Numero ordine 377902938
Rivendita N° 0017
Comune SAN MICHELE AL TAGLIAMENTO Tipo levata
Titolare COMIN Data Consegna 29.05.2026
Riga Cod.AAMS Descrizione Quantità(Kgc)
1 630 DIANA BLU KS*AST20 0,600
2 233 DIANA ROSSA KS*AST20 0,600
3 1313 L&M RED LABEL KS*AST20 2,000
4 9 MARLBORO GOLD KS*AST20 2,000
5 395 MARLBORO KS*AST20 2,000
6 3840 WEST ORIGINAL 100S*AST20 2,000
7 21232 DELIA CLASSIC GREEN*20PZ 2,000
8 21109 DELIA CLASSIC RED*20PZ 2,000
Totale 13,200`;
    onCaricato(parseTestoIncollato(demo));
  }

  const catCount = Object.keys(catalogo).length;

  return (
    <div style={U.root}>
      <div style={U.wrap}>
        <div style={U.logo}>
          <span style={U.logoL}>L</span>
          <span style={{ fontSize:16, fontWeight:600 }}>ogista · Ricevimento Merce</span>
        </div>
        <p style={{ fontSize:13, color:C.muted, marginBottom:28 }}>
          {isElectron ? 'Carica il PDF o incolla il testo dell\'ordine Logista' : 'Incolla il testo del PDF o usa l\'ordine di esempio'}
        </p>

        {/* Drop zone PDF */}
        <div style={{ ...U.drop, ...(dragOver ? U.dropActive : {}) }}
          onDragOver={e=>{e.preventDefault();setDragOver(true);}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={handleDrop}
          onClick={handleBrowse}>
          <input ref={fileRef} type="file" accept=".pdf" style={{display:'none'}} onChange={handleFileInput} />
          {stato === 'loading'
            ? <><div style={{ fontSize:28, marginBottom:8 }}>⏳</div><p style={{ fontSize:14 }}>Lettura in corso...</p></>
            : <><div style={{ fontSize:36, marginBottom:8 }}>📄</div>
                <p style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>
                  {isElectron ? 'Clicca per aprire il PDF' : 'Trascina il PDF qui'}
                </p>
                <p style={{ fontSize:12, color:C.muted }}>
                  {isElectron ? 'oppure trascinalo qui' : 'oppure clicca per selezionare'}
                </p>
              </>
          }
        </div>

        {/* Messaggio stato */}
        {messaggio && (
          <div style={{ ...U.msg, ...(messaggio.tipo==='errore' ? U.msgErr : messaggio.tipo==='ok' ? U.msgOk : U.msgInfo) }}>
            {messaggio.testo}
          </div>
        )}

        <div style={{ textAlign:'center', color:'#CCC', fontSize:12, margin:'16px 0', borderTop:`1px solid ${C.border}`, paddingTop:12 }}>oppure</div>

        {/* Incolla testo */}
        <button style={{ ...U.btnSec, width:'100%', marginBottom:8 }} onClick={()=>setMostraIncolla(!mostraIncolla)}>
          {mostraIncolla ? '▲ Nascondi' : '📋 Incolla il testo del PDF'}
        </button>

        {mostraIncolla && (
          <div style={{ marginBottom:12 }}>
            <textarea
              style={U.textarea}
              value={testo}
              onChange={e=>setTesto(e.target.value)}
              placeholder="Copia tutto il testo dal PDF (Ctrl+A, Ctrl+C) e incollalo qui (Ctrl+V)..."
              rows={8}
            />
            <button style={{ ...U.btnPri, width:'100%' }} onClick={handleIncolla}>
              Leggi ordine dal testo
            </button>
          </div>
        )}

        <button style={{ ...U.btnPri, width:'100%', background:'#444' }} onClick={loadDemo}>
          Carica ordine di esempio
        </button>

        {catCount > 0 && (
          <div style={U.catBanner}>
            <span>📦 {catCount} barcode nel catalogo</span>
            <button style={{ background:'none', border:'none', color:C.red, fontSize:11, cursor:'pointer', fontFamily:C.font }}
              onClick={onAzzeraCatalogo}>Azzera</button>
          </div>
        )}

        <p style={{ fontSize:11, color:'#BBB', textAlign:'center', marginTop:16, lineHeight:1.6 }}>
          {CATALOGO_ADM.length} prodotti nel catalogo ADM · Aggiornato 06/05/2026
        </p>
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
  const [toast, setToast] = useState(null);
  const [pendingEan, setPendingEan] = useState(null);
  const [catalogo, setCatalogo] = useState({});
  const scanRef = useRef(null);

  // Carica catalogo e sessione attiva
  useEffect(() => {
    (async () => {
      const cat = await caricaBarcode().catch(() => ({}));
      setCatalogo(cat);
      const sess = await caricaSessioneAttiva().catch(() => null);
      if (sess) {
        setItems(sess.items);
        setSessione(sess.info);
        setValidazione(sess.validazione);
        setPhase('check');
        setActiveIdx(sess.activeIdx || 0);
      }
    })();
  }, []);

  // Auto-focus campo scan
  useEffect(() => {
    if (phase === 'check' && activeIdx !== null) {
      setTimeout(() => scanRef.current?.focus(), 80);
    }
  }, [phase, activeIdx]);

  // Salva sessione attiva
  useEffect(() => {
    if (phase === 'check' && sessione) {
      salvaSessioneAttiva({ items, info: sessione, validazione, activeIdx }).catch(()=>{});
    }
  }, [items, phase, sessione, activeIdx]);

  function showToast(msg, tipo='ok') {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 2800);
  }

  async function saveCatalogo(c) {
    setCatalogo(c);
  }

  function onCaricato(risultato) {
    setItems(risultato.prodotti);
    setSessione(risultato.info);
    setValidazione(risultato.validazione);
    setPhase('check');
    setActiveIdx(0);
  }

  // ── Scansione ──────────────────────────────────────────────────────────────
  function handleScan(e) {
    if (e.key !== 'Enter' || !scanInput.trim()) return;
    const ean = scanInput.trim();
    setScanInput('');

    // Cerca nel catalogo
    if (catalogo[ean]) {
      const idx = items.findIndex(i => i.codAams === catalogo[ean]);
      if (idx !== -1) { registra(idx, 1, ean); setActiveIdx(idx); return; }
    }
    // Cerca diretto per AAMS
    const direct = items.findIndex(i => i.codAams === ean);
    if (direct !== -1) { registra(direct, 1, ean); setActiveIdx(direct); return; }
    // Sconosciuto → modal abbinamento
    setPendingEan(ean);
  }

  async function onAbbina(ean, codAams) {
    const nc = { ...catalogo, [ean]: codAams };
    setCatalogo(nc);
    salvaBarcode(ean, codAams).catch(err => showToast('Errore salvataggio barcode: ' + err.message, 'warn'));
    setPendingEan(null);
    const idx = items.findIndex(i => i.codAams === codAams);
    if (idx !== -1) { registra(idx, 1, ean); setActiveIdx(idx); }
    const nome = PRODOTTO_BY_AAMS[codAams]?.nome || items.find(i=>i.codAams===codAams)?.descrizione || codAams;
    showToast(`✓ Abbinato: ${nome}`);
    setTimeout(() => scanRef.current?.focus(), 100);
  }

  function registra(idx, qty, barcode='manuale') {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const n = item.ricevuto + qty;
      const sc = [...item.scansioni, { qty, barcode, ts: new Date().toLocaleTimeString('it-IT') }];
      if (n === item.stecche) showToast(`✓ ${item.descrizione} — completato!`);
      else if (n > item.stecche) showToast(`⚠ ${item.descrizione} — eccesso +${n - item.stecche}`, 'warn');
      else showToast(`${item.descrizione}: ${n}/${item.stecche}`, 'info');
      return { ...item, ricevuto: n, scansioni: sc };
    }));
  }

  function aggiungiManuale() {
    const q = parseInt(manualQty);
    if (!q || isNaN(q) || activeIdx === null) return;
    if (q < 0) {
      setItems(prev => prev.map((item, i) => {
        if (i !== activeIdx) return item;
        const n = item.ricevuto + q;
        const sc = [...item.scansioni, { qty: q, barcode:'rimosso', ts: new Date().toLocaleTimeString('it-IT') }];
        showToast(`${item.descrizione}: rimossa ${Math.abs(q)} stecca/e (${n}/${item.stecche})`, 'info');
        return { ...item, ricevuto: n, scansioni: sc };
      }));
    } else {
      registra(activeIdx, q);
    }
    setManualQty('');
    setTimeout(() => scanRef.current?.focus(), 50);
  }

  async function chiudiSessione() {
    const nuovo = {
      ...sessione,
      items: items.map(i => ({ ...i })),
      totaleAtteso: items.reduce((a,i)=>a+i.stecche,0),
      totaleRicevuto: items.reduce((a,i)=>a+i.ricevuto,0),
      discrepanze: items.filter(i=>i.ricevuto>0&&i.ricevuto!==i.stecche).length,
    };
    try {
      await salvaOrdine(nuovo);
      await chiudiSessioneAttiva();
      setPhase('upload');
      setItems([]); setSessione(null); setActiveIdx(null);
      showToast('✓ Sessione chiusa e salvata nello storico');
    } catch (err) {
      showToast('Errore salvataggio: ' + err.message, 'warn');
    }
  }

  async function annullaSessione() {
    await chiudiSessioneAttiva().catch(()=>{});
    setPhase('upload');
    setItems([]); setSessione(null); setActiveIdx(null);
  }

  const totAtt = items.reduce((a,i)=>a+i.stecche,0);
  const totRic = items.reduce((a,i)=>a+i.ricevuto,0);
  const completati = items.filter(i=>i.ricevuto===i.stecche).length;
  const progresso = totAtt>0 ? Math.min(100, Math.round(totRic/totAtt*100)) : 0;
  const activeItem = activeIdx !== null ? items[activeIdx] : null;

  // ── UPLOAD ─────────────────────────────────────────────────────────────────
  if (phase === 'upload') return (
    <>
      <UploadScreen
        onCaricato={onCaricato}
        catalogo={catalogo}
        onAzzeraCatalogo={()=>{ showToast('Gestisci i barcode dalla pagina Catalogo','info'); }}
      />
      {toast && <Toast toast={toast} />}
    </>
  );

  // ── RIEPILOGO ──────────────────────────────────────────────────────────────
  if (phase === 'summary') return (
    <div style={{ fontFamily:C.font, padding:'24px 20px', maxWidth:760, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <p style={{ fontSize:18, fontWeight:700 }}>Riepilogo ricevimento</p>
          <p style={{ fontSize:12, color:C.muted, marginTop:3 }}>Ordine {sessione?.numero} · {sessione?.data} · {sessione?.comune}</p>
        </div>
        <button style={S.btnSec} onClick={()=>setPhase('check')}>← Torna al controllo</button>
      </div>

      {/* Validazione */}
      {validazione && (
        <div style={{ ...S.validBox, ...(validazione.ok ? S.validOk : S.validErr) }}>
          {validazione.messaggio}
        </div>
      )}

      <div style={S.grid4}>
        {[['Stecche attese',totAtt,null],['Stecche ricevute',totRic,totRic===totAtt?C.green:C.red],
          ['Prodotti OK',`${completati}/${items.length}`,C.green],
          ['Discrepanze',items.filter(i=>i.ricevuto>0&&i.ricevuto!==i.stecche).length,null]
        ].map(([l,v,c])=>(
          <div key={l} style={S.card}><p style={{fontSize:11,color:C.muted,marginBottom:4}}>{l}</p><p style={{fontSize:22,fontWeight:700,...(c?{color:c}:{})}}>{v}</p></div>
        ))}
      </div>

      <table style={S.table}>
        <thead><tr>{['Cod.AAMS','Prodotto','Prezzo','Attese','Ricevute','Diff','Stato'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {items.map((item,i)=>{
            const diff=item.ricevuto-item.stecche;
            return (
              <tr key={i} style={diff!==0&&item.ricevuto>0?{background:'#FFFBF0'}:{}}>
                <td style={S.td}><code style={S.code}>{item.codAams}</code></td>
                <td style={S.td}>{item.descrizione}</td>
                <td style={S.td}>{item.prezzoConf?`€ ${item.prezzoConf.toFixed(2)}`:'—'}</td>
                <td style={{...S.td,textAlign:'center'}}>{item.stecche}</td>
                <td style={{...S.td,textAlign:'center'}}>{item.ricevuto}</td>
                <td style={{...S.td,textAlign:'center',fontWeight:600,color:diff===0?'#aaa':diff>0?C.green:C.red}}>{diff===0?'—':diff>0?`+${diff}`:diff}</td>
                <td style={S.td}><StatusBadge item={item} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <button style={S.btnPri} onClick={chiudiSessione}>✓ Chiudi e salva</button>
        <button style={S.btnSec} onClick={()=>{
          const lines=[`Ordine ${sessione?.numero} · ${sessione?.data}`,'','Cod.AAMS\tProdotto\tPrezzo\tAttese\tRicevute\tDiff',
            ...items.map(i=>`${i.codAams}\t${i.descrizione}\t${i.prezzoConf?`€${i.prezzoConf.toFixed(2)}`:''}\t${i.stecche}\t${i.ricevuto}\t${i.ricevuto-i.stecche}`)
          ].join('\n');
          navigator.clipboard.writeText(lines).then(()=>showToast('Riepilogo copiato'));
        }}>Copia riepilogo</button>
        <button style={{...S.btnSec,color:C.red,borderColor:'#F09595'}} onClick={annullaSessione}>Annulla sessione</button>
      </div>
      {toast && <Toast toast={toast} />}
    </div>
  );

  // ── CHECK ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:C.font, background:C.bg, minHeight:'100vh', paddingBottom:40 }}>
      {pendingEan && (
        <ModalAbbinamento ean={pendingEan} items={items} catalogo={catalogo}
          onConfirm={onAbbina}
          onSkip={()=>{ setPendingEan(null); showToast('Scansione ignorata','info'); setTimeout(()=>scanRef.current?.focus(),100); }} />
      )}

      {/* Header */}
      <div style={{ background:C.text, color:'#fff', padding:'10px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <span style={{ fontSize:14, fontWeight:600 }}>Ordine {sessione?.numero}</span>
          <span style={{ fontSize:12, color:'#AAA' }}> · {sessione?.data} · {sessione?.comune || 'Logista'}</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {validazione && !validazione.ok && (
            <span style={{ fontSize:11, background:'#8B3A0F', color:'#fff', padding:'3px 10px', borderRadius:20 }}>⚠ Verifica somme</span>
          )}
          <button style={S.hBtn} onClick={()=>setPhase('summary')}>Riepilogo →</button>
          <button style={{...S.hBtn, color:'#F09595', borderColor:'#555'}} onClick={annullaSessione}>✕</button>
        </div>
      </div>

      {/* Barra validazione */}
      {validazione && (
        <div style={{ ...S.valBar, ...(validazione.ok ? S.valBarOk : S.valBarErr) }}>
          {validazione.messaggio}
        </div>
      )}

      {/* Progress */}
      <div style={{ background:'#fff', borderBottom:`1px solid ${C.border}`, padding:'8px 20px', display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ flex:1, height:6, background:C.border, borderRadius:4, overflow:'hidden' }}>
          <div style={{ height:'100%', background:C.green, borderRadius:4, transition:'width .3s', width:`${progresso}%` }} />
        </div>
        <span style={{ fontSize:12, color:C.muted, whiteSpace:'nowrap' }}>{totRic}/{totAtt} stecche · {completati}/{items.length} prodotti</span>
      </div>

      <div style={{ display:'flex', maxHeight:'calc(100vh - 130px)', overflow:'hidden' }}>
        {/* Lista prodotti */}
        <div style={{ width:320, borderRight:`1px solid ${C.border}`, overflowY:'auto', background:'#fff', flexShrink:0 }}>
          {items.map((item,i)=>{
            const isActive=i===activeIdx, isDone=item.ricevuto===item.stecche, isOver=item.ricevuto>item.stecche;
            const hasEan=Object.values(catalogo).includes(item.codAams);
            return (
              <div key={i}
                style={{ padding:'10px 14px', borderBottom:`1px solid ${C.borderLight}`, cursor:'pointer',
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  ...(isActive?{background:'#FFF8F0',borderLeft:`3px solid ${C.red}`}:{}),
                  ...(isDone?{background:'#F0FAF3'}:{}),
                  ...(isOver?{background:'#FFF0F0'}:{}),
                }}
                onClick={()=>{ setActiveIdx(i); setTimeout(()=>scanRef.current?.focus(),50); }}>
                <div style={{ display:'flex', flexDirection:'column', gap:3, flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                    <code style={S.code}>{item.codAams}</code>
                    {hasEan && <span style={{ fontSize:8, color:C.green }}>●</span>}
                  </div>
                  <span style={{ fontSize:12, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.descrizione}</span>
                  {item.prezzoConf && <span style={{ fontSize:10, color:C.muted }}>€ {item.prezzoConf.toFixed(2)} · aggio € {(item.prezzoConf*0.1).toFixed(2)}</span>}
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, marginLeft:8 }}>
                  <span style={{ fontSize:16, fontWeight:700 }}>{item.ricevuto}<span style={{ fontSize:12, color:C.muted, fontWeight:400 }}>/{item.stecche}</span></span>
                  <StatusBadge item={item} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pannello scansione */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {activeItem ? (
            <>
              {/* Scheda prodotto */}
              <div style={S.card}>
                <p style={{ fontSize:10, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Prodotto</p>
                <p style={{ fontSize:17, fontWeight:700, marginBottom:10 }}>{activeItem.descrizione}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:4, fontSize:12, color:'#666', marginBottom:10 }}>
                  <span><b>Cod.AAMS:</b> {activeItem.codAams}</span>
                  <span><b>Attese:</b> {activeItem.stecche} stecche ({activeItem.pacchi} pacchetti)</span>
                  <span><b>Kgc fattura:</b> {activeItem.kgc.toFixed(3)}</span>
                  {activeItem.prezzoConf && <span><b>Prezzo:</b> € {activeItem.prezzoConf.toFixed(2)} · Aggio: € {(activeItem.prezzoConf*0.1).toFixed(2)}</span>}
                </div>
                {(()=>{
                  const eans=Object.entries(catalogo).filter(([,c])=>c===activeItem.codAams).map(([e])=>e);
                  return eans.length>0
                    ? <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', fontSize:11, marginBottom:8 }}>
                        <span style={{ color:C.muted }}>Barcode:</span>
                        {eans.map(e=><code key={e} style={{ background:'#EAF3DE', color:'#27500A', padding:'2px 8px', borderRadius:20 }}>{e}</code>)}
                      </div>
                    : <p style={{ fontSize:11, color:'#AAA', fontStyle:'italic', marginBottom:8 }}>Nessun barcode — scansiona la prima stecca per abbinarlo</p>;
                })()}
                <div style={{ height:8, background:C.borderLight, borderRadius:4, overflow:'hidden', marginBottom:6 }}>
                  <div style={{ height:'100%', borderRadius:4, transition:'width .3s', width:`${Math.min(100,activeItem.ricevuto/activeItem.stecche*100)}%`, background:activeItem.ricevuto>activeItem.stecche?C.red:C.green }} />
                </div>
                <p style={{ fontSize:13, fontWeight:600 }}>{activeItem.ricevuto} / {activeItem.stecche} stecche</p>
              </div>

              {/* Barcode */}
              <div style={S.card}>
                <p style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>🔫 Scansiona stecca</p>
                <input ref={scanRef} style={S.scanInput} value={scanInput}
                  onChange={e=>setScanInput(e.target.value)} onKeyDown={handleScan}
                  placeholder="Scansiona o digita codice + Invio" autoComplete="off" />
                <p style={{ fontSize:11, color:C.muted, marginTop:6 }}>
                  {Object.values(catalogo).includes(activeItem.codAams) ? '✓ Riconosciuto automaticamente' : 'Prima scansione → abbinamento guidato'}
                </p>
              </div>

              {/* Manuale */}
              <div style={S.card}>
                <p style={{ fontSize:12, fontWeight:600, marginBottom:10 }}>Inserimento manuale</p>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <button style={S.qtyBtn} onClick={()=>{ registra(activeIdx,-1,'rimosso'); }}>−</button>
                  <input type="number" style={S.qtyInput} value={manualQty} onChange={e=>setManualQty(e.target.value)}
                    placeholder="0" onKeyDown={e=>e.key==='Enter'&&aggiungiManuale()} />
                  <button style={S.qtyBtn} onClick={()=>setManualQty(q=>(parseInt(q)||0)+1)}>+</button>
                  <span style={{ fontSize:12, color:C.muted }}>stecche</span>
                  <button style={{ ...S.btnPri, marginLeft:'auto', padding:'8px 18px' }} onClick={aggiungiManuale}>Aggiungi</button>
                </div>
                <p style={{ fontSize:11, color:C.muted, marginTop:8 }}>Numero negativo per rimuovere · tasto − rimuove 1 stecca</p>
              </div>

              {/* Storico */}
              {activeItem.scansioni.length>0 && (
                <div style={S.card}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <p style={{ fontSize:12, fontWeight:600 }}>Scansioni ({activeItem.scansioni.length})</p>
                    <button style={{ fontSize:11, color:C.red, background:'none', border:'none', cursor:'pointer', fontFamily:C.font }}
                      onClick={()=>setItems(prev=>prev.map((item,i)=>i===activeIdx?{...item,ricevuto:0,scansioni:[]}:item))}>Reset</button>
                  </div>
                  {activeItem.scansioni.map((sc,j)=>(
                    <div key={j} style={{ display:'flex', gap:12, fontSize:12, padding:'4px 0', borderBottom:`1px solid ${C.borderLight}` }}>
                      <span style={{ color:'#AAA' }}>{sc.ts}</span>
                      <span style={{ color:sc.qty<0?C.red:C.green, fontWeight:500 }}>{sc.qty>0?'+':''}{sc.qty}</span>
                      <code style={{ color:'#AAA', fontSize:11 }}>{sc.barcode}</code>
                    </div>
                  ))}
                </div>
              )}

              {/* Nav */}
              <div style={{ display:'flex', gap:8 }}>
                <button style={{...S.btnSec,flex:1}} disabled={activeIdx===0}
                  onClick={()=>{ setActiveIdx(i=>i-1); setTimeout(()=>scanRef.current?.focus(),50); }}>← Prec.</button>
                <button style={{...S.btnSec,flex:1}} disabled={activeIdx===items.length-1}
                  onClick={()=>{ setActiveIdx(i=>i+1); setTimeout(()=>scanRef.current?.focus(),50); }}>Succ. →</button>
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
  const bg = toast.tipo==='warn'?'#8B3A0F':toast.tipo==='info'?'#0C447C':'#1a6b2e';
  return <div style={{ position:'fixed', top:70, right:20, background:bg, color:'#fff', padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:500, boxShadow:'0 4px 16px rgba(0,0,0,0.15)', zIndex:999 }}>{toast.msg}</div>;
}

// ── Design tokens ─────────────────────────────────────────────────────────────
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
  table:{ width:'100%', borderCollapse:'collapse', background:C.white, borderRadius:8, overflow:'hidden', border:`1px solid ${C.border}`, marginBottom:16 },
  th:{ padding:'9px 12px', fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:`1px solid ${C.border}`, textAlign:'left', background:'#FAFAF8' },
  td:{ padding:'10px 12px', fontSize:13, borderBottom:`1px solid ${C.borderLight}` },
  grid4:{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 },
  validBox:{ padding:'10px 16px', borderRadius:8, fontSize:13, marginBottom:16, fontWeight:500 },
  validOk:{ background:'#D4EDDA', color:C.green },
  validErr:{ background:'#FDECEA', color:C.red },
  valBar:{ padding:'8px 20px', fontSize:12, fontWeight:500 },
  valBarOk:{ background:'#D4EDDA', color:C.green },
  valBarErr:{ background:'#FDECEA', color:C.red },
};

const U = {
  root:{ fontFamily:C.font, background:C.bg, minHeight:'100vh' },
  wrap:{ maxWidth:480, margin:'0 auto', padding:'60px 24px 40px' },
  logo:{ display:'flex', alignItems:'center', gap:8, marginBottom:8 },
  logoL:{ background:C.red, color:'#fff', fontWeight:700, fontSize:22, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:4 },
  drop:{ border:'2px dashed #C8C4BA', borderRadius:10, padding:'36px 24px', textAlign:'center', cursor:'pointer', background:C.white, transition:'all .15s', marginBottom:12 },
  dropActive:{ borderColor:C.red, background:'#FFF5F5' },
  msg:{ padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:12 },
  msgErr:{ background:'#FDECEA', color:C.red },
  msgOk:{ background:'#D4EDDA', color:C.green },
  msgInfo:{ background:'#E6F1FB', color:'#0C447C' },
  textarea:{ width:'100%', padding:'10px 12px', fontSize:13, border:`1.5px solid ${C.border}`, borderRadius:8, fontFamily:C.font, outline:'none', marginBottom:8, boxSizing:'border-box', resize:'vertical' },
  btnPri:{ padding:'10px 20px', background:C.text, color:'#fff', border:'none', borderRadius:7, fontSize:13, cursor:'pointer', fontFamily:C.font, fontWeight:600 },
  btnSec:{ padding:'9px 16px', background:'none', border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, cursor:'pointer', fontFamily:C.font, color:C.muted },
  catBanner:{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#EAF3DE', border:'1px solid #97C459', borderRadius:8, padding:'10px 14px', marginTop:14, fontSize:12, color:'#27500A' },
};

const M = {
  overlay:{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 },
  box:{ background:C.white, borderRadius:12, padding:24, width:'100%', maxWidth:520, maxHeight:'85vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' },
  eanBadge:{ background:'#FFF3CD', color:'#7B4F00', padding:'4px 12px', borderRadius:20, fontSize:13, fontWeight:600 },
  label:{ fontSize:12, fontWeight:600, color:C.text, marginBottom:8 },
  input:{ width:'100%', padding:'10px 12px', fontSize:14, border:`2px solid ${C.text}`, borderRadius:7, fontFamily:C.font, outline:'none', boxSizing:'border-box' },
  dropdown:{ position:'absolute', top:'100%', left:0, right:0, background:C.white, border:`1px solid ${C.border}`, borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:10, maxHeight:260, overflowY:'auto' },
  dropItem:{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', cursor:'pointer', fontSize:13 },
  dropItemSel:{ background:'#EAF3DE' },
  prodCard:{ background:'#F8FAF5', border:'1px solid #97C459', borderRadius:8, padding:'12px 14px', marginBottom:4 },
  btnPri:{ padding:'9px 20px', background:C.text, color:'#fff', border:'none', borderRadius:7, fontSize:13, cursor:'pointer', fontFamily:C.font, fontWeight:600 },
  btnSec:{ padding:'9px 16px', background:'none', border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, cursor:'pointer', fontFamily:C.font, color:C.muted },
};

const B = {
  ok:{ background:'#D4EDDA', color:C.green, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 },
  pending:{ background:C.borderLight, color:C.muted, padding:'2px 8px', borderRadius:20, fontSize:11 },
  partial:{ background:'#FFF3CD', color:'#7B4F00', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 },
  over:{ background:'#FDECEA', color:C.red, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 },
};
