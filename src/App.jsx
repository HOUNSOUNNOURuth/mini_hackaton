import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
import AppLayout from "./components/AppLayout";

import SignUp from "./pages/auth/SignUp";
import SignIn from "./pages/auth/SignIn";
import Dashboard from "./pages/Dashboard";
import RendezVousPage from "./pages/rendezvous/RendezVousPage";
import GuidagePage from "./pages/guidage/GuidagePage";
import EpreuvesPage from "./pages/epreuves/EpreuvesPage";
import TachesPage from "./pages/taches/TachesPage";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Redirection racine : jamais d'accès direct sans passer par un compte */}
          <Route path="/" element={<Navigate to="/connexion" replace />} />

          {/* Alias de secours : au cas où un bouton du site pointe vers une
              autre orthographe de ces pages (inscription, connexion, dashboard),
              on redirige quand même vers la bonne route plutôt que d'afficher
              une page 404. */}
          <Route path="/signup" element={<Navigate to="/inscription" replace />} />
          <Route path="/sign-up" element={<Navigate to="/inscription" replace />} />
          <Route path="/register" element={<Navigate to="/inscription" replace />} />
          <Route path="/s-inscrire" element={<Navigate to="/inscription" replace />} />
          <Route path="/creer-compte" element={<Navigate to="/inscription" replace />} />
          <Route path="/login" element={<Navigate to="/connexion" replace />} />
          <Route path="/signin" element={<Navigate to="/connexion" replace />} />
          <Route path="/se-connecter" element={<Navigate to="/connexion" replace />} />
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="/home" element={<Navigate to="/app" replace />} />
          <Route path="/accueil" element={<Navigate to="/app" replace />} />

          {/* Pages accessibles uniquement si PAS connecté */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/inscription" element={<SignUp />} />
            <Route path="/connexion" element={<SignIn />} />
          </Route>

          {/* Tout le site est protégé : il faut un compte + être connecté */}
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="rendez-vous" element={<RendezVousPage />} />
              <Route path="guidage" element={<GuidagePage />} />
              <Route path="epreuves" element={<EpreuvesPage />} />
              <Route path="taches" element={<TachesPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}