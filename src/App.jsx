import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/shared/ProtectedRoute'
import PublicOnlyRoute from './components/shared/PublicOnlyRoute'

// Pages publiques (sans layout)
import Accueil from './pages/Accueil'
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'

// Pages protégées (avec sidebar/layout)
import Dashboard from './pages/Dashboard'
import TachesPage from './pages/taches/TachesPage'
import MesCandidatures from './pages/taches/MesCandidatures'
import MesTachesPubliees from './pages/taches/MesTachesPubliees'
import RendezVousPage from './pages/rendezvous/RendezVousPage'
import GuidagePage from './pages/guidage/GuidagePage'
import EpreuvesPage from './pages/epreuves/EpreuvesPage'
import ProfilPage from './pages/ProfilPage'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      {/* PAGE D'ACCUEIL - standalone, sans sidebar */}
      <Route path="/" element={<Accueil />} />

      {/* AUTH - sans sidebar */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<SignIn />} />
        <Route path="/register" element={<SignUp />} />
      </Route>

      {/* ROUTES PROTÉGÉES - avec AppLayout (sidebar) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/taches" element={<TachesPage />} />
          <Route path="/taches/mes-candidatures" element={<MesCandidatures />} />
          <Route path="/taches/mes-publications" element={<MesTachesPubliees />} />
          <Route path="/rendez-vous" element={<RendezVousPage />} />
          <Route path="/guidage" element={<GuidagePage />} />
          <Route path="/epreuves" element={<EpreuvesPage />} />
          <Route path="/profil" element={<ProfilPage />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}