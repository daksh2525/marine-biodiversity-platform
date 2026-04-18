import { useState, useRef, useCallback } from "react";
import { identifySpecies, getSpeciesHistory, deleteSpeciesRecord } from "../services/api";
import "../styles/SpeciesIdentifier.css";

const CONSERVATION_COLOR = {
  "Least Concern":  "#2e7d32",
  "Near Threatened":"#f57f17",
  "Vulnerable":     "#e65100",
  "Endangered":     "#c62828",
  "Not evaluated":  "#607d8b",
};

export default function SpeciesIdentifier() {
  const [file,       setFile]       = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [dragOver,   setDragOver]   = useState(false);
  const [history,    setHistory]    = useState([]);
  const [histLoading,setHistLoading]= useState(false);
  const [showHistory,setShowHistory]= useState(false);
  const [deleting,   setDeleting]   = useState(null);
  const inputRef = useRef();

  // ── Load history ─────────────────────────────────────────────────────────
  const loadHistory = () => {
    setHistLoading(true);
    getSpeciesHistory()
      .then((d) => { setHistory(d); setHistLoading(false); })
      .catch(() => setHistLoading(false));
  };

  const toggleHistory = () => {
    if (!showHistory) loadHistory();
    setShowHistory((v) => !v);
  };

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFile = useCallback((f) => {
    if (!f) return;
    const allowed = ["image/jpeg","image/png","image/webp"];
    if (!allowed.includes(f.type)) {
      setError("Only JPG, PNG or WEBP images are supported."); return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB."); return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError("");
  }, []);

  const onInputChange = (e) => handleFile(e.target.files[0]);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave= ()  => setDragOver(false);

  const clearImage = () => {
    setFile(null); setPreview(null);
    setResult(null); setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── Identify ──────────────────────────────────────────────────────────────
  const handleIdentify = async () => {
    if (!file) { setError("Please upload a fish image first."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await identifySpecies(file);
      setResult(res);
      if (showHistory) loadHistory();
    } catch (e) {
      setError(e.response?.data?.error || "Identification failed. Is Flask running?");
    } finally {
      setLoading(false);
    }
  };

  // ── Delete history ────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteSpeciesRecord(id);
      setHistory((h) => h.filter((r) => r._id !== id));
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  return (
    <div className="species-page">
      <div className="species-header">
        <h1>🐠 Fish Species Identifier</h1>
        <p>Upload a fish photo and our AI will identify the species using deep learning</p>
      </div>

      <div className="species-grid">
        {/* ── Left: Upload ── */}
        <div className="species-upload-col">
          <div
            className={`drop-zone ${dragOver ? "drag-over" : ""} ${preview ? "has-preview" : ""}`}
            onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
            onClick={() => !preview && inputRef.current?.click()}
          >
            {preview ? (
              <div className="preview-wrapper">
                <img src={preview} alt="Fish preview" className="fish-preview" />
                <button className="btn-clear" onClick={(e) => { e.stopPropagation(); clearImage(); }}>
                  ✕ Remove
                </button>
              </div>
            ) : (
              <div className="drop-hint">
                <span className="drop-icon">📷</span>
                <p>Drag & drop a fish image here</p>
                <p className="drop-sub">or click to browse</p>
                <p className="drop-formats">JPG, PNG, WEBP — max 10 MB</p>
              </div>
            )}
          </div>

          <input
            ref={inputRef} type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onInputChange} style={{ display: "none" }}
          />

          {!preview && (
            <button className="btn-browse" onClick={() => inputRef.current?.click()}>
              📁 Browse Image
            </button>
          )}

          <button
            className="btn-identify"
            onClick={handleIdentify}
            disabled={!file || loading}
          >
            {loading
              ? <><span className="spinner" /> Identifying…</>
              : "🔬 Identify Species"}
          </button>

          {error && <div className="species-error">{error}</div>}
        </div>

        {/* ── Right: Result ── */}
        <div className="species-result-col">
          {!result && !loading && (
            <div className="result-placeholder">
              <span>🐟</span>
              <p>Upload a fish image and click<br />"Identify Species" to see results</p>
            </div>
          )}

          {loading && (
            <div className="result-placeholder">
              <div className="big-spinner" />
              <p>Analysing image…</p>
            </div>
          )}

          {result && !loading && (
            <div className="result-card-species">
              {/* Main result */}
              <div className="result-top">
                <div className="result-names">
                  <h2>{result.common_name}</h2>
                  <p className="scientific-name">
                    <em>{result.scientific_name}</em>
                  </p>
                </div>
                <div
                  className="conservation-badge"
                  style={{ background: CONSERVATION_COLOR[result.conservation] ?? "#607d8b" }}
                >
                  {result.conservation}
                </div>
              </div>

              {/* Confidence bar */}
              <div className="confidence-section">
                <div className="confidence-label">
                  <span>AI Confidence</span>
                  <strong>{result.confidence.toFixed(1)}%</strong>
                </div>
                <div className="confidence-bar-bg">
                  <div
                    className="confidence-bar-fill"
                    style={{
                      width: `${result.confidence}%`,
                      background: result.confidence >= 80 ? "#2e7d32"
                                : result.confidence >= 50 ? "#f57f17"
                                : "#c62828",
                    }}
                  />
                </div>
              </div>

              {/* Info grid */}
              <div className="info-grid">
                <div className="info-item">
                  <span>🌊 Habitat</span>
                  <strong>{result.habitat}</strong>
                </div>
                <div className="info-item">
                  <span>🛡️ Conservation</span>
                  <strong style={{ color: CONSERVATION_COLOR[result.conservation] }}>
                    {result.conservation}
                  </strong>
                </div>
              </div>

              {/* Description */}
              <p className="species-description">{result.description}</p>

              {/* Top 3 */}
              {result.top3?.length > 0 && (
                <div className="top3-section">
                  <h4>Top Predictions</h4>
                  {result.top3.map((t) => (
                    <div className="top3-row" key={t.rank}>
                      <span className="top3-rank">#{t.rank}</span>
                      <span className="top3-name">{t.common_name}</span>
                      <div className="top3-bar-bg">
                        <div
                          className="top3-bar-fill"
                          style={{ width: `${t.confidence}%`, opacity: 1 - (t.rank - 1) * 0.25 }}
                        />
                      </div>
                      <span className="top3-pct">{t.confidence.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── History Section ── */}
      <div className="species-history-section">
        <button className="btn-toggle-history" onClick={toggleHistory}>
          {showHistory ? "▲ Hide History" : "▼ Show Identification History"}
        </button>

        {showHistory && (
          <div className="species-history">
            {histLoading ? (
              <p className="loading-text">Loading history…</p>
            ) : history.length === 0 ? (
              <p className="loading-text">No identifications yet.</p>
            ) : (
              <div className="history-cards">
                {history.map((r) => (
                  <div className="history-card" key={r._id}>
                    <div className="hc-top">
                      <div>
                        <strong>{r.common_name}</strong>
                        <em>{r.scientific_name}</em>
                      </div>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(r._id)}
                        disabled={deleting === r._id}
                      >
                        {deleting === r._id ? "…" : "✕"}
                      </button>
                    </div>
                    <div className="hc-meta">
                      <span
                        className="badge"
                        style={{ background: CONSERVATION_COLOR[r.conservation] ?? "#607d8b" }}
                      >
                        {r.conservation}
                      </span>
                      <span className="hc-conf">{r.confidence.toFixed(1)}% confidence</span>
                    </div>
                    <div className="confidence-bar-bg" style={{ marginTop: ".4rem" }}>
                      <div
                        className="confidence-bar-fill"
                        style={{
                          width: `${r.confidence}%`,
                          background: r.confidence >= 80 ? "#2e7d32" : r.confidence >= 50 ? "#f57f17" : "#c62828",
                        }}
                      />
                    </div>
                    <p className="hc-date">{new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}