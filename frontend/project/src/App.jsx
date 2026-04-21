import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute   from "./components/ProtectedRoute";
import Navbar           from "./components/Navbar";
import Footer           from "./components/Footer";

// Pages
import Login            from "./pages/Login";
import Register         from "./pages/Register";
import Home             from "./pages/Home";
import History          from "./pages/History";
import SpeciesIdentifier from "./pages/SpeciesIdentifier";
import EcosystemHealth  from "./pages/EcosystemHealth";
import OtolithAnalyzer  from "./pages/OtolithAnalyzer";
import EdnaMatcher      from "./pages/EdnaMatcher";
import About            from "./pages/About";

import "./App.css";

function Unauthorized() {
  return (
    <div className="unauth-page">
      <span style={{ fontSize: "4rem" }}>🔒</span>
      <h1>Access Denied</h1>
      <p>You don't have permission to view this page.</p>
      <p>Your current role doesn't have access to this feature.</p>
      <a href="/">← Go back to home</a>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <div className="container">
          <Routes>
            {/* ── Public routes ── */}
            <Route path="/login"        element={<Login />}        />
            <Route path="/register"     element={<Register />}     />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/about"        element={<About />}        />

            {/* ── Protected: all roles ── */}
            <Route path="/" element={
              <ProtectedRoute><Home /></ProtectedRoute>
            } />
            <Route path="/predict" element={
              <ProtectedRoute roles={["fisherman","scientist","phd"]}>
                <Home />
              </ProtectedRoute>
            } />
            <Route path="/species" element={
              <ProtectedRoute>
                <SpeciesIdentifier />
              </ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute><History /></ProtectedRoute>
            } />

            {/* ── Protected: scientist, policymaker, phd ── */}
            <Route path="/ecosystem" element={
              <ProtectedRoute roles={["scientist","policymaker","phd"]}>
                <EcosystemHealth />
              </ProtectedRoute>
            } />

            {/* ── Protected: scientist, phd only ── */}
            <Route path="/otolith" element={
              <ProtectedRoute roles={["scientist","phd"]}>
                <OtolithAnalyzer />
              </ProtectedRoute>
            } />
            <Route path="/edna" element={
              <ProtectedRoute roles={["scientist","phd"]}>
                <EdnaMatcher />
              </ProtectedRoute>
            } />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Footer />
      </Router>
    </AuthProvider>
  );
}