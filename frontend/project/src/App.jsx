
// ── src/App.jsx ───────────────────────────────────────────────────────────────
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar   from "./components/Navbar";
import Home     from "./pages/Home";
import History  from "./pages/History";
import SpeciesIdentifier from "./pages/SpeciesIdentifier";
import EcosystemHealth  from "./pages/EcosystemHealth";
import "./App.css";
export default function App() {
  return (
    <Router>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/"        element={<Home />}    />
          <Route path="/species" element={<SpeciesIdentifier />} />
           <Route path="/ecosystem" element={<EcosystemHealth />}   />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
    </Router>
  );
}