import { useState } from 'react';
import RicevimentoMerce from './RicevimentoMerce';

const S = {
  font: "'IBM Plex Mono', monospace",
  bg: "#F7F5F0", white: "#fff", border: "#E8E4DC",
  text: "#1a1a1a", muted: "#888", red: "#C41E1E",
};

export default function App() {
  const [page, setPage] = useState('ricevimento');

  const nav = [
    { id: 'ricevimento', label: '📦 Ricevimento Logista' },
    { id: 'magazzino',   label: '🗄 Magazzino',   soon: true },
    { id: 'ordini',      label: '📋 Ordini',       soon: true },
    { id: 'statistiche', label: '📊 Statistiche',  soon: true },
  ];

  return (
    <div style={{ fontFamily: S.font, minHeight: '100vh', background: S.bg }}>
      {/* Top nav */}
      <div style={{ background: '#111', borderBottom: '1px solid #333', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px 12px 0', marginRight: 20, borderRight: '1px solid #333', flexShrink: 0 }}>
          <span style={{ background: S.red, color: '#fff', fontWeight: 700, fontSize: 14, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>T</span>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Tabaccheria Bibione</span>
        </div>
        {nav.map(n => (
          <button key={n.id}
            onClick={() => !n.soon && setPage(n.id)}
            style={{
              background: 'none', border: 'none', padding: '14px 16px',
              fontSize: 12, cursor: n.soon ? 'default' : 'pointer',
              color: page === n.id ? '#fff' : '#888',
              borderBottom: page === n.id ? `2px solid ${S.red}` : '2px solid transparent',
              fontFamily: S.font, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {n.label}
            {n.soon && <span style={{ fontSize: 9, background: '#333', color: '#888', padding: '1px 5px', borderRadius: 20 }}>presto</span>}
          </button>
        ))}
      </div>

      {/* Page content */}
      {page === 'ricevimento' && <RicevimentoMerce />}
    </div>
  );
}
