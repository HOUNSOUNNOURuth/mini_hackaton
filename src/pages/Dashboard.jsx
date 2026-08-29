import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const modules = [
  {
    to: "/app/rendez-vous",
    tag: "MODULE 01",
    title: "Rendez-vous",
    desc: "Prenez rendez-vous avec un bureau administratif à une date et une heure précises.",
  },
  {
    to: "/app/guidage",
    tag: "MODULE 02",
    title: "Guidage du campus",
    desc: "Trouvez un bureau, une école ou un amphithéâtre par texte ou par voix, dans votre langue.",
  },
  {
    to: "/app/epreuves",
    tag: "MODULE 03",
    title: "Banque d'épreuves",
    desc: "Consultez les épreuves des années précédentes, classées par école, filière et session.",
  },
  {
    to: "/app/taches",
    tag: "MODULE 04",
    title: "Petites tâches",
    desc: "Trouvez ou proposez une tâche rémunérée, avec paiement sécurisé intégré.",
  },
];

export default function Dashboard() {
  const { profile } = useAuth();

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">Tableau de bord</div>
        <h1>Bonjour {profile?.nom?.split(" ")[0] || ""} 👋</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Que voulez-vous faire aujourd'hui sur le campus ?
        </p>
      </div>

      <div className="module-grid">
        {modules.map((m) => (
          <Link key={m.to} to={m.to} className="card module-card" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="tag">{m.tag}</span>
            <h3 style={{ margin: 0 }}>{m.title}</h3>
            <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 14 }}>{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
