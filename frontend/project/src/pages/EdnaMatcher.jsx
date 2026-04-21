import { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import "../styles/EdnaMatcher.css";

const EXPRESS = "http://localhost:5002/api";

const SAMPLE_SEQ = "ATGCTTGTATTTGTACTAATCCTTGCAGTCATAGCTCATACTATGCTTATTCCAACTTGCCTTGCAATAGCACATGCCATGCTAATCCCAACCTGCCTGGCAATAGCACATACCATGCTAATCCCGACC";

const CONSERVATION_COLOR = {
  "Least Concern":   "#2e7d32",
  "Near Threatened": "#f57f17",
  "Vulnerable":      "#e65100",
  "Endangered":      "#c62828",
  "Not evaluated":   "#607d8b",
};

export default function EdnaMatcher() {
  const [seq,       setSeq]       = useState("");
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [status,    setStatus]    = useState("");
  const [error,     setError]     = useState("");
  const [seqError,  setSeqError]  = useState("");
  const [history,   setHistory]   = useState([]);
  const [showHist,  setShowHist]  = useState(false);
  const [filter,    setFilter]    = useState("");
  const [deleting,  setDeleting]  = useState(null);

  // ── Sequence validation ────────────────────────────────────────────────────
  const validateSeq = (s) => {
    const clean = s.toUpperCase().replace(/\s/g, "");
    if (!clean) { setSeqError(""); return; }
    const invalid = [...new Set(clean)].filter(c => !"ATCGN".includes(c));
    if (invalid.length)
      setSeqError(`Invalid characters: ${invalid.join(", ")} — Only A, T, C, G, N allowed`);
    else if (clean.length < 50)
      setSeqError(`Sequence too short (${clean.length} bp — minimum 50 bp)`);
    else
      setSeqError("");
  };

  const onSeqChange = (e) => {
    setSeq(e.target.value);
    validateSeq(e.target.value);
    setResult(null); setError("");
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const liveStats = () => {
    const clean = seq.toUpperCase().replace(/\s/g, "");
    if (!clean) return null;
    const gc = ((clean.split("G").length - 1 + clean.split("C").length - 1) / clean.length * 100).toFixed(1);
    const at = ((clean.split("A").length - 1 + clean.split("T").length - 1) / clean.length * 100).toFixed(1);
    return { length: clean.length, gc, at };
  };

  // ── Match ──────────────────────────────────────────────────────────────────
  const handleMatch = async () => {
    if (!seq.trim()) { setError("Please enter a DNA sequence."); return; }
    if (seqError)    { setError(seqError); return; }
    setLoading(true); setError(""); setResult(null);
    setStatus("🔍 Validating sequence...");
    try {
      setStatus("📡 Submitting to NCBI BLAST (may take 15–30s)...");
      const res = await axios.post(`${EXPRESS}/match-edna`,
        { dna_sequence: seq.trim() }, { timeout: 35000 });
      setResult(res.data);
      setStatus("");
    } catch (e) {
      setError(e.response?.data?.error || "Matching failed. Is Flask running?");
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  // ── History ────────────────────────────────────────────────────────────────
  const loadHistory = () =>
    axios.get(`${EXPRESS}/edna-history`).then(r => setHistory(r.data)).catch(() => {});

  useEffect(() => { if (showHist) loadHistory(); }, [showHist]);
  useEffect(() => { if (result)   loadHistory(); }, [result]);

  const handleDelete = async (id) => {
    setDeleting(id);
    await axios.delete(`${EXPRESS}/edna-history/${id}`).catch(() => {});
    setHistory(h => h.filter(r => r._id !== id));
    setDeleting(null);
  };

  const exportCSV = () => {
    const h    = ["Date","Species","Scientific","Match%","E-value","Method","Conservation"];
    const rows = history.map(r => [
      new Date(r.createdAt).toLocaleString(),
      r.species_name, r.scientific_name,
      r.match_percentage, r.e_value ?? "N/A",
      r.method_used, r.conservation_status,
    ]);
    const csv = [h, ...rows].map(r => r.join(",")).join("\n");
    const a   = document.createElement("a");
    a.href    = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = "edna_history.csv"; a.click();
  };

  const stats    = liveStats();
  const filtered = filter
    ? history.filter(r => r.species_name?.toLowerCase().includes(filter.toLowerCase())
                       || r.scientific_name?.toLowerCase().includes(filter.toLowerCase()))
    : history;

  return (
    <div className="edna-page">
      <div className="edna-header">
        <h1>🧬 eDNA Species Matcher</h1>
        <p>Paste a DNA sequence from a water sample — AI matches it against NCBI GenBank and our local Indian marine fish database</p>
      </div>

      <div className="edna-grid">
        {/* Input */}
        <div className="edna-card">
          <div className="seq-label-row">
            <h3>DNA Sequence Input</h3>
            <button className="btn-sample" onClick={() => { setSeq(SAMPLE_SEQ); validateSeq(SAMPLE_SEQ); setResult(null); }}>
              Load Sample
            </button>
          </div>

          <textarea
            className={`seq-input ${seqError ? "invalid" : seq.length > 49 && !seqError ? "valid" : ""}`}
            value={seq}
            onChange={onSeqChange}
            placeholder="Paste DNA sequence here...&#10;Example: ATGCTTGTATTTGTACTAATCC..."
            rows={8}
            spellCheck={false}
          />

          {seqError && <div className="seq-error">⚠️ {seqError}</div>}

          {/* Live stats */}
          {stats && !seqError && (
            <div className="seq-stats">
              <span>Length: <b>{stats.length} bp</b></span>
              <span>GC: <b>{stats.gc}%</b></span>
              <span>AT: <b>{stats.at}%</b></span>
              <span className={stats.length >= 100 ? "good" : "warn"}>
                {stats.length >= 100 ? "✅ Good quality" : "⚠️ Short sequence"}
              </span>
            </div>
          )}

          <button className="btn-match" onClick={handleMatch}
            disabled={loading || !!seqError || !seq.trim()}>
            {loading
              ? <><span className="spinner" /> {status || "Matching…"}</>
              : "🔬 Match Species"}
          </button>

          {!loading && status && <p className="status-msg">{status}</p>}
          {error && <div className="edna-error">{error}</div>}
        </div>

        {/* Result */}
        <div>
          {!result && !loading && (
            <div className="edna-placeholder">
              <span>🧬</span>
              <p>Paste a DNA sequence and click<br />"Match Species" to identify</p>
            </div>
          )}
          {loading && (
            <div className="edna-placeholder">
              <div className="big-spin" />
              <p>{status || "Searching database…"}</p>
            </div>
          )}

          {result && (
            <>
              {/* Main result */}
              <div className="edna-card result-main">
                <div className="res-top">
                  <div>
                    <h2>{result.species_name}</h2>
                    <em className="sci-name">{result.scientific_name}</em>
                  </div>
                  <span className={`method-badge ${result.method_used === "NCBI" ? "ncbi" : "local"}`}>
                    {result.method_used === "NCBI" ? "🌐 NCBI BLAST" : "📁 Local DB"}
                  </span>
                </div>

                {/* Match bar */}
                <div className="match-label">
                  <span>Match Percentage</span>
                  <strong>{result.match_percentage}%</strong>
                </div>
                <div className="match-bg">
                  <div className="match-fill" style={{
                    width: `${result.match_percentage}%`,
                    background: result.match_percentage >= 90 ? "#2e7d32"
                              : result.match_percentage >= 70 ? "#f57f17" : "#c62828",
                  }} />
                </div>

                {result.e_value != null && (
                  <p className="evalue">
                    E-value: <b>{result.e_value.toExponential(2)}</b>
                    <span className="tooltip" title="Lower = better match. Values &lt; 0.001 indicate significant similarity."> ℹ️</span>
                  </p>
                )}

                <div className="cons-row">
                  <span className="cons-badge"
                    style={{ background: CONSERVATION_COLOR[result.conservation_status] ?? "#607d8b" }}>
                    {result.conservation_status}
                  </span>
                </div>

                <p className="species-desc">{result.description}</p>
              </div>

              {/* Sequence stats from API */}
              {result.sequence_stats && (
                <div className="edna-card">
                  <h3>📊 Sequence Statistics</h3>
                  <div className="seq-stat-grid">
                    {[
                      { label: "Length",      value: `${result.sequence_stats.length} bp` },
                      { label: "GC Content",  value: `${result.sequence_stats.gc_content}%` },
                      { label: "AT Content",  value: `${result.sequence_stats.at_content}%` },
                      { label: "N Content",   value: `${result.sequence_stats.n_content}%` },
                      { label: "Quality",     value: result.sequence_stats.quality,
                        color: result.sequence_stats.quality === "Good" ? "#2e7d32"
                             : result.sequence_stats.quality === "Moderate" ? "#f57f17"
                             : "#c62828" },
                    ].map(s => (
                      <div className="sstat" key={s.label}>
                        <span>{s.label}</span>
                        <strong style={s.color ? { color: s.color } : {}}>{s.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mini map */}
              {result.found_locations?.length > 0 && (
                <div className="edna-card">
                  <h3>🗺️ Species Distribution — Indian Ocean</h3>
                  <MapContainer center={[12, 78]} zoom={5}
                    style={{ height: "280px", borderRadius: "10px" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap' />
                    {result.found_locations.map((loc, i) => (
                      <CircleMarker key={i} center={[loc[0], loc[1]]} radius={10}
                        pathOptions={{ color: "#1e90ff", fillOpacity: 0.8, weight: 0 }}>
                        <Popup>
                          <b>{result.species_name}</b><br />
                          Known habitat location
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* History */}
      <div className="edna-hist-section">
        <button className="btn-toggle" onClick={() => setShowHist(v => !v)}>
          {showHist ? "▲ Hide History" : "▼ Show eDNA Match History"}
        </button>
        {showHist && (
          <div className="edna-card" style={{ marginTop: "1rem" }}>
            <div className="hist-head">
              <h3>Match History ({history.length})</h3>
              <div style={{ display: "flex", gap: ".6rem" }}>
                <input className="filter-input" placeholder="Filter by species…"
                  value={filter} onChange={e => setFilter(e.target.value)} />
                {history.length > 0 &&
                  <button className="btn-export" onClick={exportCSV}>⬇ CSV</button>}
              </div>
            </div>
            {filtered.length === 0
              ? <p className="empty-msg">No records found.</p>
              : <div className="edna-table-wrap">
                  <table className="edna-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Date</th><th>Species</th><th>Scientific</th>
                        <th>Match%</th><th>Method</th><th>Conservation</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => (
                        <tr key={r._id}>
                          <td>{i+1}</td>
                          <td>{new Date(r.createdAt).toLocaleString()}</td>
                          <td><strong>{r.species_name}</strong></td>
                          <td><em style={{ color: "#90caf9" }}>{r.scientific_name}</em></td>
                          <td>
                            <span className="match-chip"
                              style={{ background: r.match_percentage >= 90 ? "#2e7d32"
                                                 : r.match_percentage >= 70 ? "#f57f17" : "#c62828" }}>
                              {r.match_percentage}%
                            </span>
                          </td>
                          <td>
                            <span className={`method-badge sm ${r.method_used === "NCBI" ? "ncbi" : "local"}`}>
                              {r.method_used}
                            </span>
                          </td>
                          <td>
                            <span className="cons-badge sm"
                              style={{ background: CONSERVATION_COLOR[r.conservation_status] ?? "#607d8b" }}>
                              {r.conservation_status}
                            </span>
                          </td>
                          <td>
                            <button className="btn-del"
                              onClick={() => handleDelete(r._id)}
                              disabled={deleting === r._id}>
                              {deleting === r._id ? "…" : "✕"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        )}
      </div>
    </div>
  );
}