import { useState, useEffect } from "react";

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 16 }) {
  return (
    <span style={{
      width: size, height: size,
      border: "2px solid rgba(255,255,255,0.3)",
      borderTopColor: "#fff", borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
      display: "inline-block", flexShrink: 0,
    }} />
  );
}

// ── Loading Button ────────────────────────────────────────────────────────────
export function LoadingButton({ loading, disabled, onClick, children, className, style }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={className}
      style={{ opacity: loading ? 0.75 : 1, ...style }}
    >
      {loading
        ? <span style={{ display:"flex", alignItems:"center",
            gap:8, justifyContent:"center" }}>
            <Spinner /> Analyzing…
          </span>
        : children}
    </button>
  );
}

// ── Tooltip Icon ──────────────────────────────────────────────────────────────
export function TooltipIcon({ text }) {
  return (
    <span className="tooltip-wrap" style={{ marginLeft: 6, cursor: "help" }}>
      <span style={{
        width: 15, height: 15, borderRadius: "50%",
        background: "#1e3a5a", color: "#90caf9",
        fontSize: 10, display: "inline-flex",
        alignItems: "center", justifyContent: "center", fontWeight: "bold",
      }}>?</span>
      <span className="tooltip-text">{text}</span>
    </span>
  );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div style={{ background: "#1a2d44", borderRadius: 12,
      padding: "1rem", marginBottom: 8 }}>
      <div className="skeleton" style={{ height: 16, width: "60%", marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 12, width: "40%", marginBottom: 6 }} />
      <div className="skeleton" style={{ height: 12, width: "80%" }} />
    </div>
  );
}

// ── Skeleton Row (for tables) ─────────────────────────────────────────────────
export function SkeletonRow({ cols = 6 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: ".6rem .8rem" }}>
          <div className="skeleton" style={{ height: 14, width: i === 0 ? 30 : "80%" }} />
        </td>
      ))}
    </tr>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = "🐟", message = "No data yet" }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#475569" }}>
      <div style={{ fontSize: 48, marginBottom: "1rem" }}>{icon}</div>
      <p style={{ fontSize: 16, marginBottom: 8, color: "#64748b" }}>{message}</p>
      <p style={{ fontSize: 13, color: "#475569" }}>
        Make your first analysis to see results here
      </p>
    </div>
  );
}

// ── Animated Number ───────────────────────────────────────────────────────────
export function AnimatedNumber({ value, duration = 900, decimals = 0 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!value && value !== 0) return;
    let start = 0;
    const target = parseFloat(value);
    const step   = target / (duration / 16);
    const timer  = setInterval(() => {
      start += step;
      if (start >= target) {
        setDisplay(target);
        clearInterval(timer);
      } else {
        setDisplay(parseFloat(start.toFixed(decimals)));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <span className="count-animate">{display}</span>;
}

// ── Result Card with fade-in ──────────────────────────────────────────────────
export function ResultCard({ show, children, borderColor }) {
  return (
    <div style={{
      opacity:    show ? 1 : 0,
      transform:  show ? "translateY(0)" : "translateY(16px)",
      transition: "all 0.4s ease",
      borderLeft: borderColor ? `4px solid ${borderColor}` : undefined,
    }}>
      {children}
    </div>
  );
}

// ── Border color helpers ──────────────────────────────────────────────────────
export function abundanceBorder(val) {
  if (val >= 80) return "#2e7d32";
  if (val >= 40) return "#f57f17";
  return "#c62828";
}
export function healthBorder(score) {
  if (score >= 71) return "#2e7d32";
  if (score >= 41) return "#f57f17";
  return "#c62828";
}
export function confidenceBorder(pct) {
  if (pct >= 80) return "#2e7d32";
  if (pct >= 50) return "#f57f17";
  return "#c62828";
}
export function matchBorder(pct) {
  if (pct >= 85) return "#2e7d32";
  if (pct >= 60) return "#f57f17";
  return "#c62828";
}
export function growthBorder(rate) {
  if (rate === "Fast")   return "#2e7d32";
  if (rate === "Normal") return "#f57f17";
  return "#c62828";
}