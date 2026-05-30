import { useState } from "react";

// Prodotti caricati dal catalogo ADM
import { CATALOGO_ADM } from "./catalogoADM";
const DEMO_PRODOTTI = CATALOGO_ADM;

const S = {
  font: "'IBM Plex Mono', monospace",
  bg: "#F7F5F0", white: "#fff", border: "#E8E4DC", borderLight: "#F0EDE6",
  text: "#1a1a1a", muted: "#888", red: "#C41E1E", green: "#1a6b2e",
};

function loadCatalogo() {
  try { return JSON.parse(localStorage.getItem("catalogo_barcode") || "{}"); }
  catch { return {}; }
}
function saveCatalogo(cat) {
  try { localStorage.setItem("catalogo_barcode", JSON.stringify(cat)); } catch {}
}

export default function CatalogoBarcode() {
  const [catalogo, setCatalogo] = useState(loadCatalogo);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [editingEan, setEditingEan] = useState(null); // ean in modifica
  const [editCodAams, setEditCodAams] = useState("");
  const [newEan, setNewEan] = useState("");
  const [newCodAams, setNewCodAams] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  function update(newCat) {
    setCatalogo(newCat);
    saveCatalogo(newCat);
  }

  function handleDelete(ean) {
    const newCat = { ...catalogo };
    delete newCat[ean];
    update(newCat);
    setConfirmDelete(null);
    showToast("Barcode eliminato", "warn");
  }

  function handleEdit(ean) {
    setEditingEan(ean);
    setEditCodAams(catalogo[ean]);
  }

  function handleEditSave() {
    if (!editCodAams) return;
    const newCat = { ...catalogo, [editingEan]: editCodAams };
    update(newCat);
    setEditingEan(null);
    showToast("Abbinamento aggiornato");
  }

  function handleAdd() {
    if (!newEan.trim() || !newCodAams) return;
    const newCat = { ...catalogo, [newEan.trim()]: newCodAams };
    update(newCat);
    setNewEan("");
    setNewCodAams("");
    setShowAdd(false);
    showToast("Barcode aggiunto");
  }

  const entries = Object.entries(catalogo).filter(([ean, codAams]) => {
    if (!search) return true;
    const prod = DEMO_PRODOTTI.find(p => p.codAams === codAams);
    return ean.includes(search) || codAams.includes(search) ||
      (prod && prod.descrizione.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div style={{ fontFamily: S.font, padding: "24px 20px", maxWidth: 720, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ fontSize: 17, fontWeight: 600, color: S.text }}>Catalogo barcode</p>
          <p style={{ fontSize: 12, color: S.muted, marginTop: 3 }}>
            {Object.keys(catalogo).length} barcode abbinati · salvati nel browser
          </p>
        </div>
        <button
          style={{ padding: "8px 16px", background: S.text, color: "#fff", border: "none", borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: S.font }}
          onClick={() => setShowAdd(true)}
        >
          + Aggiungi barcode
        </button>
      </div>

      {/* Search */}
      <input
        style={{ width: "100%", padding: "9px 12px", fontSize: 13, border: `1.5px solid ${S.border}`, borderRadius: 7, background: S.white, fontFamily: S.font, outline: "none", marginBottom: 14, boxSizing: "border-box" }}
        placeholder="Cerca per EAN, codice AAMS o nome prodotto..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Lista */}
      {entries.length === 0 ? (
        <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: "40px 20px", textAlign: "center", color: S.muted, fontSize: 13 }}>
          {Object.keys(catalogo).length === 0
            ? "Nessun barcode ancora abbinato.\nScansiona una stecca durante il ricevimento oppure aggiungila manualmente."
            : "Nessun risultato per questa ricerca."}
        </div>
      ) : (
        <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, overflow: "hidden" }}>
          {/* Header tabella */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr 90px", gap: 0, padding: "8px 14px", background: "#FAFAF8", borderBottom: `1px solid ${S.border}` }}>
            {["Barcode EAN", "Cod.AAMS", "Prodotto", ""].map(h => (
              <span key={h} style={{ fontSize: 10, color: S.muted, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>{h}</span>
            ))}
          </div>

          {entries.map(([ean, codAams], i) => {
            const prod = DEMO_PRODOTTI.find(p => p.codAams === codAams);
            const isEditing = editingEan === ean;
            const isLast = i === entries.length - 1;

            return (
              <div key={ean} style={{ borderBottom: isLast ? "none" : `1px solid ${S.borderLight}`, padding: "10px 14px", background: isEditing ? "#FFFBF0" : S.white }}>
                {isEditing ? (
                  /* Modalità modifica */
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <code style={{ background: "#FFF3CD", color: "#7B4F00", padding: "3px 10px", borderRadius: 20, fontSize: 12 }}>{ean}</code>
                      <span style={{ color: S.muted, fontSize: 12 }}>→ abbina a:</span>
                      <select
                        value={editCodAams}
                        onChange={e => setEditCodAams(e.target.value)}
                        style={{ padding: "5px 8px", fontSize: 12, border: `1.5px solid ${S.border}`, borderRadius: 6, fontFamily: S.font, flex: 1, minWidth: 200 }}
                      >
                        <option value="">Seleziona prodotto...</option>
                        {DEMO_PRODOTTI.map(p => (
                          <option key={p.codAams} value={p.codAams}>{p.descrizione} ({p.codAams})</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleEditSave} style={{ padding: "6px 16px", background: S.green, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: S.font }}>Salva</button>
                      <button onClick={() => setEditingEan(null)} style={{ padding: "6px 14px", background: "none", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: S.font, color: S.muted }}>Annulla</button>
                    </div>
                  </div>
                ) : confirmDelete === ean ? (
                  /* Conferma eliminazione */
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: S.text }}>Eliminare <code style={{ background: "#FDECEA", color: S.red, padding: "1px 6px", borderRadius: 4 }}>{ean}</code>?</span>
                    <button onClick={() => handleDelete(ean)} style={{ padding: "5px 14px", background: S.red, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: S.font }}>Elimina</button>
                    <button onClick={() => setConfirmDelete(null)} style={{ padding: "5px 12px", background: "none", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: S.font, color: S.muted }}>Annulla</button>
                  </div>
                ) : (
                  /* Riga normale */
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr 90px", alignItems: "center", gap: 0 }}>
                    <code style={{ background: "#FFF3CD", color: "#7B4F00", padding: "2px 8px", borderRadius: 20, fontSize: 12, display: "inline-block", width: "fit-content" }}>{ean}</code>
                    <code style={{ fontSize: 11, color: S.muted, background: S.borderLight, padding: "2px 6px", borderRadius: 3, display: "inline-block", width: "fit-content" }}>{codAams}</code>
                    <span style={{ fontSize: 13, color: S.text }}>{prod?.descrizione || <span style={{ color: S.muted, fontStyle: "italic" }}>Prodotto non nel catalogo</span>}</span>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button onClick={() => handleEdit(ean)} style={{ padding: "4px 10px", background: "none", border: `1px solid ${S.border}`, borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: S.font, color: S.muted }}>Modifica</button>
                      <button onClick={() => setConfirmDelete(ean)} style={{ padding: "4px 10px", background: "none", border: `1px solid #F09595`, borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: S.font, color: S.red }}>Elimina</button>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: S.white, borderRadius: 12, padding: 24, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: S.text, marginBottom: 4 }}>Aggiungi barcode manualmente</p>
            <p style={{ fontSize: 12, color: S.muted, marginBottom: 20 }}>Utile se conosci già il codice EAN della stecca</p>

            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, color: S.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Codice EAN (barcode stecca)</p>
              <input
                autoFocus
                style={{ width: "100%", padding: "9px 12px", fontSize: 13, border: `1.5px solid ${S.border}`, borderRadius: 7, fontFamily: S.font, outline: "none", boxSizing: "border-box" }}
                placeholder="es. 8000070050016"
                value={newEan}
                onChange={e => setNewEan(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: S.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Prodotto</p>
              <select
                value={newCodAams}
                onChange={e => setNewCodAams(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", fontSize: 13, border: `1.5px solid ${S.border}`, borderRadius: 7, fontFamily: S.font, outline: "none", boxSizing: "border-box" }}
              >
                <option value="">Seleziona prodotto...</option>
                {DEMO_PRODOTTI.map(p => (
                  <option key={p.codAams} value={p.codAams}>{p.descrizione} · AAMS {p.codAams}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowAdd(false); setNewEan(""); setNewCodAams(""); }} style={{ padding: "9px 18px", background: "none", border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 13, cursor: "pointer", fontFamily: S.font, color: S.muted }}>Annulla</button>
              <button
                onClick={handleAdd}
                disabled={!newEan.trim() || !newCodAams}
                style={{ padding: "9px 20px", background: !newEan.trim() || !newCodAams ? "#CCC" : S.text, color: "#fff", border: "none", borderRadius: 7, fontSize: 13, cursor: !newEan.trim() || !newCodAams ? "not-allowed" : "pointer", fontFamily: S.font, fontWeight: 600 }}
              >
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 70, right: 20, background: toast.type === "warn" ? "#8B3A0F" : S.green, color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", zIndex: 999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
