import { useState, useRef, useEffect } from "react";

const KGC_PER_STECCA = 0.2;
const PACKS_PER_STECCA = 10;

const DEMO_ITEMS = [
  { riga:1, codAams:"630",   descrizione:"DIANA BLU KS*AST20",        kgc:0.6,  stecche:3,  pacchi:30  },
  { riga:2, codAams:"233",   descrizione:"DIANA ROSSA KS*AST20",       kgc:0.6,  stecche:3,  pacchi:30  },
  { riga:3, codAams:"1313",  descrizione:"L&M RED LABEL KS*AST20",     kgc:2.0,  stecche:10, pacchi:100 },
  { riga:4, codAams:"9",     descrizione:"MARLBORO GOLD KS*AST20",     kgc:2.0,  stecche:10, pacchi:100 },
  { riga:5, codAams:"395",   descrizione:"MARLBORO KS*AST20",          kgc:2.0,  stecche:10, pacchi:100 },
  { riga:6, codAams:"3840",  descrizione:"WEST ORIGINAL 100S*AST20",   kgc:2.0,  stecche:10, pacchi:100 },
  { riga:7, codAams:"21232", descrizione:"DELIA CLASSIC GREEN*20PZ",   kgc:2.0,  stecche:10, pacchi:100 },
  { riga:8, codAams:"21109", descrizione:"DELIA CLASSIC RED*20PZ",     kgc:2.0,  stecche:10, pacchi:100 },
];

function initItems(base) {
  return base.map(i => ({ ...i, kgcPerStecca: KGC_PER_STECCA, ricevuto: 0, scansioni: [] }));
}

function StatusBadge({ item }) {
  const s = styles.badge;
  if (item.ricevuto === 0) return <span style={s.pending}>In attesa</span>;
  if (item.ricevuto === item.stecche) return <span style={s.ok}>✓ OK</span>;
  if (item.ricevuto > item.stecche) return <span style={s.over}>+{item.ricevuto - item.stecche} eccesso</span>;
  return <span style={s.partial}>{item.ricevuto}/{item.stecche}</span>;
}

// ── Modal abbinamento barcode ─────────────────────────────────────────────────
function AbbinamentoModal({ ean, items, onConfirm, onSkip }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = items.filter(i =>
    !search || i.descrizione.toLowerCase().includes(search.toLowerCase()) || i.codAams.includes(search)
  );

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div>
            <p style={styles.modalTitle}>Nuovo barcode rilevato</p>
            <p style={styles.modalSub}>Prima scansione — abbina questo codice al prodotto in fattura</p>
          </div>
          <div style={styles.eanBadge}>{ean}</div>
        </div>

        <p style={styles.modalLabel}>A quale prodotto corrisponde questa stecca?</p>
        <input
          style={styles.modalSearch}
          placeholder="Cerca per nome o codice AAMS..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />

        <div style={styles.modalList}>
          {filtered.map((item, i) => (
            <div
              key={i}
              style={{ ...styles.modalItem, ...(selected === item.codAams ? styles.modalItemSel : {}) }}
              onClick={() => setSelected(item.codAams)}
            >
              <div style={styles.modalItemLeft}>
                <code style={styles.modalCode}>{item.codAams}</code>
                <span style={styles.modalItemName}>{item.descrizione}</span>
              </div>
              <div style={styles.modalItemRight}>
                <span style={styles.modalItemQty}>{item.stecche} stecche</span>
                {selected === item.codAams && <span style={styles.checkmark}>✓</span>}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.modalSkip} onClick={onSkip}>Salta</button>
          <button
            style={{ ...styles.modalConfirm, ...(selected ? {} : styles.modalConfirmDisabled) }}
            disabled={!selected}
            onClick={() => selected && onConfirm(ean, selected)}
          >
            Abbina e registra stecca
          </button>
        </div>

        <p style={styles.modalHint}>
          💾 Questo abbinamento verrà salvato — dalla prossima consegna questa stecca verrà riconosciuta automaticamente.
        </p>
      </div>
    </div>
  );
}

// ── App principale ────────────────────────────────────────────────────────────
export default function RicevimentoMerce() {
  const [phase, setPhase] = useState("upload");
  const [items, setItems] = useState([]);
  const [ordineInfo, setOrdineInfo] = useState(null);
  const [activeIdx, setActiveIdx] = useState(null);
  const [scanInput, setScanInput] = useState("");
  const [manualQty, setManualQty] = useState(1);
  const [toast, setToast] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Catalogo barcode: { [ean]: codAams } — persiste in localStorage
  const [catalogo, setCatalogo] = useState(() => {
    try { return JSON.parse(localStorage.getItem("catalogo_barcode") || "{}"); }
    catch { return {}; }
  });

  // Modal abbinamento
  const [pendingEan, setPendingEan] = useState(null);

  const scanRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (phase === "check" && activeIdx !== null) {
      setTimeout(() => scanRef.current?.focus(), 80);
    }
  }, [phase, activeIdx]);

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  function saveCatalogo(newCat) {
    setCatalogo(newCat);
    try { localStorage.setItem("catalogo_barcode", JSON.stringify(newCat)); } catch {}
  }

  function loadDemo() {
    setItems(initItems(DEMO_ITEMS));
    setOrdineInfo({ numero: "377902938", data: "29.05.2026", fornitore: "Logista", rivendita: "0017" });
    setPhase("check");
    setActiveIdx(0);
  }

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      const rowRegex = /^\s*(\d+)\s+(\d+)\s+(.+?)\s+([\d,]+)\s*$/gm;
      const parsed = [];
      let m;
      while ((m = rowRegex.exec(text)) !== null) {
        const kgc = parseFloat(m[4].replace(",", "."));
        parsed.push({
          riga: parseInt(m[1]), codAams: m[2], descrizione: m[3].trim(),
          kgc, stecche: Math.round(kgc / KGC_PER_STECCA),
          pacchi: Math.round(kgc / KGC_PER_STECCA) * PACKS_PER_STECCA,
        });
      }
      if (parsed.length > 0) {
        setItems(initItems(parsed));
        setOrdineInfo({ numero: "—", data: "—", fornitore: "Logista", rivendita: "—" });
      } else {
        setItems(initItems(DEMO_ITEMS));
        setOrdineInfo({ numero: "377902938", data: "29.05.2026", fornitore: "Logista", rivendita: "0017" });
      }
      setPhase("check");
      setActiveIdx(0);
    };
    reader.onerror = loadDemo;
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  // ── Gestione scansione ────────────────────────────────────────────────────
  function handleScan(e) {
    if (e.key !== "Enter" || !scanInput.trim()) return;
    const ean = scanInput.trim();
    setScanInput("");

    // 1. Già nel catalogo?
    if (catalogo[ean]) {
      const idx = items.findIndex(i => i.codAams === catalogo[ean]);
      if (idx !== -1) {
        registraRicezione(idx, 1, ean);
        setActiveIdx(idx);
        return;
      }
    }

    // 2. EAN corrisponde direttamente al codAams?
    const directIdx = items.findIndex(i => i.codAams === ean);
    if (directIdx !== -1) {
      registraRicezione(directIdx, 1, ean);
      setActiveIdx(directIdx);
      return;
    }

    // 3. Sconosciuto → apri modal abbinamento
    setPendingEan(ean);
  }

  function onAbbina(ean, codAams) {
    const newCat = { ...catalogo, [ean]: codAams };
    saveCatalogo(newCat);
    setPendingEan(null);
    const idx = items.findIndex(i => i.codAams === codAams);
    if (idx !== -1) {
      registraRicezione(idx, 1, ean);
      setActiveIdx(idx);
      showToast(`✓ Abbinamento salvato: ${items[idx].descrizione}`, "ok");
    }
    setTimeout(() => scanRef.current?.focus(), 100);
  }

  function onSkipAbbinamento() {
    setPendingEan(null);
    showToast("Scansione ignorata", "info");
    setTimeout(() => scanRef.current?.focus(), 100);
  }

  function registraRicezione(idx, qty, barcode = "manuale") {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const newRic = item.ricevuto + qty;
      const newScansioni = [...item.scansioni, { qty, barcode, ts: new Date().toLocaleTimeString("it-IT") }];
      if (newRic === item.stecche) showToast(`✓ ${item.descrizione} — completato!`, "ok");
      else if (newRic > item.stecche) showToast(`⚠ ${item.descrizione} — eccesso +${newRic - item.stecche}`, "warn");
      else showToast(`${item.descrizione}: ${newRic}/${item.stecche}`, "info");
      return { ...item, ricevuto: newRic, scansioni: newScansioni };
    }));
  }

  function resetItem(idx) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, ricevuto: 0, scansioni: [] } : item));
  }

  const totaleAtteso = items.reduce((a, i) => a + i.stecche, 0);
  const totaleRicevuto = items.reduce((a, i) => a + i.ricevuto, 0);
  const completati = items.filter(i => i.ricevuto === i.stecche).length;
  const discrepanze = items.filter(i => i.ricevuto > 0 && i.ricevuto !== i.stecche).length;
  const progresso = totaleAtteso > 0 ? Math.min(100, Math.round(totaleRicevuto / totaleAtteso * 100)) : 0;
  const catalogoCount = Object.keys(catalogo).length;

  // ── UPLOAD ────────────────────────────────────────────────────────────────
  if (phase === "upload") return (
    <div style={styles.root}>
      <div style={styles.uploadWrap}>
        <div style={styles.logo}>
          <span style={styles.logoL}>L</span>
          <span style={styles.logoText}>ogista · Ricevimento Merce</span>
        </div>
        <p style={styles.uploadSub}>Carica il PDF dell'ordine Logista per iniziare il controllo</p>

        <div
          style={{ ...styles.dropzone, ...(dragOver ? styles.dropzoneActive : {}) }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".pdf,.txt" style={{ display:"none" }}
            onChange={e => handleFile(e.target.files[0])} />
          <div style={styles.dropIcon}>📄</div>
          <p style={styles.dropMain}>Trascina il PDF Logista qui</p>
          <p style={styles.dropSub}>oppure clicca per selezionare il file</p>
        </div>

        <div style={styles.divider}><span style={{ background:"#F7F5F0", padding:"0 10px" }}>oppure</span></div>

        <button style={styles.demoBtn} onClick={loadDemo}>
          Carica ordine di esempio (377902938 · 29.05.2026)
        </button>

        {catalogoCount > 0 && (
          <div style={styles.catalogoBanner}>
            <span>📦 Catalogo barcode: <strong>{catalogoCount} prodotti</strong> già abbinati</span>
            <button style={styles.catalogoClear} onClick={() => { saveCatalogo({}); showToast("Catalogo azzerato", "warn"); }}>
              Azzera
            </button>
          </div>
        )}

        <p style={styles.hint}>
          Compatibile con PDF Logista standard.<br />
          I barcode abbinati vengono salvati automaticamente per le consegne future.
        </p>
      </div>
      {toast && <div style={{ ...styles.toast, ...(toast.type==="warn"?styles.toastWarn:toast.type==="info"?styles.toastInfo:{}) }}>{toast.msg}</div>}
    </div>
  );

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  if (phase === "summary") return (
    <div style={styles.root}>
      <div style={styles.summaryWrap}>
        <div style={styles.summaryHeader}>
          <div>
            <p style={styles.summaryTitle}>Riepilogo ricevimento</p>
            <p style={styles.summarySub}>Ordine {ordineInfo?.numero} · {ordineInfo?.data}</p>
          </div>
          <button style={styles.backBtn} onClick={() => setPhase("check")}>← Torna al controllo</button>
        </div>

        <div style={styles.summaryGrid}>
          {[
            ["Stecche attese", totaleAtteso, null],
            ["Stecche ricevute", totaleRicevuto, totaleRicevuto===totaleAtteso?"#1a6b2e":"#8B3A0F"],
            ["Prodotti OK", `${completati}/${items.length}`, "#1a6b2e"],
            ["Discrepanze", discrepanze, discrepanze>0?"#8B3A0F":"#1a6b2e"],
          ].map(([label, val, color]) => (
            <div key={label} style={styles.summaryCard}>
              <p style={styles.scLabel}>{label}</p>
              <p style={{ ...styles.scVal, ...(color ? { color } : {}) }}>{val}</p>
            </div>
          ))}
        </div>

        <table style={styles.table}>
          <thead>
            <tr>{["Cod.AAMS","Prodotto","Attese","Ricevute","Diff","Stato"].map(h =>
              <th key={h} style={styles.th}>{h}</th>
            )}</tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const diff = item.ricevuto - item.stecche;
              const hasEan = Object.entries(catalogo).find(([,c]) => c === item.codAams);
              return (
                <tr key={i} style={item.ricevuto!==item.stecche && item.ricevuto>0 ? styles.trWarn : {}}>
                  <td style={styles.td}>
                    <code style={styles.code}>{item.codAams}</code>
                    {hasEan && <span style={styles.eanTag} title={`EAN: ${hasEan[0]}`}>📶</span>}
                  </td>
                  <td style={styles.td}>{item.descrizione}</td>
                  <td style={{...styles.td,textAlign:"center"}}>{item.stecche}</td>
                  <td style={{...styles.td,textAlign:"center"}}>{item.ricevuto}</td>
                  <td style={{...styles.td,textAlign:"center",fontWeight:600,color:diff===0?"#aaa":diff>0?"#1a6b2e":"#8B3A0F"}}>
                    {diff===0?"—":diff>0?`+${diff}`:diff}
                  </td>
                  <td style={styles.td}><StatusBadge item={item} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {catalogoCount > 0 && (
          <div style={styles.catalogoSummary}>
            <p style={styles.catalogoSummaryTitle}>📦 Catalogo barcode aggiornato</p>
            <div style={styles.catalogoGrid}>
              {Object.entries(catalogo).map(([ean, codAams]) => {
                const prod = items.find(i => i.codAams === codAams);
                return (
                  <div key={ean} style={styles.catalogoRow}>
                    <code style={styles.catalogoEan}>{ean}</code>
                    <span style={styles.catalogoArrow}>→</span>
                    <span style={styles.catalogoProd}>{prod?.descrizione || codAams}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={styles.summaryActions}>
          <button style={styles.primaryBtn} onClick={() => { setItems(initItems(DEMO_ITEMS)); setPhase("upload"); }}>
            Nuovo ricevimento
          </button>
          <button style={styles.secondaryBtn} onClick={() => {
            const lines = [
              `Riepilogo ricevimento · Ordine ${ordineInfo?.numero} · ${ordineInfo?.data}`, "",
              "Cod.AAMS\tProdotto\tAttese\tRicevute\tDiff",
              ...items.map(i => `${i.codAams}\t${i.descrizione}\t${i.stecche}\t${i.ricevuto}\t${i.ricevuto-i.stecche}`)
            ].join("\n");
            navigator.clipboard.writeText(lines).then(() => showToast("Riepilogo copiato"));
          }}>
            Copia riepilogo
          </button>
        </div>
      </div>
      {toast && <div style={{ ...styles.toast, ...(toast.type==="warn"?styles.toastWarn:toast.type==="info"?styles.toastInfo:{}) }}>{toast.msg}</div>}
    </div>
  );

  // ── CHECK ─────────────────────────────────────────────────────────────────
  const activeItem = activeIdx !== null ? items[activeIdx] : null;

  return (
    <div style={styles.root}>
      {/* Modal abbinamento */}
      {pendingEan && (
        <AbbinamentoModal
          ean={pendingEan}
          items={items}
          onConfirm={onAbbina}
          onSkip={onSkipAbbinamento}
        />
      )}

      {/* Header */}
      <div style={styles.header}>
        <div>
          <span style={styles.headerTitle}>Ricevimento · Ordine {ordineInfo?.numero}</span>
          <span style={styles.headerSub}> · {ordineInfo?.data} · Logista</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {catalogoCount > 0 && (
            <span style={styles.headerCatalogo}>📦 {catalogoCount} barcode salvati</span>
          )}
          <button style={styles.summaryBtn} onClick={() => setPhase("summary")}>Riepilogo →</button>
        </div>
      </div>

      {/* Progress */}
      <div style={styles.progressWrap}>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width:`${progresso}%` }} />
        </div>
        <span style={styles.progressLabel}>{totaleRicevuto}/{totaleAtteso} stecche · {completati}/{items.length} prodotti</span>
      </div>

      <div style={styles.layout}>
        {/* Lista prodotti */}
        <div style={styles.listCol}>
          {items.map((item, i) => {
            const isActive = i === activeIdx;
            const isDone = item.ricevuto === item.stecche;
            const isOver = item.ricevuto > item.stecche;
            const hasEan = Object.values(catalogo).includes(item.codAams);
            return (
              <div key={i}
                style={{ ...styles.listItem, ...(isActive?styles.listItemActive:{}), ...(isDone?styles.listItemDone:{}), ...(isOver?styles.listItemOver:{}) }}
                onClick={() => { setActiveIdx(i); setTimeout(()=>scanRef.current?.focus(),50); }}
              >
                <div style={styles.liLeft}>
                  <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                    <code style={styles.liCode}>{item.codAams}</code>
                    {hasEan && <span title="Barcode abbinato" style={styles.liEanDot}>●</span>}
                  </div>
                  <span style={styles.liName}>{item.descrizione}</span>
                </div>
                <div style={styles.liRight}>
                  <span style={styles.liQty}>{item.ricevuto}<span style={styles.liQtyOf}>/{item.stecche}</span></span>
                  <StatusBadge item={item} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pannello scansione */}
        <div style={styles.scanCol}>
          {activeItem ? (
            <>
              <div style={styles.scanCard}>
                <p style={styles.scanLabel}>Prodotto selezionato</p>
                <p style={styles.scanName}>{activeItem.descrizione}</p>
                <div style={styles.scanMeta}>
                  <span><b>Cod.AAMS:</b> {activeItem.codAams}</span>
                  <span><b>Attese:</b> {activeItem.stecche} stecche ({activeItem.pacchi} pacchetti)</span>
                  <span><b>Kgc fattura:</b> {activeItem.kgc.toFixed(3)}</span>
                </div>
                {/* EAN abbinati a questo prodotto */}
                {(() => {
                  const eans = Object.entries(catalogo).filter(([,c])=>c===activeItem.codAams).map(([e])=>e);
                  return eans.length > 0 ? (
                    <div style={styles.eanList}>
                      <span style={styles.eanListLabel}>Barcode salvati:</span>
                      {eans.map(e => <code key={e} style={styles.eanPill}>{e}</code>)}
                    </div>
                  ) : (
                    <div style={styles.eanEmpty}>Nessun barcode abbinato ancora — scansiona la prima stecca</div>
                  );
                })()}
                <div style={styles.scanProgress}>
                  <div style={{ ...styles.scanProgressFill, width:`${Math.min(100,activeItem.ricevuto/activeItem.stecche*100)}%`, background: activeItem.ricevuto>activeItem.stecche?"#c0392b":"#1a6b2e" }} />
                </div>
                <p style={styles.scanCount}>{activeItem.ricevuto} / {activeItem.stecche} stecche ricevute</p>
              </div>

              {/* Barcode input */}
              <div style={styles.barcodeWrap}>
                <p style={styles.barcodeLabel}>🔫 Scansiona stecca</p>
                <input
                  ref={scanRef}
                  style={styles.barcodeInput}
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  onKeyDown={handleScan}
                  placeholder="Scansiona o digita codice + Invio"
                  autoComplete="off"
                />
                <p style={styles.barcodeHint}>
                  {Object.values(catalogo).includes(activeItem.codAams)
                    ? "✓ Prodotto riconosciuto automaticamente"
                    : "Prima scansione → verrà chiesto di abbinare il prodotto"}
                </p>
              </div>

              {/* Inserimento manuale */}
              <div style={styles.manualWrap}>
                <p style={styles.manualLabel}>Inserimento manuale</p>
                <div style={styles.manualRow}>
                  <button style={styles.qtyBtn} onClick={()=>setManualQty(q=>Math.max(1,q-1))}>−</button>
                  <span style={styles.qtyVal}>{manualQty}</span>
                  <button style={styles.qtyBtn} onClick={()=>setManualQty(q=>q+1)}>+</button>
                  <span style={styles.qtyUnit}>stecche</span>
                  <button style={styles.addBtn} onClick={()=>{ registraRicezione(activeIdx,manualQty); setManualQty(1); }}>
                    Aggiungi
                  </button>
                </div>
              </div>

              {/* Storico scansioni */}
              {activeItem.scansioni.length > 0 && (
                <div style={styles.historyWrap}>
                  <div style={styles.historyHeader}>
                    <p style={styles.historyTitle}>Scansioni ({activeItem.scansioni.length})</p>
                    <button style={styles.resetBtn} onClick={()=>resetItem(activeIdx)}>Reset</button>
                  </div>
                  {activeItem.scansioni.map((s,j) => (
                    <div key={j} style={styles.historyRow}>
                      <span style={styles.historyTs}>{s.ts}</span>
                      <span>+{s.qty} stecche</span>
                      <code style={styles.historyCode}>{s.barcode}</code>
                    </div>
                  ))}
                </div>
              )}

              {/* Naviga */}
              <div style={styles.navBtns}>
                <button style={styles.navBtn} disabled={activeIdx===0}
                  onClick={()=>{ setActiveIdx(i=>i-1); setTimeout(()=>scanRef.current?.focus(),50); }}>
                  ← Precedente
                </button>
                <button style={styles.navBtn} disabled={activeIdx===items.length-1}
                  onClick={()=>{ setActiveIdx(i=>i+1); setTimeout(()=>scanRef.current?.focus(),50); }}>
                  Successivo →
                </button>
              </div>
            </>
          ) : (
            <p style={{color:"#888",fontSize:14}}>Seleziona un prodotto dalla lista</p>
          )}
        </div>
      </div>

      {toast && <div style={{ ...styles.toast, ...(toast.type==="warn"?styles.toastWarn:toast.type==="info"?styles.toastInfo:{}) }}>{toast.msg}</div>}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  font: "'IBM Plex Mono', 'Courier New', monospace",
  bg: "#F7F5F0", white: "#fff", border: "#E8E4DC", borderLight: "#F0EDE6",
  text: "#1a1a1a", muted: "#888", red: "#C41E1E", green: "#1a6b2e", blue: "#0C447C",
};
const styles = {
  root: { fontFamily:S.font, background:S.bg, minHeight:"100vh", padding:"0 0 40px" },
  // Upload
  uploadWrap: { maxWidth:480, margin:"0 auto", padding:"60px 24px 40px" },
  logo: { display:"flex", alignItems:"center", gap:8, marginBottom:8 },
  logoL: { background:S.red, color:"#fff", fontWeight:700, fontSize:22, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:4 },
  logoText: { fontSize:16, fontWeight:600, color:S.text, letterSpacing:"-0.02em" },
  uploadSub: { fontSize:13, color:S.muted, marginBottom:28 },
  dropzone: { border:"2px dashed #C8C4BA", borderRadius:10, padding:"36px 24px", textAlign:"center", cursor:"pointer", background:S.white, transition:"all .15s" },
  dropzoneActive: { borderColor:S.red, background:"#FFF5F5" },
  dropIcon: { fontSize:36, marginBottom:10 },
  dropMain: { fontSize:15, fontWeight:600, color:S.text, marginBottom:4 },
  dropSub: { fontSize:12, color:S.muted },
  divider: { textAlign:"center", color:"#CCC", fontSize:12, margin:"20px 0", borderTop:"1px solid #E8E4DC", marginTop:24, paddingTop:0, position:"relative", top:-10 },
  demoBtn: { width:"100%", padding:"12px", background:S.text, color:"#fff", border:"none", borderRadius:8, fontSize:13, cursor:"pointer", fontFamily:"inherit" },
  catalogoBanner: { display:"flex", justifyContent:"space-between", alignItems:"center", background:"#EAF3DE", border:"1px solid #97C459", borderRadius:8, padding:"10px 14px", marginTop:14, fontSize:12, color:"#27500A" },
  catalogoClear: { background:"none", border:"none", color:"#8B3A0F", fontSize:11, cursor:"pointer", fontFamily:"inherit" },
  hint: { fontSize:11, color:"#AAA", textAlign:"center", marginTop:20, lineHeight:1.6 },
  // Header
  header: { background:S.text, color:"#fff", padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  headerTitle: { fontSize:14, fontWeight:600 },
  headerSub: { fontSize:12, color:"#AAA" },
  headerCatalogo: { fontSize:11, color:"#AAA", background:"rgba(255,255,255,0.1)", padding:"3px 10px", borderRadius:20 },
  summaryBtn: { background:"transparent", border:"1px solid #555", color:"#ddd", padding:"5px 14px", borderRadius:6, fontSize:12, cursor:"pointer", fontFamily:"inherit" },
  // Progress
  progressWrap: { background:S.white, borderBottom:`1px solid ${S.border}`, padding:"10px 20px", display:"flex", alignItems:"center", gap:14 },
  progressTrack: { flex:1, height:6, background:S.border, borderRadius:4, overflow:"hidden" },
  progressFill: { height:"100%", background:S.green, borderRadius:4, transition:"width .3s" },
  progressLabel: { fontSize:12, color:S.muted, whiteSpace:"nowrap" },
  // Layout
  layout: { display:"flex", maxHeight:"calc(100vh - 120px)", overflow:"hidden" },
  listCol: { width:340, borderRight:`1px solid ${S.border}`, overflowY:"auto", background:S.white, flexShrink:0 },
  scanCol: { flex:1, overflowY:"auto", padding:"16px 20px" },
  // List
  listItem: { padding:"10px 14px", borderBottom:`1px solid ${S.borderLight}`, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" },
  listItemActive: { background:"#FFF8F0", borderLeft:`3px solid ${S.red}` },
  listItemDone: { background:"#F0FAF3" },
  listItemOver: { background:"#FFF0F0" },
  liLeft: { display:"flex", flexDirection:"column", gap:3, flex:1, minWidth:0 },
  liCode: { fontSize:10, color:S.muted, background:S.borderLight, padding:"1px 5px", borderRadius:3, display:"inline-block" },
  liEanDot: { fontSize:8, color:S.green, title:"Barcode abbinato" },
  liName: { fontSize:12, fontWeight:500, color:S.text, lineHeight:1.3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  liRight: { display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, marginLeft:8 },
  liQty: { fontSize:16, fontWeight:700, color:S.text },
  liQtyOf: { fontSize:12, color:"#AAA", fontWeight:400 },
  // Scan panel
  scanCard: { background:S.white, border:`1px solid ${S.border}`, borderRadius:10, padding:"16px", marginBottom:14 },
  scanLabel: { fontSize:10, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 },
  scanName: { fontSize:17, fontWeight:700, color:S.text, marginBottom:10, lineHeight:1.3 },
  scanMeta: { display:"flex", flexDirection:"column", gap:4, fontSize:12, color:"#666", marginBottom:12 },
  eanList: { display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:10, fontSize:11 },
  eanListLabel: { color:S.muted },
  eanPill: { background:"#EAF3DE", color:"#27500A", padding:"2px 8px", borderRadius:20, fontSize:11 },
  eanEmpty: { fontSize:11, color:"#AAA", fontStyle:"italic", marginBottom:10, padding:"6px 0", borderTop:`1px dashed ${S.border}` },
  scanProgress: { height:8, background:S.borderLight, borderRadius:4, overflow:"hidden", marginBottom:6 },
  scanProgressFill: { height:"100%", borderRadius:4, transition:"width .3s, background .3s" },
  scanCount: { fontSize:13, fontWeight:600, color:S.text },
  // Barcode
  barcodeWrap: { background:S.white, border:`1px solid ${S.border}`, borderRadius:10, padding:"14px 16px", marginBottom:12 },
  barcodeLabel: { fontSize:12, fontWeight:600, color:S.text, marginBottom:8 },
  barcodeInput: { width:"100%", padding:"10px 12px", fontSize:14, border:`2px solid ${S.text}`, borderRadius:6, background:"#FAFAF8", fontFamily:"inherit", outline:"none", boxSizing:"border-box" },
  barcodeHint: { fontSize:11, color:S.muted, marginTop:6 },
  // Manual
  manualWrap: { background:S.white, border:`1px solid ${S.border}`, borderRadius:10, padding:"14px 16px", marginBottom:12 },
  manualLabel: { fontSize:12, fontWeight:600, color:S.text, marginBottom:10 },
  manualRow: { display:"flex", alignItems:"center", gap:10 },
  qtyBtn: { width:32, height:32, background:S.borderLight, border:"none", borderRadius:6, fontSize:18, cursor:"pointer", fontFamily:"inherit" },
  qtyVal: { fontSize:20, fontWeight:700, minWidth:28, textAlign:"center" },
  qtyUnit: { fontSize:12, color:S.muted },
  addBtn: { marginLeft:"auto", padding:"8px 20px", background:S.text, color:"#fff", border:"none", borderRadius:6, fontSize:13, cursor:"pointer", fontFamily:"inherit" },
  // History
  historyWrap: { background:S.white, border:`1px solid ${S.border}`, borderRadius:10, padding:"14px 16px", marginBottom:12 },
  historyHeader: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 },
  historyTitle: { fontSize:12, fontWeight:600, color:S.text },
  resetBtn: { fontSize:11, color:S.red, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" },
  historyRow: { display:"flex", gap:12, fontSize:12, color:"#666", padding:"4px 0", borderBottom:`1px solid ${S.borderLight}` },
  historyTs: { color:"#AAA" },
  historyCode: { color:"#AAA", fontSize:11 },
  // Nav
  navBtns: { display:"flex", gap:8 },
  navBtn: { flex:1, padding:"9px", background:S.borderLight, border:"none", borderRadius:7, fontSize:13, cursor:"pointer", fontFamily:"inherit", color:S.text },
  // Toast
  toast: { position:"fixed", top:70, right:20, background:S.green, color:"#fff", padding:"10px 18px", borderRadius:8, fontSize:13, fontWeight:500, boxShadow:"0 4px 16px rgba(0,0,0,0.15)", zIndex:999 },
  toastWarn: { background:"#8B3A0F" },
  toastInfo: { background:S.blue },
  // Badges
  badge: {
    ok:      { background:"#D4EDDA", color:S.green,   padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 },
    pending: { background:S.borderLight, color:S.muted, padding:"2px 8px", borderRadius:20, fontSize:11 },
    partial: { background:"#FFF3CD", color:"#7B4F00", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 },
    over:    { background:"#FDECEA", color:S.red,     padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 },
  },
  // Modal abbinamento
  modalOverlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  modal: { background:S.white, borderRadius:12, padding:"24px", width:"100%", maxWidth:520, maxHeight:"85vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" },
  modalHeader: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 },
  modalTitle: { fontSize:16, fontWeight:700, color:S.text, marginBottom:4 },
  modalSub: { fontSize:12, color:S.muted },
  eanBadge: { background:"#FFF3CD", color:"#7B4F00", padding:"4px 12px", borderRadius:20, fontSize:13, fontWeight:600, fontFamily:S.font, whiteSpace:"nowrap" },
  modalLabel: { fontSize:13, fontWeight:600, color:S.text, marginBottom:10 },
  modalSearch: { width:"100%", padding:"9px 12px", fontSize:13, border:`1.5px solid ${S.border}`, borderRadius:7, background:"#FAFAF8", fontFamily:"inherit", outline:"none", marginBottom:10, boxSizing:"border-box" },
  modalList: { display:"flex", flexDirection:"column", gap:4, marginBottom:16, maxHeight:280, overflowY:"auto" },
  modalItem: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", border:`1px solid ${S.border}`, borderRadius:8, cursor:"pointer", transition:"all .1s" },
  modalItemSel: { background:"#EAF3DE", borderColor:"#97C459" },
  modalItemLeft: { display:"flex", flexDirection:"column", gap:4 },
  modalCode: { fontSize:10, background:S.borderLight, padding:"1px 6px", borderRadius:3, color:S.muted },
  modalItemName: { fontSize:13, fontWeight:500, color:S.text },
  modalItemRight: { display:"flex", alignItems:"center", gap:8 },
  modalItemQty: { fontSize:12, color:S.muted },
  checkmark: { color:S.green, fontWeight:700, fontSize:16 },
  modalFooter: { display:"flex", gap:10, justifyContent:"flex-end" },
  modalSkip: { padding:"9px 18px", background:"none", border:`1px solid ${S.border}`, borderRadius:7, fontSize:13, cursor:"pointer", fontFamily:"inherit", color:S.muted },
  modalConfirm: { padding:"9px 20px", background:S.text, color:"#fff", border:"none", borderRadius:7, fontSize:13, cursor:"pointer", fontFamily:"inherit", fontWeight:600 },
  modalConfirmDisabled: { background:"#CCC", cursor:"not-allowed" },
  modalHint: { fontSize:11, color:S.muted, textAlign:"center", marginTop:14, lineHeight:1.5 },
  // Summary
  summaryWrap: { maxWidth:700, margin:"0 auto", padding:"32px 20px" },
  summaryHeader: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 },
  summaryTitle: { fontSize:20, fontWeight:700, color:S.text },
  summarySub: { fontSize:13, color:S.muted, marginTop:3 },
  backBtn: { fontSize:12, background:"none", border:`1px solid #C8C4BA`, padding:"6px 14px", borderRadius:6, cursor:"pointer", fontFamily:"inherit" },
  summaryGrid: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 },
  summaryCard: { background:S.white, border:`1px solid ${S.border}`, borderRadius:8, padding:"12px 14px" },
  scLabel: { fontSize:11, color:S.muted, marginBottom:4 },
  scVal: { fontSize:22, fontWeight:700, color:S.text },
  table: { width:"100%", borderCollapse:"collapse", background:S.white, borderRadius:8, overflow:"hidden", border:`1px solid ${S.border}`, marginBottom:16 },
  th: { padding:"9px 12px", fontSize:11, color:S.muted, textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:`1px solid ${S.border}`, textAlign:"left", background:"#FAFAF8" },
  td: { padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${S.borderLight}` },
  trWarn: { background:"#FFFBF0" },
  code: { background:S.borderLight, padding:"2px 6px", borderRadius:3, fontSize:11 },
  eanTag: { fontSize:12, marginLeft:4, title:"Barcode abbinato" },
  catalogoSummary: { background:S.white, border:`1px solid ${S.border}`, borderRadius:8, padding:"14px 16px", marginBottom:16 },
  catalogoSummaryTitle: { fontSize:13, fontWeight:600, color:S.text, marginBottom:10 },
  catalogoGrid: { display:"flex", flexDirection:"column", gap:6 },
  catalogoRow: { display:"flex", alignItems:"center", gap:10, fontSize:12 },
  catalogoEan: { background:"#FFF3CD", color:"#7B4F00", padding:"2px 8px", borderRadius:20, fontSize:11 },
  catalogoArrow: { color:S.muted },
  catalogoProd: { color:S.text },
  summaryActions: { display:"flex", gap:10 },
  primaryBtn: { padding:"10px 24px", background:S.text, color:"#fff", border:"none", borderRadius:8, fontSize:13, cursor:"pointer", fontFamily:"inherit" },
  secondaryBtn: { padding:"10px 24px", background:S.white, color:S.text, border:`1px solid #C8C4BA`, borderRadius:8, fontSize:13, cursor:"pointer", fontFamily:"inherit" },
};
