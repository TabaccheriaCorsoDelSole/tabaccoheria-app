import { useState, useEffect } from "react";
import { caricaBarcode, salvaBarcode, eliminaBarcode } from "./supabaseClient";
import { CATALOGO_ADM } from "./catalogoADM";

const C = { font:"'IBM Plex Mono', monospace", bg:"#F7F5F0", white:"#fff", border:"#E8E4DC", borderLight:"#F0EDE6", text:"#1a1a1a", muted:"#888", red:"#C41E1E", green:"#1a6b2e" };

export default function CatalogoBarcode({ utente }) {
  const [catalogo, setCatalogo] = useState({});
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [editingEan, setEditingEan] = useState(null);
  const [editCodAams, setEditCodAams] = useState("");
  const [newEan, setNewEan] = useState("");
  const [newCodAams, setNewCodAams] = useState("");
  const [newSearch, setNewSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { caricaBarcode().then(setCatalogo).catch(() => setCatalogo({})); }, []);

  function showToast(msg, type="ok") { setToast({msg,type}); setTimeout(()=>setToast(null),2500); }

  async function handleDelete(ean) {
    try {
      await eliminaBarcode(ean);
      const c={...catalogo}; delete c[ean]; setCatalogo(c);
      showToast("Barcode eliminato","warn");
    } catch (err) { showToast("Errore: "+err.message,"warn"); }
    setConfirmDelete(null);
  }

  async function handleEditSave() {
    if (!editCodAams) return;
    try {
      await salvaBarcode(editingEan, editCodAams);
      setCatalogo({...catalogo,[editingEan]:editCodAams});
      showToast("Abbinamento aggiornato");
    } catch (err) { showToast("Errore: "+err.message,"warn"); }
    setEditingEan(null);
  }

  async function handleAdd() {
    if (!newEan.trim() || !newCodAams) return;
    try {
      await salvaBarcode(newEan.trim(), newCodAams);
      setCatalogo({...catalogo,[newEan.trim()]:newCodAams});
      showToast("Barcode aggiunto");
      setNewEan(""); setNewCodAams(""); setNewSearch(""); setShowAdd(false);
    } catch (err) { showToast("Errore: "+err.message,"warn"); }
  }

  function esporta() {
    const lines = ['EAN\tCod.AAMS\tProdotto\tPrezzo',
      ...Object.entries(catalogo).map(([ean,cod])=>{
        const p=CATALOGO_ADM.find(x=>x.codAams===cod);
        return `${ean}\t${cod}\t${p?.nome||'—'}\t${p?.prezzoConf?`€${p.prezzoConf.toFixed(2)}`:'—'}`;
      })
    ].join('\n');
    const blob=new Blob([lines],{type:'text/plain'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='catalogo_barcode.txt'; a.click(); URL.revokeObjectURL(url);
  }

  const sugAdd = newSearch ? CATALOGO_ADM.filter(p=>p.codAams.startsWith(newSearch)||p.nome.toLowerCase().includes(newSearch.toLowerCase())).slice(0,6) : [];

  const entries = Object.entries(catalogo).filter(([ean,codAams])=>{
    if (!search) return true;
    const p=CATALOGO_ADM.find(x=>x.codAams===codAams);
    return ean.includes(search)||codAams.includes(search)||(p&&p.nome.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div style={{ fontFamily:C.font, padding:'24px 20px', maxWidth:720, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <p style={{ fontSize:17, fontWeight:600 }}>Catalogo barcode</p>
          <p style={{ fontSize:12, color:C.muted, marginTop:3 }}>{Object.keys(catalogo).length} barcode abbinati</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {Object.keys(catalogo).length>0 && <button style={bt.sec} onClick={esporta}>⬇ Esporta</button>}
          <button style={bt.pri} onClick={()=>setShowAdd(true)}>+ Aggiungi</button>
        </div>
      </div>

      <input style={{ width:'100%', padding:'9px 12px', fontSize:13, border:`1.5px solid ${C.border}`, borderRadius:7, background:C.white, fontFamily:C.font, outline:'none', marginBottom:14, boxSizing:'border-box' }}
        placeholder="Cerca per EAN, codice AAMS o nome..." value={search} onChange={e=>setSearch(e.target.value)} />

      {entries.length===0 ? (
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:'40px 20px', textAlign:'center', color:C.muted, fontSize:13 }}>
          {Object.keys(catalogo).length===0 ? 'Nessun barcode abbinato. Scansiona una stecca durante il ricevimento oppure aggiungila manualmente.' : 'Nessun risultato.'}
        </div>
      ) : (
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 1fr 100px', padding:'8px 14px', background:'#FAFAF8', borderBottom:`1px solid ${C.border}` }}>
            {['Barcode EAN','Cod.AAMS','Prodotto',''].map(h=><span key={h} style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:500 }}>{h}</span>)}
          </div>
          {entries.map(([ean,codAams],i)=>{
            const prod=CATALOGO_ADM.find(p=>p.codAams===codAams);
            const isEditing=editingEan===ean, isLast=i===entries.length-1;
            return (
              <div key={ean} style={{ borderBottom:isLast?'none':`1px solid ${C.borderLight}`, padding:'10px 14px', background:isEditing?'#FFFBF0':C.white }}>
                {isEditing ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <code style={{ background:'#FFF3CD', color:'#7B4F00', padding:'3px 10px', borderRadius:20, fontSize:12 }}>{ean}</code>
                      <span style={{ color:C.muted, fontSize:12 }}>→</span>
                      <select value={editCodAams} onChange={e=>setEditCodAams(e.target.value)}
                        style={{ padding:'5px 8px', fontSize:12, border:`1.5px solid ${C.border}`, borderRadius:6, fontFamily:C.font, flex:1, minWidth:200 }}>
                        <option value="">Seleziona...</option>
                        {CATALOGO_ADM.map(p=><option key={p.codAams} value={p.codAams}>{p.nome} ({p.codAams})</option>)}
                      </select>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={handleEditSave} style={bt.ok}>Salva</button>
                      <button onClick={()=>setEditingEan(null)} style={bt.sec}>Annulla</button>
                    </div>
                  </div>
                ) : confirmDelete===ean ? (
                  <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    <span style={{ fontSize:13 }}>Eliminare <code style={{ background:'#FDECEA', color:C.red, padding:'1px 6px', borderRadius:4 }}>{ean}</code>?</span>
                    <button onClick={()=>handleDelete(ean)} style={bt.danger}>Elimina</button>
                    <button onClick={()=>setConfirmDelete(null)} style={bt.sec}>Annulla</button>
                  </div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 1fr 100px', alignItems:'center' }}>
                    <code style={{ background:'#FFF3CD', color:'#7B4F00', padding:'2px 8px', borderRadius:20, fontSize:12, display:'inline-block', width:'fit-content' }}>{ean}</code>
                    <code style={{ fontSize:11, color:C.muted, background:C.borderLight, padding:'2px 6px', borderRadius:3, display:'inline-block', width:'fit-content' }}>{codAams}</code>
                    <span style={{ fontSize:13 }}>{prod?.nome || <span style={{ color:C.muted, fontStyle:'italic' }}>Non nel catalogo</span>}</span>
                    <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                      <button onClick={()=>{setEditingEan(ean);setEditCodAams(codAams);}} style={bt.sec}>Modifica</button>
                      <button onClick={()=>setConfirmDelete(ean)} style={{...bt.sec,color:C.red,borderColor:'#F09595'}}>✕</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal aggiungi */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:C.white, borderRadius:12, padding:24, width:'100%', maxWidth:460, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <p style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Aggiungi barcode manualmente</p>
            <p style={{ fontSize:12, color:C.muted, marginBottom:20 }}>Inserisci il codice EAN della stecca e seleziona il prodotto</p>
            <div style={{ marginBottom:14 }}>
              <p style={{ fontSize:11, color:C.muted, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Codice EAN</p>
              <input autoFocus style={{ width:'100%', padding:'9px 12px', fontSize:13, border:`1.5px solid ${C.border}`, borderRadius:7, fontFamily:C.font, outline:'none', boxSizing:'border-box' }}
                placeholder="es. 8000070050016" value={newEan} onChange={e=>setNewEan(e.target.value)} />
            </div>
            <div style={{ marginBottom:20, position:'relative' }}>
              <p style={{ fontSize:11, color:C.muted, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Prodotto (digita per cercare)</p>
              <input style={{ width:'100%', padding:'9px 12px', fontSize:13, border:`1.5px solid ${C.border}`, borderRadius:7, fontFamily:C.font, outline:'none', boxSizing:'border-box' }}
                placeholder="Codice AAMS o nome..." value={newSearch}
                onChange={e=>{ setNewSearch(e.target.value); setNewCodAams(''); }} />
              {sugAdd.length>0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:C.white, border:`1px solid ${C.border}`, borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:10 }}>
                  {sugAdd.map(p=>(
                    <div key={p.codAams} style={{ display:'flex', gap:8, padding:'10px 12px', cursor:'pointer', fontSize:13, borderBottom:`1px solid ${C.borderLight}` }}
                      onMouseDown={()=>{ setNewCodAams(p.codAams); setNewSearch(p.nome); }}>
                      <code style={{ fontSize:11, color:C.muted, minWidth:50 }}>{p.codAams}</code>
                      <span>{p.nome}</span>
                      {p.prezzoConf && <span style={{ marginLeft:'auto', fontSize:11, color:C.muted }}>€ {p.prezzoConf.toFixed(2)}</span>}
                    </div>
                  ))}
                </div>
              )}
              {newCodAams && <p style={{ fontSize:11, color:C.green, marginTop:6 }}>✓ Selezionato: {CATALOGO_ADM.find(p=>p.codAams===newCodAams)?.nome || newCodAams}</p>}
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={()=>{ setShowAdd(false); setNewEan(''); setNewCodAams(''); setNewSearch(''); }} style={bt.sec}>Annulla</button>
              <button onClick={handleAdd} disabled={!newEan.trim()||!newCodAams}
                style={{...bt.pri,...(!newEan.trim()||!newCodAams?{background:'#CCC',cursor:'not-allowed'}:{})}}>Aggiungi</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position:'fixed', top:70, right:20, background:toast.type==='warn'?'#8B3A0F':C.green, color:'#fff', padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:500, zIndex:999 }}>{toast.msg}</div>}
    </div>
  );
}

const bt = {
  pri:{ padding:'8px 18px', background:'#1a1a1a', color:'#fff', border:'none', borderRadius:7, fontSize:12, cursor:'pointer', fontFamily:"'IBM Plex Mono',monospace", fontWeight:600 },
  sec:{ padding:'7px 14px', background:'none', border:'1px solid #E8E4DC', borderRadius:7, fontSize:12, cursor:'pointer', fontFamily:"'IBM Plex Mono',monospace", color:'#888' },
  ok:{ padding:'7px 14px', background:'#1a6b2e', color:'#fff', border:'none', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:"'IBM Plex Mono',monospace" },
  danger:{ padding:'7px 14px', background:'#C41E1E', color:'#fff', border:'none', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:"'IBM Plex Mono',monospace" },
};
