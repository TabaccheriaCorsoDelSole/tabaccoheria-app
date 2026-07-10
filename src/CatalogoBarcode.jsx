import { useState, useEffect } from "react";
import { caricaBarcode, salvaBarcode, eliminaBarcode, caricaCatalogoADM, esportaBackup, caricaLog } from "./supabaseClient";

const C = { font:"'IBM Plex Mono', monospace", bg:"#F7F5F0", white:"#fff", border:"#E8E4DC", borderLight:"#F0EDE6", text:"#1a1a1a", muted:"#888", red:"#C41E1E", green:"#1a6b2e" };

export default function CatalogoBarcode({ utente }) {
  const [catalogo, setCatalogo] = useState({});
  const [catalogoADM, setCatalogoADM] = useState([]);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null); // ean in modifica
  const [editData, setEditData] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [addData, setAddData] = useState({ ean:'', codAams:'', unita:'stecca', pesoKg:'', query:'' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [vista, setVista] = useState('barcode'); // barcode | log
  const [log, setLog] = useState([]);

  useEffect(() => {
    caricaBarcode().then(setCatalogo).catch(() => setCatalogo({}));
    caricaCatalogoADM().then(setCatalogoADM).catch(() => setCatalogoADM([]));
  }, []);

  useEffect(() => {
    if (vista === 'log') caricaLog(100).then(setLog).catch(() => setLog([]));
  }, [vista]);

  function showToast(msg, type="ok") { setToast({msg,type}); setTimeout(()=>setToast(null),2500); }

  function nomeProdotto(codAams) {
    return catalogoADM.find(p => p.codice === codAams)?.descrizione || null;
  }

  async function handleDelete(ean) {
    try {
      await eliminaBarcode(ean, utente?.profilo?.nome);
      const c = {...catalogo}; delete c[ean]; setCatalogo(c);
      showToast("Barcode eliminato","warn");
    } catch (err) { showToast("Errore: "+err.message,"warn"); }
    setConfirmDelete(null);
  }

  async function handleEditSave() {
    if (!editData.codAams) return;
    try {
      await salvaBarcode(editing, editData.codAams, editData.unita || 'stecca',
        editData.pesoKg ? parseFloat(editData.pesoKg) : null, utente?.profilo?.nome);
      setCatalogo({...catalogo, [editing]: { codAams: editData.codAams, unita: editData.unita || 'stecca', pesoKg: editData.pesoKg ? parseFloat(editData.pesoKg) : null }});
      showToast("Aggiornato");
    } catch (err) { showToast("Errore: "+err.message,"warn"); }
    setEditing(null);
  }

  async function handleAdd() {
    if (!addData.ean.trim() || !addData.codAams) return;
    try {
      await salvaBarcode(addData.ean.trim(), addData.codAams, addData.unita,
        addData.pesoKg ? parseFloat(addData.pesoKg) : null, utente?.profilo?.nome);
      setCatalogo({...catalogo, [addData.ean.trim()]: { codAams: addData.codAams, unita: addData.unita, pesoKg: addData.pesoKg ? parseFloat(addData.pesoKg) : null }});
      showToast("Barcode aggiunto");
      setAddData({ ean:'', codAams:'', unita:'stecca', pesoKg:'', query:'' });
      setShowAdd(false);
    } catch (err) { showToast("Errore: "+err.message,"warn"); }
  }

  const sugAdd = addData.query
    ? catalogoADM.filter(p => p.codice.startsWith(addData.query) || p.descrizione.toLowerCase().includes(addData.query.toLowerCase())).slice(0, 8)
    : [];

  const entries = Object.entries(catalogo).filter(([ean, info]) => {
    if (!search) return true;
    const nome = nomeProdotto(info.codAams) || '';
    return ean.includes(search) || info.codAams.includes(search) || nome.toLowerCase().includes(search.toLowerCase());
  });

  // Raggruppa per prodotto
  const gruppi = {};
  for (const [ean, info] of entries) {
    if (!gruppi[info.codAams]) gruppi[info.codAams] = [];
    gruppi[info.codAams].push({ ean, ...info });
  }

  return (
    <div style={{ fontFamily:C.font, padding:'24px 20px', maxWidth:760, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <p style={{ fontSize:17, fontWeight:600 }}>Catalogo barcode</p>
          <p style={{ fontSize:12, color:C.muted, marginTop:3 }}>
            {Object.keys(catalogo).length} barcode · {Object.keys(gruppi).length} prodotti · catalogo ADM {catalogoADM.length} voci
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button style={bt.sec} onClick={() => esportaBackup().then(()=>showToast("Backup scaricato")).catch(e=>showToast("Errore: "+e.message,"warn"))}>
            💾 Backup
          </button>
          <button style={bt.sec} onClick={() => setVista(vista === 'log' ? 'barcode' : 'log')}>
            {vista === 'log' ? '← Barcode' : '📜 Log modifiche'}
          </button>
          <button style={bt.pri} onClick={()=>setShowAdd(true)}>+ Aggiungi</button>
        </div>
      </div>

      {vista === 'log' ? (
        /* ── Vista log ── */
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden' }}>
          {log.length === 0 ? (
            <p style={{ padding:30, textAlign:'center', fontSize:13, color:C.muted }}>Nessuna modifica registrata</p>
          ) : log.map((l, i) => (
            <div key={l.id} style={{ padding:'10px 16px', borderBottom: i === log.length-1 ? 'none' : `1px solid ${C.borderLight}`, display:'flex', gap:12, alignItems:'center', fontSize:12 }}>
              <span style={{
                padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:600,
                background: l.azione==='inserito' ? '#D4EDDA' : l.azione==='eliminato' ? '#FDECEA' : '#FFF3CD',
                color: l.azione==='inserito' ? C.green : l.azione==='eliminato' ? C.red : '#7B4F00',
              }}>{l.azione}</span>
              <code style={{ background:C.borderLight, padding:'2px 6px', borderRadius:3, fontSize:11 }}>{l.chiave}</code>
              {l.dettaglio?.cod_aams && <span style={{ color:C.muted }}>→ {nomeProdotto(l.dettaglio.cod_aams) || l.dettaglio.cod_aams}</span>}
              <span style={{ marginLeft:'auto', color:'#AAA', fontSize:11, whiteSpace:'nowrap' }}>
                {l.utente_nome} · {new Date(l.eseguito_il).toLocaleString('it-IT')}
              </span>
            </div>
          ))}
        </div>
      ) : (
        /* ── Vista barcode raggruppati ── */
        <>
          <input style={{ width:'100%', padding:'9px 12px', fontSize:13, border:`1.5px solid ${C.border}`, borderRadius:7, background:C.white, fontFamily:C.font, outline:'none', marginBottom:14, boxSizing:'border-box' }}
            placeholder="Cerca per EAN, codice AAMS o nome..." value={search} onChange={e=>setSearch(e.target.value)} />

          {Object.keys(gruppi).length === 0 ? (
            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:'40px 20px', textAlign:'center', color:C.muted, fontSize:13 }}>
              {Object.keys(catalogo).length === 0 ? 'Nessun barcode abbinato ancora.' : 'Nessun risultato.'}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {Object.entries(gruppi).map(([codAams, barcodes]) => (
                <div key={codAams} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden' }}>
                  {/* Intestazione prodotto */}
                  <div style={{ padding:'10px 16px', background:'#FAFAF8', borderBottom:`1px solid ${C.borderLight}`, display:'flex', alignItems:'center', gap:10 }}>
                    <code style={{ background:C.borderLight, padding:'2px 8px', borderRadius:3, fontSize:11 }}>{codAams}</code>
                    <span style={{ fontSize:13, fontWeight:600 }}>{nomeProdotto(codAams) || <span style={{ color:C.muted, fontStyle:'italic' }}>Non nel catalogo ADM</span>}</span>
                    <span style={{ marginLeft:'auto', fontSize:11, color:C.muted }}>{barcodes.length} barcode</span>
                  </div>
                  {/* Barcode del prodotto */}
                  {barcodes.map(({ ean, unita, pesoKg }, bi) => (
                    <div key={ean} style={{ padding:'8px 16px', borderBottom: bi === barcodes.length-1 ? 'none' : `1px solid ${C.borderLight}` }}>
                      {editing === ean ? (
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                            <code style={{ background:'#FFF3CD', color:'#7B4F00', padding:'2px 8px', borderRadius:20, fontSize:12 }}>{ean}</code>
                            <select value={editData.unita} onChange={e=>setEditData({...editData, unita:e.target.value})}
                              style={{ padding:'5px 8px', fontSize:12, border:`1.5px solid ${C.border}`, borderRadius:6, fontFamily:C.font }}>
                              <option value="stecca">Stecca (×10)</option>
                              <option value="pacchetto">Pacchetto (×1)</option>
                            </select>
                            <input type="number" step="0.001" placeholder="Peso kg" value={editData.pesoKg || ''}
                              onChange={e=>setEditData({...editData, pesoKg:e.target.value})}
                              style={{ width:90, padding:'5px 8px', fontSize:12, border:`1.5px solid ${C.border}`, borderRadius:6, fontFamily:C.font }} />
                            <input type="text" placeholder="Cambia AAMS..." value={editData.codAams}
                              onChange={e=>setEditData({...editData, codAams:e.target.value})}
                              style={{ width:100, padding:'5px 8px', fontSize:12, border:`1.5px solid ${C.border}`, borderRadius:6, fontFamily:C.font }} />
                          </div>
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={handleEditSave} style={bt.ok}>Salva</button>
                            <button onClick={()=>setEditing(null)} style={bt.sec}>Annulla</button>
                          </div>
                        </div>
                      ) : confirmDelete === ean ? (
                        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <span style={{ fontSize:13 }}>Eliminare <code style={{ color:C.red }}>{ean}</code>?</span>
                          <button onClick={()=>handleDelete(ean)} style={bt.danger}>Elimina</button>
                          <button onClick={()=>setConfirmDelete(null)} style={bt.sec}>Annulla</button>
                        </div>
                      ) : (
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <code style={{ background:'#FFF3CD', color:'#7B4F00', padding:'2px 8px', borderRadius:20, fontSize:12 }}>{ean}</code>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:unita==='pacchetto'?'#E6F1FB':'#EAF3DE', color:unita==='pacchetto'?'#0C447C':'#27500A' }}>
                            {unita === 'pacchetto' ? '🚬 pacchetto' : '📦 stecca'}
                          </span>
                          {pesoKg && <span style={{ fontSize:11, color:C.muted }}>{(pesoKg*1000).toFixed(0)}g</span>}
                          <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
                            <button onClick={()=>{setEditing(ean);setEditData({codAams, unita, pesoKg});}} style={bt.sec}>Modifica</button>
                            <button onClick={()=>setConfirmDelete(ean)} style={{...bt.sec,color:C.red}}>✕</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal aggiungi */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:C.white, borderRadius:12, padding:24, width:'100%', maxWidth:480, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', maxHeight:'88vh', overflowY:'auto' }}>
            <p style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Aggiungi barcode</p>

            <p style={lbl}>Codice EAN</p>
            <input autoFocus style={inp} placeholder="es. 8000070050016" value={addData.ean}
              onChange={e=>setAddData({...addData, ean:e.target.value})} />

            <p style={{...lbl, marginTop:14}}>Prodotto (cerca nel catalogo ADM)</p>
            <div style={{ position:'relative' }}>
              <input style={inp} placeholder="Codice AAMS o nome..." value={addData.query}
                onChange={e=>setAddData({...addData, query:e.target.value, codAams:''})} />
              {sugAdd.length > 0 && !addData.codAams && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:C.white, border:`1px solid ${C.border}`, borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:10, maxHeight:220, overflowY:'auto' }}>
                  {sugAdd.map(p=>(
                    <div key={p.codice} style={{ display:'flex', gap:8, padding:'9px 12px', cursor:'pointer', fontSize:12, borderBottom:`1px solid ${C.borderLight}` }}
                      onMouseDown={()=>setAddData({...addData, codAams:p.codice, query:p.descrizione})}>
                      <code style={{ fontSize:10, color:C.muted, minWidth:48 }}>{p.codice}</code>
                      <div style={{ flex:1 }}>
                        <span style={{ display:'block' }}>{p.descrizione}</span>
                        <span style={{ fontSize:10, color:C.muted }}>{p.categoria}</span>
                      </div>
                      {p.prezzo_conf && <span style={{ fontSize:10, color:C.muted }}>€{Number(p.prezzo_conf).toFixed(2)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {addData.codAams && <p style={{ fontSize:11, color:C.green, marginTop:4 }}>✓ {addData.query} (AAMS {addData.codAams})</p>}

            <p style={{...lbl, marginTop:14}}>Unità</p>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ ...unitaBtn, ...(addData.unita==='stecca'?unitaBtnSel:{}) }} onClick={()=>setAddData({...addData, unita:'stecca'})}>📦 Stecca (×10)</button>
              <button style={{ ...unitaBtn, ...(addData.unita==='pacchetto'?unitaBtnSel:{}) }} onClick={()=>setAddData({...addData, unita:'pacchetto'})}>🚬 Pacchetto (×1)</button>
            </div>

            <p style={{...lbl, marginTop:14}}>Peso in kg (solo per prodotti a peso, facoltativo)</p>
            <input type="number" step="0.001" style={{...inp, maxWidth:140}} placeholder="es. 0.030"
              value={addData.pesoKg} onChange={e=>setAddData({...addData, pesoKg:e.target.value})} />

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <button onClick={()=>{setShowAdd(false);setAddData({ ean:'', codAams:'', unita:'stecca', pesoKg:'', query:'' });}} style={bt.sec}>Annulla</button>
              <button onClick={handleAdd} disabled={!addData.ean.trim()||!addData.codAams}
                style={{...bt.pri,...(!addData.ean.trim()||!addData.codAams?{background:'#CCC',cursor:'not-allowed'}:{})}}>Aggiungi</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position:'fixed', top:70, right:20, background:toast.type==='warn'?'#8B3A0F':C.green, color:'#fff', padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:500, zIndex:999 }}>{toast.msg}</div>}
    </div>
  );
}

const lbl = { fontSize:11, color:'#888', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' };
const inp = { width:'100%', padding:'9px 12px', fontSize:13, border:'1.5px solid #E8E4DC', borderRadius:7, fontFamily:"'IBM Plex Mono',monospace", outline:'none', boxSizing:'border-box' };
const unitaBtn = { flex:1, padding:'10px', background:'#fff', border:'2px solid #E8E4DC', borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:"'IBM Plex Mono',monospace" };
const unitaBtnSel = { borderColor:'#1a6b2e', background:'#F0FAF3', fontWeight:600 };

const bt = {
  pri:{ padding:'8px 18px', background:'#1a1a1a', color:'#fff', border:'none', borderRadius:7, fontSize:12, cursor:'pointer', fontFamily:"'IBM Plex Mono',monospace", fontWeight:600 },
  sec:{ padding:'7px 14px', background:'none', border:'1px solid #E8E4DC', borderRadius:7, fontSize:12, cursor:'pointer', fontFamily:"'IBM Plex Mono',monospace", color:'#888' },
  ok:{ padding:'7px 14px', background:'#1a6b2e', color:'#fff', border:'none', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:"'IBM Plex Mono',monospace" },
  danger:{ padding:'7px 14px', background:'#C41E1E', color:'#fff', border:'none', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:"'IBM Plex Mono',monospace" },
};
