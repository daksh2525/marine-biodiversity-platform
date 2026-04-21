
// ── pages/About.jsx ───────────────────────────────────────────────────────────
import "../styles/About.css";

const FEATURES = [
  { icon:"📊", title:"Fish Abundance Prediction",  desc:"Random Forest + XGBoost ensemble predicts fish density (kg/km²) using ocean parameters for Indian EEZ waters." },
  { icon:"🐠", title:"Fish Species Identification",desc:"MobileNetV2 deep learning CNN trained on 14 marine fish species common to Indian coastal waters." },
  { icon:"🌊", title:"Ecosystem Health Score",     desc:"Multi-parameter ML model assesses ocean ecosystem health (0–100) with actionable recommendations." },
  { icon:"🦴", title:"Otolith Image Analysis",     desc:"OpenCV + ResNet50 detects growth rings in fish ear bones to estimate age, growth rate, and stock group." },
  { icon:"🧬", title:"eDNA Species Matching",      desc:"BioPython + NCBI BLAST identifies marine species from environmental DNA water samples." },
];

const TECH = [
  "React.js", "Node.js + Express", "Python Flask", "MongoDB",
  "TensorFlow / Keras", "Scikit-learn", "XGBoost", "OpenCV",
  "BioPython", "Leaflet.js", "Chart.js",
];

export function About() {
  return (
    <div className="about-page">
      <div className="about-hero">
        <h1>🐟 Marine Intelligence Platform</h1>
        <p>An AI-powered marine research tool developed for CMLRE India</p>
        <p className="about-org">
          Centre for Marine Living Resources & Ecology<br />
          Ministry of Earth Sciences, Government of India
        </p>
      </div>

      <div className="about-section">
        <h2>About CMLRE</h2>
        <p>The Centre for Marine Living Resources and Ecology (CMLRE) is a premier research institution under the Ministry of Earth Sciences, Government of India. CMLRE conducts research on marine biodiversity, fisheries resources, and ecosystem health in Indian EEZ waters covering the Arabian Sea, Bay of Bengal, and Indian Ocean.</p>
      </div>

      <div className="about-section">
        <h2>Features</h2>
        <div className="feature-cards">
          {FEATURES.map(f => (
            <div className="feature-card" key={f.title}>
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="about-section">
        <h2>Tech Stack</h2>
        <div className="tech-tags">
          {TECH.map(t => <span className="tech-tag" key={t}>{t}</span>)}
        </div>
      </div>

      <div className="about-section about-footer-links">
        <a href="https://www.cmlre.gov.in" target="_blank" rel="noreferrer">🔗 CMLRE Website</a>
        <a href="https://github.com" target="_blank" rel="noreferrer">💻 GitHub Repository</a>
      </div>
    </div>
  );
}

export default About;