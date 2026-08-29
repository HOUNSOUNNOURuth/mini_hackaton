import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";

/**
 * Règle du site : impossible d'utiliser CampusGo (rendez-vous, guidage,
 * banque d'épreuves, marketplace de tâches) sans avoir créé un compte
 * et être connecté. Toute route enfant de <ProtectedRoute /> est donc
 * inaccessible tant que "user" est null, et redirige vers /connexion.
 */
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader label="Vérification de votre session…" />;

  if (!user) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
