import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Usage:
 * <ProtectedRoute>                          — any logged-in user
 * <ProtectedRoute roles={['scientist']}>   — specific roles only
 */
export default function ProtectedRoute({ children, roles }) {
  const { isLoggedIn, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
        <p>Restoring session…</p>
      </div>
    );
  }

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user?.role))
    return <Navigate to="/unauthorized" replace />;

  return children;
}