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
