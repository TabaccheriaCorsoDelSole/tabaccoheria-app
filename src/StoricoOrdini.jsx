import { useState } from "react";

function loadLS(key, fb) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fb; }
  catch { return fb; }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

const C = {
  font:"'IBM Plex Mono', monospace", bg:"#F7F5F0", white:"#fff",
  border:"#E8E4DC", borderLight:"#F0EDE6", text:"#1a1a1a",
  muted:"#888", red:"#C41E1E", green:"#1a6b2e",
};

export default function StoricoOrdini() {
  const [storico, setStorico] = useState(() => loadLS("storico_ordini", []));
  const [aperto, setAperto] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function elimina(id) {
    const nuovo = storico.filter(o => o.id !== id);
    setStorico(nuovo);
    saveLS("storico_ordini", nuovo);
    if (aperto?.id === id) setAperto(null);
    setConfirmDel(null);
  }

  function esportaCsv(ordine) {
    const lines = [
      `Ordine ${ordine.numero} · ${ordine.data} · Chiuso il ${ordine.chiusoIl}`,
      "",
      "Cod.AAMS\tProdotto\tPrezzo\tAttese\tRicevute\tDiff",
      ...ordine.items.map(i => `${i.codAams}\t${i.descrizione}\t${i.prezzoConf ? `€${i.prezzoConf.toFixed(2)}` : ""}\t${i.stecche}\t${i.ricevuto}\t${i.ricevuto - i.stecche}`)
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ordine_${ordine.numero}_${ordine.data.replace(/\./g,"")}.txt`;
    a.click(); URL.revokeObjectURL(url);
  }

  if (storico.length === 0) return (
    <div style={{ fontFamily:C.font, padding:"40px 20px", maxWidth:700, margin:"0 auto", textAlign:"center" }}>
      <p style={{ fontSize:32, marginBottom:12 }}>📦</p>
      <p style={{ fontSize:15, fontWeight:600, color:C.text, marginBottom:8 }}>Nessun ordine nello storico</p>
      <p style={{ fontSize:13, color:C.muted }}>Gli ordini chiusi appariranno qui dopo aver completato un ricevimento.</p>
    </div>
  );

  return (
    <div style={{ fontFamily:C.font, padding:"24px 20px", maxWidth:760, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <p style={{ fontSize:17, fontWeight:600, color:C.text }}>Storico ordini ricevuti</p>
          <p style={{ fontSize:12, color:C.muted, marginTop:3 }}>{storico.length} ordini archiviati</p>
        </div>
        {confirmDel === "all" ? (
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:12, color:C.muted }}>Eliminare tutto?</span>
            <button style={st.btnDanger} onClick={()=>{ setStorico([]); saveLS("storico_ordini",[]); setConfirmDel(null); setAperto(null); }}>Sì, elimina tutto</button>
            <button style={st.btnSec} onClick={()=>setConfirmDel(null)}>Annulla</button>
          </div>
        ) : (
          <button style={{ ...st.btnSec, fontSize:11, color:C.red }} onClick={()=>setConfirmDel("all")}>Elimina tutti</button>
        )}
      </div>

      {/* Lista ordini */}
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom: aperto ? 20 : 0 }}>
        {storico.map(ordine => {
          const ok = ordine.totaleRicevuto === ordine.totaleAtteso;
          const isOpen = aperto?.id === ordine.id;
          return (
            <div key={ordine.id} style={{ background:C.white, border:`1px solid ${isOpen ? "#97C459" : C.border}`, borderRadius:10, overflow:"hidden" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", cursor:"pointer" }}
                onClick={()=>setAperto(isOpen ? null : ordine)}>
                <div style={{ display:"flex", alignItems:"center", gap:14, flex:1, minWidth:0 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background: ok ? C.green : "#EF9F27", flexShrink:0 }} />
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:C.text }}>Ordine {ordine.numero}</p>
                    <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>Consegna {ordine.data} · Chiuso {ordine.chiusoIl}</p>
                  </div>
                </div>
                <div style={{ display:"flex", gap:16, alignItems:"center", flexShrink:0, marginLeft:12 }}>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ fontSize:12, fontWeight:600, color:C.text }}>{ordine.totaleRicevuto}/{ordine.totaleAtteso} stecche</p>
                    <p style={{ fontSize:11, color: ok ? C.green : "#EF9F27" }}>{ok ? "✓ Completo" : `${ordine.discrepanze} discrepanze`}</p>
                  </div>
                  <span style={{ color:C.muted, fontSize:16 }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Dettaglio espanso */}
              {isOpen && (
                <div style={{ borderTop:`1px solid ${C.border}`, padding:"14px 16px" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, marginBottom:14 }}>
                    <thead>
                      <tr>{["Cod.AAMS","Prodotto","Prezzo","Attese","Ricevute","Diff","Stato"].map(h=>
                        <th key={h} style={{ padding:"6px 8px", fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:"0.04em", borderBottom:`1px solid ${C.border}`, textAlign:"left" }}>{h}</th>
                      )}</tr>
                    </thead>
                    <tbody>
                      {ordine.items.map((item,i)=>{
                        const diff = item.ricevuto - item.stecche;
                        return (
                          <tr key={i} style={{ background: diff !== 0 ? "#FFFBF0" : "transparent" }}>
                            <td style={st.td}><code style={st.code}>{item.codAams}</code></td>
                            <td style={st.td}>{item.descrizione}</td>
                            <td style={st.td}>{item.prezzoConf ? `€ ${item.prezzoConf.toFixed(2)}` : "—"}</td>
                            <td style={{...st.td,textAlign:"center"}}>{item.stecche}</td>
                            <td style={{...st.td,textAlign:"center"}}>{item.ricevuto}</td>
                            <td style={{...st.td,textAlign:"center",fontWeight:600,color:diff===0?"#aaa":diff>0?C.green:C.red}}>{diff===0?"—":diff>0?`+${diff}`:diff}</td>
                            <td style={st.td}>
                              {item.ricevuto===item.stecche ? <span style={st.badgeOk}>✓ OK</span>
                                : item.ricevuto===0 ? <span style={st.badgePending}>—</span>
                                : <span style={st.badgeWarn}>{item.ricevuto>item.stecche?"Eccesso":"Parziale"}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <button style={st.btnPri} onClick={()=>esportaCsv(ordine)}>⬇ Esporta</button>
                    {confirmDel===ordine.id ? (
                      <>
                        <span style={{ fontSize:12, color:C.muted, alignSelf:"center" }}>Sicuro?</span>
                        <button style={st.btnDanger} onClick={()=>elimina(ordine.id)}>Elimina</button>
                        <button style={st.btnSec} onClick={()=>setConfirmDel(null)}>Annulla</button>
                      </>
                    ) : (
                      <button style={{ ...st.btnSec, color:C.red }} onClick={()=>setConfirmDel(ordine.id)}>Elimina</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const st = {
  td:{ padding:"8px 8px", borderBottom:"1px solid #F0EDE6" },
  code:{ background:"#F0EDE6", padding:"2px 6px", borderRadius:3, fontSize:10 },
  badgeOk:{ background:"#D4EDDA", color:C.green, padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:600 },
  badgePending:{ background:"#F0EDE6", color:C.muted, padding:"2px 8px", borderRadius:20, fontSize:10 },
  badgeWarn:{ background:"#FFF3CD", color:"#7B4F00", padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:600 },
  btnPri:{ padding:"7px 16px", background:C.text, color:"#fff", border:"none", borderRadius:6, fontSize:12, cursor:"pointer", fontFamily:C.font },
  btnSec:{ padding:"7px 14px", background:"none", border:`1px solid ${C.border}`, borderRadius:6, fontSize:12, cursor:"pointer", fontFamily:C.font, color:C.muted },
  btnDanger:{ padding:"7px 14px", background:C.red, color:"#fff", border:"none", borderRadius:6, fontSize:12, cursor:"pointer", fontFamily:C.font },
};
