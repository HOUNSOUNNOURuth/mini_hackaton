import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function TopBar() {
  const { user, signOut } = useAuth()

  return (
    <header className="flex items-center justify-between bg-primary text-white px-4 py-3 shadow">
      <span className="font-bold text-lg">CampusGo</span>
      <div className="flex items-center gap-3 text-sm">
        <Link to="/profil" className="hidden sm:inline hover:underline">
          {user?.email}
        </Link>
        <button
          onClick={signOut}
          className="bg-white text-primary px-3 py-1 rounded-md font-medium hover:bg-gray-100 transition"
        >
          Déconnexion
        </button>
      </div>
    </header>
  )
}