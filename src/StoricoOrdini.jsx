import { useState, useEffect } from "react";
import { caricaOrdini, eliminaOrdine, urlFoto } from "./supabaseClient";

const C = {
  font:"'IBM Plex Mono', monospace", bg:"#F7F5F0", white:"#fff",
  border:"#E8E4DC", borderLight:"#F0EDE6", text:"#1a1a1a",
  muted:"#888", red:"#C41E1E", green:"#1a6b2e",
};

export default function StoricoOrdini({ utente, isTitolare }) {
  const [storico, setStorico] = useState([]);
  const [aperto, setAperto] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    caricaOrdini().then(setStorico).catch(() => setStorico([]));
  }, []);

  async function elimina(id) {
    try {
      await eliminaOrdine(id);
      setStorico(storico.filter(o => o.id !== id));
      if (aperto?.id === id) setAperto(null);
    } catch (err) {
      alert('Solo il titolare può eliminare ordini');
    }
    setConfirmDel(null);
  }

  async function eliminaTutti() {
    try {
      for (const o of storico) await eliminaOrdine(o.id);
      setStorico([]);
      setAperto(null);
    } catch (err) {
      alert('Solo il titolare può eliminare ordini');
    }
    setConfirmDel(null);
  }

  function esporta(ordine) {
    const lines = [
      `Ordine ${ordine.numero} · ${ordine.data} · Chiuso ${ordine.chiusoIl}`, '',
      'Cod.AAMS\tProdotto\tPrezzo\tAttese\tRicevute\tDiff',
      ...ordine.items.map(i => `${i.codAams}\t${i.descrizione}\t${i.prezzoConf ? `€${i.prezzoConf.toFixed(2)}` : ''}\t${i.stecche}\t${i.ricevuto}\t${i.ricevuto - i.stecche}`)
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ordine_${ordine.numero}.txt`;
    a.click(); URL.revokeObjectURL(url);
  }

  if (storico.length === 0) return (
    <div style={{ fontFamily:C.font, padding:'60px 20px', textAlign:'center' }}>
      <p style={{ fontSize:32, marginBottom:12 }}>📦</p>
      <p style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>Nessun ordine nello storico</p>
      <p style={{ fontSize:13, color:C.muted }}>Gli ordini chiusi appariranno qui dopo aver completato un ricevimento.</p>
    </div>
  );

  return (
    <div style={{ fontFamily:C.font, padding:'24px 20px', maxWidth:760, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <p style={{ fontSize:17, fontWeight:600 }}>Storico ordini ricevuti</p>
          <p style={{ fontSize:12, color:C.muted, marginTop:3 }}>{storico.length} ordini archiviati</p>
        </div>
        {confirmDel==='all'
          ? <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:12, color:C.muted }}>Eliminare tutto?</span>
              <button style={bt.danger} onClick={eliminaTutti}>Sì</button>
              <button style={bt.sec} onClick={()=>setConfirmDel(null)}>No</button>
            </div>
          : <button style={{ ...bt.sec, fontSize:11, color:C.red }} onClick={()=>setConfirmDel('all')}>Elimina tutti</button>
        }
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {storico.map(ordine => {
          const ok = ordine.totaleRicevuto === ordine.totaleAtteso;
          const isOpen = aperto?.id === ordine.id;
          return (
            <div key={ordine.id} style={{ background:C.white, border:`1px solid ${isOpen?'#97C459':C.border}`, borderRadius:10, overflow:'hidden' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', cursor:'pointer' }}
                onClick={()=>setAperto(isOpen?null:ordine)}>
                <div style={{ display:'flex', alignItems:'center', gap:14, flex:1 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:ok?C.green:'#EF9F27', flexShrink:0 }} />
                  <div>
                    <p style={{ fontSize:13, fontWeight:600 }}>Ordine {ordine.numero}</p>
                    <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>Consegna {ordine.data} · Chiuso {ordine.chiusoIl}</p>
                  </div>
                </div>
                <div style={{ display:'flex', gap:16, alignItems:'center', marginLeft:12, flexShrink:0 }}>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:12, fontWeight:600 }}>{ordine.totaleRicevuto}/{ordine.totaleAtteso} stecche</p>
                    <p style={{ fontSize:11, color:ok?C.green:'#EF9F27' }}>{ok?'✓ Completo':`${ordine.discrepanze} discrepanze`}</p>
                  </div>
                  <span style={{ color:C.muted }}>{isOpen?'▲':'▼'}</span>
                </div>
              </div>

              {isOpen && (
                <div style={{ borderTop:`1px solid ${C.border}`, padding:'14px 16px' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, marginBottom:14 }}>
                    <thead><tr>{['Cod.AAMS','Prodotto','Prezzo','Attese','Ricevute','Diff','Stato'].map(h=>
                      <th key={h} style={{ padding:'6px 8px', fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:'0.04em', borderBottom:`1px solid ${C.border}`, textAlign:'left' }}>{h}</th>
                    )}</tr></thead>
                    <tbody>
                      {ordine.items.map((item,i)=>{
                        const diff=item.ricevuto-item.stecche;
                        return (
                          <tr key={i} style={diff!==0?{background:'#FFFBF0'}:{}}>
                            <td style={bt.td}><code style={{ background:C.borderLight, padding:'2px 5px', borderRadius:3, fontSize:10 }}>{item.codAams}</code></td>
                            <td style={bt.td}>{item.descrizione}</td>
                            <td style={bt.td}>{item.prezzoConf?`€ ${item.prezzoConf.toFixed(2)}`:'—'}</td>
                            <td style={{...bt.td,textAlign:'center'}}>{item.stecche}</td>
                            <td style={{...bt.td,textAlign:'center'}}>{item.ricevuto}</td>
                            <td style={{...bt.td,textAlign:'center',fontWeight:600,color:diff===0?'#aaa':diff>0?C.green:C.red}}>{diff===0?'—':diff>0?`+${diff}`:diff}</td>
                            <td style={bt.td}>
                              {item.ricevuto===item.stecche?<span style={bt.badgeOk}>✓ OK</span>
                                :item.ricevuto===0?<span style={bt.badgePend}>—</span>
                                :<span style={bt.badgeWarn}>{item.ricevuto>item.stecche?'Eccesso':'Parziale'}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {ordine.noteDiscrepanze && (
                    <div style={{ background:'#FFFBF0', border:'1px solid #EF9F27', borderRadius:8, padding:'10px 12px', marginBottom:12, fontSize:12, color:'#7B4F00' }}>
                      <b>Note discrepanze:</b> {ordine.noteDiscrepanze}
                    </div>
                  )}
                  {ordine.foto && ordine.foto.length > 0 && (
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                      {ordine.foto.map((f, fi) => (
                        <button key={fi} style={{ ...bt.sec, fontSize:11 }}
                          onClick={async () => {
                            try { const u = await urlFoto(f.nome); window.open(u, '_blank'); }
                            catch { alert('Foto non disponibile'); }
                          }}>
                          📷 {f.tipo === 'bolla' ? 'Bolla' : 'Discrepanza'} {fi + 1}
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button style={bt.pri} onClick={()=>esporta(ordine)}>⬇ Esporta</button>
                    {confirmDel===ordine.id
                      ? <><span style={{ fontSize:12, color:C.muted, alignSelf:'center' }}>Sicuro?</span>
                          <button style={bt.danger} onClick={()=>elimina(ordine.id)}>Elimina</button>
                          <button style={bt.sec} onClick={()=>setConfirmDel(null)}>Annulla</button>
                        </>
                      : <button style={{...bt.sec,color:C.red}} onClick={()=>setConfirmDel(ordine.id)}>Elimina</button>
                    }
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

const bt = {
  td:{ padding:'8px 8px', borderBottom:'1px solid #F0EDE6' },
  badgeOk:{ background:'#D4EDDA', color:'#1a6b2e', padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:600 },
  badgePend:{ background:'#F0EDE6', color:'#888', padding:'2px 8px', borderRadius:20, fontSize:10 },
  badgeWarn:{ background:'#FFF3CD', color:'#7B4F00', padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:600 },
  pri:{ padding:'7px 16px', background:'#1a1a1a', color:'#fff', border:'none', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:"'IBM Plex Mono',monospace" },
  sec:{ padding:'7px 14px', background:'none', border:'1px solid #E8E4DC', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:"'IBM Plex Mono',monospace", color:'#888' },
  danger:{ padding:'7px 14px', background:'#C41E1E', color:'#fff', border:'none', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:"'IBM Plex Mono',monospace" },
};
