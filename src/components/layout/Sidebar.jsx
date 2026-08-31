import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Accueil' },
  { to: '/rendez-vous', label: 'Rendez-vous' },
  { to: '/guidage', label: 'Guidage' },
  { to: '/epreuves', label: 'Épreuves' },
  { to: '/taches', label: 'Tâches' },
]

export default function Sidebar() {
  return (
    <nav className="flex sm:flex-col justify-around sm:justify-start gap-1 sm:gap-2 bg-gray-50 sm:w-48 sm:min-h-[calc(100vh-56px)] p-2 sm:p-4 border-t sm:border-t-0 sm:border-r border-gray-200 order-2 sm:order-1">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) =>
            `text-center sm:text-left px-3 py-2 rounded-md text-sm font-medium transition ${
              isActive
                ? 'bg-secondary text-white'
                : 'text-gray-700 hover:bg-gray-200'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}