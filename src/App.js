import { useState, useEffect } from 'react';
import { supabase, getUtenteCorrente, logout } from './supabaseClient';
import Login from './Login';
import RicevimentoMerce from './RicevimentoMerce';
import CatalogoBarcode from './CatalogoBarcode';
import StoricoOrdini from './StoricoOrdini';

const RED = "#C41E1E";
const FONT = "'IBM Plex Mono', monospace";

export default function App() {
  const [page, setPage] = useState('ricevimento');
  const [utente, setUtente] = useState(null);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    // Controlla sessione esistente
    verificaUtente();
    // Ascolta cambi di auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) verificaUtente();
      else setUtente(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function verificaUtente() {
    try {
      const u = await getUtenteCorrente();
      setUtente(u);
    } catch {
      setUtente(null);
    } finally {
      setCaricamento(false);
    }
  }

  async function handleLogout() {
    await logout();
    setUtente(null);
    setPage('ricevimento');
  }

  // Schermata caricamento
  if (caricamento) return (
    <div style={{ fontFamily: FONT, minHeight: '100vh', background: '#F7F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 14, color: '#888' }}>Caricamento...</p>
    </div>
  );

  // Non autenticato → login
  if (!utente) return <Login onLogin={verificaUtente} />;

  const isTitolare = utente.profilo?.ruolo === 'titolare';

  const nav = [
    { id: 'ricevimento', label: '📦 Ricevimento' },
    { id: 'storico',     label: '🗂 Storico ordini' },
    { id: 'catalogo',    label: '🔖 Catalogo barcode' },
    { id: 'magazzino',   label: '🗄 Magazzino',   soon: true },
    { id: 'ordini',      label: '📋 Ordini auto',  soon: true, soloTitolare: true },
    { id: 'statistiche', label: '📊 Statistiche',  soon: true, soloTitolare: true },
  ].filter(n => !n.soloTitolare || isTitolare);

  return (
    <div style={{ fontFamily: FONT, minHeight: '100vh', background: '#F7F5F0' }}>
      <div style={{ background: '#111', borderBottom: '1px solid #333', padding: '0 16px', display: 'flex', alignItems: 'center', overflowX: 'auto' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px 12px 0', marginRight: 16, borderRight: '1px solid #333', flexShrink: 0 }}>
          <span style={{ background: RED, color: '#fff', fontWeight: 700, fontSize: 14, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>T</span>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Tabaccheria Bibione</span>
        </div>
        {/* Nav */}
        {nav.map(n => (
          <button key={n.id}
            onClick={() => !n.soon && setPage(n.id)}
            style={{
              background: 'none', border: 'none', padding: '14px 14px',
              fontSize: 12, cursor: n.soon ? 'default' : 'pointer',
              color: page === n.id ? '#fff' : '#888',
              borderBottom: page === n.id ? `2px solid ${RED}` : '2px solid transparent',
              fontFamily: FONT, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
            }}>
            {n.label}
            {n.soon && <span style={{ fontSize: 9, background: '#333', color: '#666', padding: '1px 5px', borderRadius: 20 }}>presto</span>}
          </button>
        ))}

        {/* Utente + logout */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, paddingLeft: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>{utente.profilo?.nome || utente.email}</p>
            <p style={{ color: '#666', fontSize: 10 }}>{isTitolare ? '👑 Titolare' : 'Dipendente'}</p>
          </div>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: '1px solid #444', color: '#888', padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: FONT }}>
            Esci
          </button>
        </div>
      </div>

      {page === 'ricevimento' && <RicevimentoMerce utente={utente} />}
      {page === 'storico'     && <StoricoOrdini utente={utente} isTitolare={isTitolare} />}
      {page === 'catalogo'    && <CatalogoBarcode utente={utente} />}
    </div>
  );
}
