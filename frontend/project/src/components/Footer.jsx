// ── components/Footer.jsx ─────────────────────────────────────────────────────
export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <span>🐟 CMLRE Marine Intelligence Platform</span>
        <span>Ministry of Earth Sciences, Government of India</span>
        <span>v1.0.0 · {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}

