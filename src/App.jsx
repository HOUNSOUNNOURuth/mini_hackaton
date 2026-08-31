import { Routes, Route } from 'react-router-dom'
import PublicOnlyRoute from './components/shared/PublicOnlyRoute'
import ProtectedRoute from './components/shared/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'
import Dashboard from './pages/Dashboard'
import RendezVousPage from './pages/rendezvous/RendezVousPage'
import GuidagePage from './pages/guidage/GuidagePage'
import EpreuvesPage from './pages/epreuves/EpreuvesPage'
import TachesPage from './pages/taches/TachesPage'
import NotFound from './pages/NotFound'
import MesCandidatures from './pages/taches/MesCandidatures'
import MesTachesPubliees from './pages/taches/MesTachesPubliees'
import ProfilPage from './pages/ProfilPage'


function App() {
  return (
    <Routes>
      {/* Routes publiques : accessibles seulement si NON connecté */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
      </Route>

      {/* Routes protégées : accessibles seulement si connecté */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rendez-vous" element={<RendezVousPage />} />
          <Route path="/guidage" element={<GuidagePage />} />
          <Route path="/epreuves" element={<EpreuvesPage />} />
          <Route path="/taches" element={<TachesPage />} />
          <Route path="/taches/mes-candidatures" element={<MesCandidatures />} />
          <Route path="/taches/mes-publications" element={<MesTachesPubliees />} />
          <Route path="/profil" element={<ProfilPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App