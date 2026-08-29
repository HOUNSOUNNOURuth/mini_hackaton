import { NavLink } from "react-router-dom";

const links = [
  { to: "/app", label: "Tableau de bord", end: true },
  { to: "/app/rendez-vous", label: "Rendez-vous" },
  { to: "/app/guidage", label: "Guidage du campus" },
  { to: "/app/epreuves", label: "Banque d'épreuves" },
  { to: "/app/taches", label: "Petites tâches" },
];

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">CampusGo</div>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
