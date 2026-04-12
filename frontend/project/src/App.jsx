
// ── src/App.jsx ───────────────────────────────────────────────────────────────
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar   from "./components/Navbar";
import Home     from "./pages/Home";
import History  from "./pages/History";
import "./App.css";

export default function App() {
  return (
    <Router>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/"        element={<Home />}    />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
    </Router>
  );
}