export default function Footer() {
  return (
    <footer style={{
      background:   "#1a2d44",
      borderTop:    "1px solid #1e3a5a",
      marginTop:    "3rem",
      padding:      "1.2rem 2rem",
    }}>
      <div style={{
        maxWidth:       1400,
        margin:         "0 auto",
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
        flexWrap:       "wrap",
        gap:            "1rem",
      }}>
        {/* Left: brand */}
        <div style={{ display: "flex", alignItems: "center", gap: ".7rem" }}>
          <span style={{ fontSize: "1.5rem" }}>🐟</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: ".88rem", color: "#e0e6ed" }}>
              CMLRE Marine Intelligence Platform
            </p>
            <p style={{ margin: 0, fontSize: ".72rem", color: "#607d8b" }}>
              Ministry of Earth Sciences, Government of India
            </p>
          </div>
        </div>

        {/* Right: meta */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
          <span style={{ color: "#455a64", fontSize: ".78rem" }}>v1.0.0</span>
          <span style={{ color: "#1e3a5a" }}>|</span>
          <span style={{ color: "#455a64", fontSize: ".78rem" }}>
            © {new Date().getFullYear()}
          </span>
          <span style={{ color: "#1e3a5a" }}>|</span>
          <a href="/about"
            style={{ color: "#1e90ff", fontSize: ".78rem", textDecoration: "none" }}>
            About
          </a>
        </div>
      </div>
    </footer>
  );
}