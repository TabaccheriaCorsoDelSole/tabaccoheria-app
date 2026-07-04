import { useState } from 'react';
import { login } from './supabaseClient';

const C = {
  font: "'IBM Plex Mono', monospace",
  bg: '#F7F5F0', white: '#fff', border: '#E8E4DC',
  text: '#1a1a1a', muted: '#888', red: '#C41E1E',
};

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setErrore('Inserisci email e password');
      return;
    }
    setLoading(true);
    setErrore(null);
    try {
      await login(email.trim(), password);
      onLogin();
    } catch (err) {
      setErrore(
        err.message === 'Invalid login credentials'
          ? 'Email o password errati'
          : `Errore: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: C.font, background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, justifyContent: 'center' }}>
          <span style={{ background: C.red, color: '#fff', fontWeight: 700, fontSize: 20, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>T</span>
          <span style={{ fontSize: 18, fontWeight: 600, color: C.text }}>Tabaccheria Bibione</span>
        </div>
        <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 28 }}>Accedi al gestionale</p>

        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '24px' }}>
          <p style={{ fontSize: 11, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</p>
          <input
            style={inputStyle}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="nome@esempio.it"
            autoComplete="email"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />

          <p style={{ fontSize: 11, color: C.muted, marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</p>
          <input
            style={inputStyle}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />

          {errore && (
            <div style={{ background: '#FDECEA', color: C.red, padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 16 }}>
              {errore}
            </div>
          )}

          <button
            style={{
              width: '100%', padding: '12px', marginTop: 20,
              background: loading ? '#999' : C.text, color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer', fontFamily: C.font,
            }}
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? 'Accesso in corso...' : 'Accedi →'}
          </button>
        </div>

        <p style={{ fontSize: 11, color: '#BBB', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
          Gli account vengono creati dal titolare.<br />
          Password dimenticata? Contatta il titolare.
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '11px 14px', fontSize: 14,
  border: `1.5px solid ${C.border}`, borderRadius: 8,
  fontFamily: C.font, outline: 'none', boxSizing: 'border-box',
  background: '#FAFAF8',
};
