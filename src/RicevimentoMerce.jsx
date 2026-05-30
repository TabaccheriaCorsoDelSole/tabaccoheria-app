import { useState, useRef, useEffect } from "react";
import { CATALOGO_ADM, PRODOTTO_BY_AAMS } from "./catalogoADM";

const KGC_PER_STECCA = 0.200;
const PACKS_PER_STECCA = 10;

// ── Storage helpers ──────────────────────────────────────────────────────────
function loadLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseLogistaPDF(text) {
  const rows = [];
  // Pattern: riga cod descrizione kgc — handles both "0,600" and "0.600"
  const re = /^\s*(\d+)\s+(\d+)\s+(.+?)\s+([\d][,.][\d]{3})\s*$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const kgc = parseFloat(m[4].replace(",", "."));
    const stecche = Math.round(kgc / KGC_PER_STECCA);
    const adm = PRODOTTO_BY_AAMS[m[2]];
    rows.push({
      riga: parseInt(m[1]),
      codAams: m[2],
      descrizione: adm ? adm.nome : m[3].trim(),
      confezione: adm?.confezione || "astuccio",
      pezzi: adm?.pezzi || 20,
      prezzoConf: adm?.prezzoConf || null,
      kgcPerStecca: adm?.kgcPerStecca || KGC_PER_STECCA,
      kgc,
      stecche,
      pacchi: stecche * PACKS_PER_STECCA,
      ricevuto: 0,
      scansioni: [],
    });
  }
  return rows;
}

const DEMO_ITEMS = [
  { riga:1, codAams:"630",   descrizione:"DIANA BLU KS",        confezione:"astuccio", pezzi:20, prezzoConf:5.20, kgcPerStecca:0.200, kgc:0.6,  stecche:3,  pacchi:30,  ricevuto:0, scansioni:[] },
  { riga:2, codAams:"233",   descrizione:"DIANA ROSSA KS",       confezione:"astuccio", pezzi:20, prezzoConf:5.20, kgcPerStecca:0.200, kgc:0.6,  stecche:3,  pacchi:30,  ricevuto:0, scansioni:[] },
  { riga:3, codAams:"1313",  descrizione:"L&M RED LABEL KS",     confezione:"astuccio", pezzi:20, prezzoConf:5.30, kgcPerStecca:0.200, kgc:2.0,  stecche:10, pacchi:100, ricevuto:0, scansioni:[] },
  { riga:4, codAams:"9",     descrizione:"MARLBORO GOLD KS",     confezione:"astuccio", pezzi:20, prezzoConf:5.40, kgcPerStecca:0.200, kgc:2.0,  stecche:10, pacchi:100, ricevuto:0, scansioni:[] },
  { riga:5, codAams:"395",   descrizione:"MARLBORO KS",          confezione:"astuccio", pezzi:20, prezzoConf:5.50, kgcPerStecca:0.200, kgc:2.0,  stecche:10, pacchi:100, ricevuto:0, scansioni:[] },
  { riga:6, codAams:"3840",  descrizione:"WEST ORIGINAL 100S",   confezione:"astuccio", pezzi:20, prezzoConf:5.20, kgcPerStecca:0.200, kgc:2.0,  stecche:10, pacchi:100, ricevuto:0, scansioni:[] },
  { riga:7, codAams:"21232", descrizione:"DELIA CLASSIC GREEN",  confezione:"astuccio", pezzi:20, prezzoConf:5.00, kgcPerStecca:0.200, kgc:2.0,  stecche:10, pacchi:100, ricevuto:0, scansioni:[] },
  { riga:8, codAams:"21109", descrizione:"DELIA CLASSIC RED",    confezione:"astuccio", pezzi:20, prezzoConf:5.00, kgcPerStecca:0.200, kgc:2.0,  stecche:10, pacchi:100, ricevuto:0, scansioni:[] },
];

function StatusBadge({ item }) {
  if (item.ricevuto === 0) return <span style={st.badge.pending}>In attesa</span>;
  if (item.ricevuto === item.stecche) return <span style={st.badge.ok}>✓ OK</span>;
  if (item.ricevuto > item.stecche) return <span style={st.badge.over}>+{item.ricevuto - item.stecche} eccesso</span>;
  return <span style={st.badge.partial}>{item.ricevuto}/{item.stecche}</span>;
}

// ── Modal abbinamento ────────────────────────────────────────────────────────
function ModalAbbinamento({ ean, items, onConfirm, onSkip }) {
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState("");
  const filtered = items.filter(i => !q || i.descrizione.toLowerCase().includes(q.toLowerCase()) || i.codAams.includes(q));

  return (
    <div style={st.overlay}>
      <div style={st.modal}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <p style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:3 }}>Nuovo barcode rilevato</p>
            <p style={{ fontSize:12, color:C.muted }}>Prima scansione — abbina a un prodotto in fattura</p>
          </div>
          <code style={st.eanBadge}>{ean}</code>
        </div>
        <input style={st.modalSearch} placeholder="Cerca prodotto..." value={q} onChange={e=>setQ(e.target.value)} autoFocus />
        <div style={{ maxHeight:260, overflowY:"auto", display:"flex", flexDirection:"column", gap:4, marginBottom:14 }}>
          {filtered.map((item,i) => (
            <div key={i} style={{ ...st.modalItem, ...(sel===item.codAams ? st.modalItemSel : {}) }} onClick={()=>setSel(item.codAams)}>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <code style={st.smallCode}>{item.codAams}</code>
                <span style={{ fontSize:13, fontWeight:500 }}>{item.descrizione}</span>
                {item.prezzoConf && <span style={{ fontSize:11, color:C.muted }}>€ {item.prezzoConf.toFixed(2)} / conf.</span>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:12, color:C.muted }}>{item.stecche} stecche</span>
                {sel===item.codAams && <span style={{ color:C.green, fontWeight:700 }}>✓</span>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button style={st.btnSecondary} onClick={onSkip}>Salta</button>
          <button style={{ ...st.btnPrimary, ...(sel?{}:{background:"#CCC", cursor:"not-allowed"}) }} disabled={!sel} onClick={()=>sel&&onConfirm(ean,sel)}>
            Abbina e registra stecca
          </button>
        </div>
        <p style={{ fontSize:11, color:C.muted, textAlign:"center", marginTop:12 }}>
          💾 Abbinamento salvato permanentemente
        </p>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function RicevimentoMerce({ onOpenStorico }) {
  const [phase, setPhase] = useState("upload");
  const [items, setItems] = useState([]);
  const [sessione, setSessione] = useState(null); // { numero, data, fornitore }
  const [activeIdx, setActiveIdx] = useState(null);
  const [scanInput, setScanInput] = useState("");
  const [manualQty, setManualQty] = useState("");
  const [toast, setToast] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingEan, setPendingEan] = useState(null);
  const [catalogo, setCatalogo] = useState(() => loadLS("catalogo_barcode", {}));
  const [sessActivaAlert, setSessioneActivaAlert] = useState(false);

  const scanRef = useRef(null);
  const fileRef = useRef(null);

  // Check sessione attiva al mount
  useEffect(() => {
    const saved = loadLS("sessione_attiva", null);
    if (saved) {
      setItems(saved.items);
      setSessione(saved.info);
      setPhase("check");
      setActiveIdx(saved.activeIdx || 0);
    }
  }, []);

  useEffect(() => {
    if (phase === "check" && activeIdx !== null) {
      setTimeout(() => scanRef.current?.focus(), 80);
    }
  }, [phase, activeIdx]);

  // Salva sessione attiva ad ogni cambio
  useEffect(() => {
    if (phase === "check" && sessione) {
      saveLS("sessione_attiva", { items, info: sessione, activeIdx });
    }
  }, [items, phase, sessione, activeIdx]);

  function showToast(msg, type="ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  function saveCatalogo(c) { setCatalogo(c); saveLS("catalogo_barcode", c); }

  function avviaSessione(parsedItems, info) {
    setItems(parsedItems);
    setSessione(info);
    setPhase("check");
    setActiveIdx(0);
  }

  function loadDemo() {
    avviaSessione(DEMO_ITEMS.map(i=>({...i, ricevuto:0, scansioni:[]})),
      { numero:"377902938", data:"29.05.2026", fornitore:"Logista", rivendita:"0017" });
  }

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      const parsed = parseLogistaPDF(text);
      if (parsed.length > 0) {
        // Extract order info from text
        const numOrdine = (text.match(/[Nn]umero\s+ordine\s+(\d+)/)||[])[1] || "—";
        const dataConsegna = (text.match(/[Dd]ata\s+[Cc]onsegna\s+([\d.]+)/)||[])[1] || "—";
        avviaSessione(parsed, { numero: numOrdine, data: dataConsegna, fornitore:"Logista", rivendita:"—" });
      } else {
        showToast("Nessun prodotto trovato nel file — prova con l'esempio", "warn");
      }
    };
    reader.onerror = () => showToast("Errore lettura file", "warn");
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  // ── Scansione ──────────────────────────────────────────────────────────────
  function handleScan(e) {
    if (e.key !== "Enter" || !scanInput.trim()) return;
    const ean = scanInput.trim();
    setScanInput("");

    if (catalogo[ean]) {
      const idx = items.findIndex(i => i.codAams === catalogo[ean]);
      if (idx !== -1) { registra(idx, 1, ean); setActiveIdx(idx); return; }
    }
    const directIdx = items.findIndex(i => i.codAams === ean);
    if (directIdx !== -1) { registra(directIdx, 1, ean); setActiveIdx(directIdx); return; }
    setPendingEan(ean);
  }

  function onAbbina(ean, codAams) {
    const nc = { ...catalogo, [ean]: codAams };
    saveCatalogo(nc);
    setPendingEan(null);
    const idx = items.findIndex(i => i.codAams === codAams);
    if (idx !== -1) { registra(idx, 1, ean); setActiveIdx(idx); }
    showToast(`✓ Abbinato: ${items.find(i=>i.codAams===codAams)?.descrizione}`, "ok");
    setTimeout(() => scanRef.current?.focus(), 100);
  }

  function registra(idx, qty, barcode="manuale") {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const n = item.ricevuto + qty;
      const sc = [...item.scansioni, { qty, barcode, ts: new Date().toLocaleTimeString("it-IT") }];
      if (n === item.stecche) showToast(`✓ ${item.descrizione} — completato!`);
      else if (n > item.stecche) showToast(`⚠ ${item.descrizione} — eccesso +${n-item.stecche}`, "warn");
      else showToast(`${item.descrizione}: ${n}/${item.stecche}`, "info");
      return { ...item, ricevuto: n, scansioni: sc };
    }));
  }

  function rimuovi(idx, qty=1) {
    setItems(prev => prev.map((item,i) => {
      if (i !== idx) return item;
      const n = item.ricevuto - qty;
      const sc = [...item.scansioni, { qty: -qty, barcode:"rimosso", ts: new Date().toLocaleTimeString("it-IT") }];
      showToast(`${item.descrizione}: rimossa 1 stecca (${n}/${item.stecche})`, "info");
      return { ...item, ricevuto: n, scansioni: sc };
    }));
  }

  function aggiungiManuale() {
    const q = parseInt(manualQty);
    if (!q || isNaN(q) || activeIdx === null) return;
    if (q < 0) rimuovi(activeIdx, Math.abs(q));
    else registra(activeIdx, q);
    setManualQty("");
  }

  function chiudiSessione() {
    // Salva nello storico
    const storico = loadLS("storico_ordini", []);
    const nuovoOrdine = {
      id: Date.now(),
      ...sessione,
      chiusoIl: new Date().toLocaleString("it-IT"),
      items: items.map(i => ({ ...i })),
      totaleAtteso: items.reduce((a,i)=>a+i.stecche,0),
      totaleRicevuto: items.reduce((a,i)=>a+i.ricevuto,0),
      discrepanze: items.filter(i=>i.ricevuto>0&&i.ricevuto!==i.stecche).length,
    };
    saveLS("storico_ordini", [nuovoOrdine, ...storico]);
    saveLS("sessione_attiva", null);
    setPhase("upload");
    setItems([]);
    setSessione(null);
    setActiveIdx(null);
    showToast("✓ Sessione chiusa e salvata nello storico");
  }

  function annullaSessione() {
    saveLS("sessione_attiva", null);
    setPhase("upload");
    setItems([]);
    setSessione(null);
    setActiveIdx(null);
  }

  const totAtt = items.reduce((a,i)=>a+i.stecche,0);
  const totRic = items.reduce((a,i)=>a+i.ricevuto,0);
  const completati = items.filter(i=>i.ricevuto===i.stecche).length;
  const discrepanze = items.filter(i=>i.ricevuto>0&&i.ricevuto!==i.stecche).length;
  const progresso = totAtt>0 ? Math.min(100, Math.round(totRic/totAtt*100)) : 0;
  const catCount = Object.keys(catalogo).length;
  const activeItem = activeIdx !== null ? items[activeIdx] : null;

  // ── UPLOAD ─────────────────────────────────────────────────────────────────
  if (phase === "upload") return (
    <div style={st.root}>
      <div style={st.uploadWrap}>
        <div style={st.logo}>
          <span style={st.logoL}>L</span>
          <span style={{ fontSize:16, fontWeight:600, color:C.text }}>ogista · Ricevimento Merce</span>
        </div>
        <p style={{ fontSize:13, color:C.muted, marginBottom:28 }}>Carica il PDF dell'ordine Logista per iniziare</p>

        <div style={{ ...st.dropzone, ...(dragOver?st.dropzoneActive:{}) }}
          onDragOver={e=>{e.preventDefault();setDragOver(true);}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={handleDrop}
          onClick={()=>fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".pdf,.txt" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])} />
          <div style={{ fontSize:36, marginBottom:10 }}>📄</div>
          <p style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Trascina il PDF Logista qui</p>
          <p style={{ fontSize:12, color:C.muted }}>oppure clicca per selezionare</p>
        </div>

        <div style={{ textAlign:"center", color:"#CCC", fontSize:12, margin:"20px 0", borderTop:`1px solid ${C.border}`, paddingTop:12 }}>oppure</div>

        <button style={{ ...st.btnPrimary, width:"100%" }} onClick={loadDemo}>
          Carica ordine di esempio (377902938 · 29.05.2026)
        </button>

        {catCount > 0 && (
          <div style={st.catalogoBanner}>
            <span>📦 {catCount} barcode nel catalogo</span>
            <button style={{ background:"none", border:"none", color:C.red, fontSize:11, cursor:"pointer", fontFamily:C.font }} onClick={()=>{saveCatalogo({});showToast("Catalogo azzerato","warn");}}>Azzera</button>
          </div>
        )}
        <p style={{ fontSize:11, color:"#AAA", textAlign:"center", marginTop:16, lineHeight:1.6 }}>
          Lettura automatica codici AAMS · {CATALOGO_ADM.length} prodotti nel catalogo ADM
        </p>
      </div>
      {toast && <Toast toast={toast} />}
    </div>
  );

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  if (phase === "summary") return (
    <div style={st.root}>
      <div style={st.summaryWrap}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:10 }}>
          <div>
            <p style={{ fontSize:18, fontWeight:700, color:C.text }}>Riepilogo ricevimento</p>
            <p style={{ fontSize:12, color:C.muted, marginTop:3 }}>Ordine {sessione?.numero} · {sessione?.data}</p>
          </div>
          <button style={st.btnSecondary} onClick={()=>setPhase("check")}>← Torna al controllo</button>
        </div>

        <div style={st.summaryGrid}>
          {[["Stecche attese",totAtt,null],["Stecche ricevute",totRic,totRic===totAtt?C.green:C.red],
            ["Prodotti OK",`${completati}/${items.length}`,C.green],["Discrepanze",discrepanze,discrepanze>0?C.red:C.green]
          ].map(([l,v,c])=>(
            <div key={l} style={st.summaryCard}><p style={{fontSize:11,color:C.muted,marginBottom:4}}>{l}</p><p style={{fontSize:22,fontWeight:700,...(c?{color:c}:{})}}>{v}</p></div>
          ))}
        </div>

        <table style={st.table}>
          <thead><tr>{["Cod.AAMS","Prodotto","Prezzo","Attese","Ricevute","Diff","Stato"].map(h=><th key={h} style={st.th}>{h}</th>)}</tr></thead>
          <tbody>
            {items.map((item,i)=>{
              const diff = item.ricevuto - item.stecche;
              return (
                <tr key={i} style={item.ricevuto!==item.stecche&&item.ricevuto>0?{background:"#FFFBF0"}:{}}>
                  <td style={st.td}><code style={st.smallCode}>{item.codAams}</code></td>
                  <td style={st.td}>{item.descrizione}</td>
                  <td style={st.td}>{item.prezzoConf ? `€ ${item.prezzoConf.toFixed(2)}` : "—"}</td>
                  <td style={{...st.td,textAlign:"center"}}>{item.stecche}</td>
                  <td style={{...st.td,textAlign:"center"}}>{item.ricevuto}</td>
                  <td style={{...st.td,textAlign:"center",fontWeight:600,color:diff===0?"#aaa":diff>0?C.green:C.red}}>{diff===0?"—":diff>0?`+${diff}`:diff}</td>
                  <td style={st.td}><StatusBadge item={item} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button style={st.btnPrimary} onClick={chiudiSessione}>✓ Chiudi e salva sessione</button>
          <button style={st.btnSecondary} onClick={()=>{
            const lines = [`Riepilogo · Ordine ${sessione?.numero} · ${sessione?.data}`,"",
              "Cod.AAMS\tProdotto\tPrezzo\tAttese\tRicevute\tDiff",
              ...items.map(i=>`${i.codAams}\t${i.descrizione}\t${i.prezzoConf?`€${i.prezzoConf.toFixed(2)}`:""}\t${i.stecche}\t${i.ricevuto}\t${i.ricevuto-i.stecche}`)
            ].join("\n");
            navigator.clipboard.writeText(lines).then(()=>showToast("Riepilogo copiato"));
          }}>Copia riepilogo</button>
          <button style={{ ...st.btnSecondary, color:C.red, borderColor:"#F09595" }} onClick={annullaSessione}>Annulla sessione</button>
        </div>
      </div>
      {toast && <Toast toast={toast} />}
    </div>
  );

  // ── CHECK ──────────────────────────────────────────────────────────────────
  return (
    <div style={st.root}>
      {pendingEan && <ModalAbbinamento ean={pendingEan} items={items} onConfirm={onAbbina} onSkip={()=>{setPendingEan(null);showToast("Scansione ignorata","info");setTimeout(()=>scanRef.current?.focus(),100);}} />}

      {/* Header */}
      <div style={st.header}>
        <div>
          <span style={{ fontSize:14, fontWeight:600, color:"#fff" }}>Ordine {sessione?.numero}</span>
          <span style={{ fontSize:12, color:"#AAA" }}> · {sessione?.data} · Logista</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {catCount>0 && <span style={{ fontSize:11, color:"#AAA", background:"rgba(255,255,255,0.1)", padding:"3px 10px", borderRadius:20 }}>📦 {catCount}</span>}
          <button style={st.headerBtn} onClick={()=>setPhase("summary")}>Riepilogo →</button>
          <button style={{ ...st.headerBtn, color:"#F09595", borderColor:"#F09595" }} onClick={annullaSessione}>✕</button>
        </div>
      </div>

      {/* Progress */}
      <div style={st.progressWrap}>
        <div style={st.progressTrack}><div style={{ ...st.progressFill, width:`${progresso}%` }} /></div>
        <span style={{ fontSize:12, color:C.muted, whiteSpace:"nowrap" }}>{totRic}/{totAtt} stecche · {completati}/{items.length} prodotti</span>
      </div>

      <div style={st.layout}>
        {/* Lista */}
        <div style={st.listCol}>
          {items.map((item,i)=>{
            const isActive=i===activeIdx, isDone=item.ricevuto===item.stecche, isOver=item.ricevuto>item.stecche;
            const hasEan=Object.values(catalogo).includes(item.codAams);
            return (
              <div key={i} style={{ ...st.listItem, ...(isActive?st.listItemActive:{}), ...(isDone?{background:"#F0FAF3"}:{}), ...(isOver?{background:"#FFF0F0"}:{}) }}
                onClick={()=>{ setActiveIdx(i); setTimeout(()=>scanRef.current?.focus(),50); }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3, flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                    <code style={st.smallCode}>{item.codAams}</code>
                    {hasEan && <span style={{ fontSize:8, color:C.green }} title="Barcode abbinato">●</span>}
                  </div>
                  <span style={{ fontSize:12, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.descrizione}</span>
                  {item.prezzoConf && <span style={{ fontSize:10, color:C.muted }}>€ {item.prezzoConf.toFixed(2)}</span>}
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, marginLeft:8 }}>
                  <span style={{ fontSize:16, fontWeight:700 }}>{item.ricevuto}<span style={{ fontSize:12, color:C.muted, fontWeight:400 }}>/{item.stecche}</span></span>
                  <StatusBadge item={item} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pannello */}
        <div style={st.scanCol}>
          {activeItem ? (
            <>
              {/* Scheda prodotto */}
              <div style={st.card}>
                <p style={{ fontSize:10, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Prodotto selezionato</p>
                <p style={{ fontSize:17, fontWeight:700, marginBottom:10, lineHeight:1.3 }}>{activeItem.descrizione}</p>
                <div style={{ display:"flex", flexDirection:"column", gap:4, fontSize:12, color:"#666", marginBottom:12 }}>
                  <span><b>Cod.AAMS:</b> {activeItem.codAams}</span>
                  <span><b>Attese:</b> {activeItem.stecche} stecche ({activeItem.pacchi} pacchetti)</span>
                  <span><b>Kgc fattura:</b> {activeItem.kgc.toFixed(3)}</span>
                  {activeItem.prezzoConf && <span><b>Prezzo conf.:</b> € {activeItem.prezzoConf.toFixed(2)} · Aggio: € {(activeItem.prezzoConf*0.1).toFixed(2)}</span>}
                </div>

                {/* Barcode abbinati */}
                {(()=>{
                  const eans = Object.entries(catalogo).filter(([,c])=>c===activeItem.codAams).map(([e])=>e);
                  return eans.length>0
                    ? <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:10, fontSize:11 }}>
                        <span style={{ color:C.muted }}>Barcode:</span>
                        {eans.map(e=><code key={e} style={{ background:"#EAF3DE", color:"#27500A", padding:"2px 8px", borderRadius:20, fontSize:11 }}>{e}</code>)}
                      </div>
                    : <div style={{ fontSize:11, color:"#AAA", fontStyle:"italic", marginBottom:10 }}>Nessun barcode abbinato — scansiona la prima stecca</div>;
                })()}

                {/* Progress bar prodotto */}
                <div style={{ height:8, background:C.borderLight, borderRadius:4, overflow:"hidden", marginBottom:6 }}>
                  <div style={{ height:"100%", borderRadius:4, transition:"width .3s, background .3s", width:`${Math.min(100,activeItem.ricevuto/activeItem.stecche*100)}%`, background: activeItem.ricevuto>activeItem.stecche?C.red:C.green }} />
                </div>
                <p style={{ fontSize:13, fontWeight:600 }}>{activeItem.ricevuto} / {activeItem.stecche} stecche ricevute</p>
              </div>

              {/* Scansione barcode */}
              <div style={st.card}>
                <p style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>🔫 Scansiona stecca</p>
                <input ref={scanRef} style={st.scanInput} value={scanInput}
                  onChange={e=>setScanInput(e.target.value)} onKeyDown={handleScan}
                  placeholder="Scansiona o digita codice + Invio" autoComplete="off" />
                <p style={{ fontSize:11, color:C.muted, marginTop:6 }}>
                  {Object.values(catalogo).includes(activeItem.codAams) ? "✓ Prodotto già riconosciuto automaticamente" : "Prima scansione → abbinamento guidato"}
                </p>
              </div>

              {/* Inserimento manuale con − e + e campo numerico */}
              <div style={st.card}>
                <p style={{ fontSize:12, fontWeight:600, marginBottom:10 }}>Inserimento manuale</p>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <button style={st.qtyBtn} onClick={()=>rimuovi(activeIdx, 1)}>−</button>
                  <input
                    type="number"
                    style={{ width:70, padding:"7px 10px", fontSize:16, fontWeight:700, border:`2px solid ${C.border}`, borderRadius:7, fontFamily:C.font, textAlign:"center", outline:"none" }}
                    value={manualQty}
                    onChange={e=>setManualQty(e.target.value)}
                    placeholder="0"
                    onKeyDown={e=>e.key==="Enter"&&aggiungiManuale()}
                  />
                  <button style={st.qtyBtn} onClick={()=>setManualQty(q=>(parseInt(q)||0)+1)}>+</button>
                  <span style={{ fontSize:12, color:C.muted }}>stecche</span>
                  <button style={{ ...st.btnPrimary, marginLeft:"auto", padding:"8px 18px" }} onClick={aggiungiManuale}>
                    Aggiungi
                  </button>
                </div>
                <p style={{ fontSize:11, color:C.muted, marginTop:8 }}>Scrivi un numero negativo (es. -2) per rimuovere stecche in eccesso · Premi Invio</p>
              </div>

              {/* Storico scansioni */}
              {activeItem.scansioni.length>0 && (
                <div style={st.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <p style={{ fontSize:12, fontWeight:600 }}>Scansioni ({activeItem.scansioni.length})</p>
                    <button style={{ fontSize:11, color:C.red, background:"none", border:"none", cursor:"pointer", fontFamily:C.font }}
                      onClick={()=>setItems(prev=>prev.map((item,i)=>i===activeIdx?{...item,ricevuto:0,scansioni:[]}:item))}>
                      Reset
                    </button>
                  </div>
                  {activeItem.scansioni.map((s,j)=>(
                    <div key={j} style={{ display:"flex", gap:12, fontSize:12, color:"#666", padding:"4px 0", borderBottom:`1px solid ${C.borderLight}` }}>
                      <span style={{ color:"#AAA" }}>{s.ts}</span>
                      <span style={{ color:s.qty<0?C.red:C.green, fontWeight:500 }}>{s.qty>0?"+":""}{s.qty} stecche</span>
                      <code style={{ color:"#AAA", fontSize:11 }}>{s.barcode}</code>
                    </div>
                  ))}
                </div>
              )}

              {/* Navigazione */}
              <div style={{ display:"flex", gap:8 }}>
                <button style={{ ...st.btnSecondary, flex:1 }} disabled={activeIdx===0}
                  onClick={()=>{ setActiveIdx(i=>i-1); setTimeout(()=>scanRef.current?.focus(),50); }}>← Precedente</button>
                <button style={{ ...st.btnSecondary, flex:1 }} disabled={activeIdx===items.length-1}
                  onClick={()=>{ setActiveIdx(i=>i+1); setTimeout(()=>scanRef.current?.focus(),50); }}>Successivo →</button>
              </div>
            </>
          ) : (
            <p style={{ color:C.muted, fontSize:14 }}>Seleziona un prodotto dalla lista</p>
          )}
        </div>
      </div>

      {toast && <Toast toast={toast} />}
    </div>
  );
}

function Toast({ toast }) {
  return (
    <div style={{ position:"fixed", top:70, right:20, background: toast.type==="warn"?"#8B3A0F":toast.type==="info"?"#0C447C":"#1a6b2e", color:"#fff", padding:"10px 18px", borderRadius:8, fontSize:13, fontWeight:500, boxShadow:"0 4px 16px rgba(0,0,0,0.15)", zIndex:999 }}>
      {toast.msg}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const C = {
  font:"'IBM Plex Mono', monospace", bg:"#F7F5F0", white:"#fff",
  border:"#E8E4DC", borderLight:"#F0EDE6", text:"#1a1a1a",
  muted:"#888", red:"#C41E1E", green:"#1a6b2e", blue:"#0C447C",
};
const st = {
  root:{ fontFamily:C.font, background:C.bg, minHeight:"100vh", paddingBottom:40 },
  uploadWrap:{ maxWidth:480, margin:"0 auto", padding:"60px 24px 40px" },
  logo:{ display:"flex", alignItems:"center", gap:8, marginBottom:8 },
  logoL:{ background:C.red, color:"#fff", fontWeight:700, fontSize:22, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:4 },
  dropzone:{ border:"2px dashed #C8C4BA", borderRadius:10, padding:"36px 24px", textAlign:"center", cursor:"pointer", background:C.white, transition:"all .15s" },
  dropzoneActive:{ borderColor:C.red, background:"#FFF5F5" },
  catalogoBanner:{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#EAF3DE", border:"1px solid #97C459", borderRadius:8, padding:"10px 14px", marginTop:14, fontSize:12, color:"#27500A" },
  header:{ background:C.text, color:"#fff", padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  headerBtn:{ background:"transparent", border:"1px solid #555", color:"#ddd", padding:"5px 14px", borderRadius:6, fontSize:12, cursor:"pointer", fontFamily:C.font },
  progressWrap:{ background:C.white, borderBottom:`1px solid ${C.border}`, padding:"10px 20px", display:"flex", alignItems:"center", gap:14 },
  progressTrack:{ flex:1, height:6, background:C.border, borderRadius:4, overflow:"hidden" },
  progressFill:{ height:"100%", background:C.green, borderRadius:4, transition:"width .3s" },
  layout:{ display:"flex", maxHeight:"calc(100vh - 120px)", overflow:"hidden" },
  listCol:{ width:320, borderRight:`1px solid ${C.border}`, overflowY:"auto", background:C.white, flexShrink:0 },
  scanCol:{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 },
  listItem:{ padding:"10px 14px", borderBottom:`1px solid ${C.borderLight}`, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" },
  listItemActive:{ background:"#FFF8F0", borderLeft:`3px solid ${C.red}` },
  card:{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px" },
  scanInput:{ width:"100%", padding:"10px 12px", fontSize:14, border:`2px solid ${C.text}`, borderRadius:6, background:"#FAFAF8", fontFamily:C.font, outline:"none", boxSizing:"border-box" },
  qtyBtn:{ width:36, height:36, background:C.borderLight, border:"none", borderRadius:6, fontSize:20, cursor:"pointer", fontFamily:C.font, display:"flex", alignItems:"center", justifyContent:"center" },
  summaryWrap:{ maxWidth:760, margin:"0 auto", padding:"32px 20px" },
  summaryGrid:{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 },
  summaryCard:{ background:C.white, border:`1px solid ${C.border}`, borderRadius:8, padding:"12px 14px" },
  table:{ width:"100%", borderCollapse:"collapse", background:C.white, borderRadius:8, overflow:"hidden", border:`1px solid ${C.border}`, marginBottom:16 },
  th:{ padding:"9px 12px", fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:`1px solid ${C.border}`, textAlign:"left", background:"#FAFAF8" },
  td:{ padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${C.borderLight}` },
  smallCode:{ background:C.borderLight, padding:"2px 6px", borderRadius:3, fontSize:11 },
  eanBadge:{ background:"#FFF3CD", color:"#7B4F00", padding:"4px 12px", borderRadius:20, fontSize:13, fontWeight:600 },
  modalSearch:{ width:"100%", padding:"9px 12px", fontSize:13, border:`1.5px solid ${C.border}`, borderRadius:7, fontFamily:C.font, outline:"none", marginBottom:10, boxSizing:"border-box", background:"#FAFAF8" },
  modalItem:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" },
  modalItemSel:{ background:"#EAF3DE", borderColor:"#97C459" },
  overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  modal:{ background:C.white, borderRadius:12, padding:24, width:"100%", maxWidth:520, maxHeight:"85vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" },
  btnPrimary:{ padding:"9px 20px", background:C.text, color:"#fff", border:"none", borderRadius:7, fontSize:13, cursor:"pointer", fontFamily:C.font, fontWeight:600 },
  btnSecondary:{ padding:"9px 16px", background:"none", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, cursor:"pointer", fontFamily:C.font, color:C.muted },
  badge:{
    ok:{ background:"#D4EDDA", color:C.green, padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 },
    pending:{ background:C.borderLight, color:C.muted, padding:"2px 8px", borderRadius:20, fontSize:11 },
    partial:{ background:"#FFF3CD", color:"#7B4F00", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 },
    over:{ background:"#FDECEA", color:C.red, padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 },
  },
};
