import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

/**
 * Module 3 — Banque d'épreuves.
 * N'importe quel compte peut ouvrir cette page, mais le CONTENU reste
 * invisible tant que l'utilisateur n'a pas saisi un matricule valide.
 * La vérification appelle la fonction RPC "verifier_matricule" (backend),
 * qui contrôle le matricule contre le registre officiel des étudiants
 * (table "etudiants_officiels", alimentée par l'équipe backend/admin).
 * Une fois validé, le matricule est mémorisé sur le profil pour les
 * prochaines visites (voir AuthContext.verifierMatricule).
 */
export default function EpreuvesPage() {
  const { profile, verifierMatricule } = useAuth();
  const [saisie, setSaisie] = useState("");
  const [verification, setVerification] = useState(false);
  const [erreurMatricule, setErreurMatricule] = useState("");

  const [filtres, setFiltres] = useState({ ecole: "", filiere: "", annee: "" });
  const [epreuves, setEpreuves] = useState([]);
  const [loading, setLoading] = useState(false);

  const matriculeValide = Boolean(profile?.matricule);

  useEffect(() => {
    if (matriculeValide) rechercher();
  }, [matriculeValide]);

  async function handleVerification(e) {
    e.preventDefault();
    setErreurMatricule("");
    setVerification(true);
    const { ok, error } = await verifierMatricule(saisie);
    setVerification(false);
    if (!ok) setErreurMatricule(error);
  }

  async function rechercher() {
    setLoading(true);
    let query = supabase.from("epreuves").select("*").order("annee", { ascending: false });
    if (filtres.ecole) query = query.ilike("ecole", `%${filtres.ecole}%`);
    if (filtres.filiere) query = query.ilike("filiere", `%${filtres.filiere}%`);
    if (filtres.annee) query = query.eq("annee", filtres.annee);

    const { data } = await query;
    setEpreuves(data || []);
    setLoading(false);
  }

  // ----- Étape 1 : le matricule n'a pas encore été vérifié pour ce compte -----
  if (!matriculeValide) {
    return (
      <div>
        <div className="page-header">
          <div className="eyebrow">Module 03</div>
          <h1>Banque d'épreuves</h1>
          <p style={{ color: "var(--color-text-muted)" }}>
            L'accès aux épreuves nécessite de confirmer votre matricule étudiant.
          </p>
        </div>

        <div className="card" style={{ padding: 24, maxWidth: 420 }}>
          {erreurMatricule && <div className="error-banner">{erreurMatricule}</div>}
          <form onSubmit={handleVerification}>
            <div className="field matricule">
              <label htmlFor="matricule">Votre matricule</label>
              <input
                id="matricule"
                required
                placeholder="Ex : 21B01234"
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-block" disabled={verification}>
              {verification ? "Vérification…" : "Valider mon matricule"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ----- Étape 2 : matricule validé, accès normal au contenu -----
  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">Module 03</div>
        <h1>Banque d'épreuves</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Accès vérifié via le matricule <strong>#{profile.matricule}</strong>.
        </p>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input placeholder="École" value={filtres.ecole} onChange={(e) => setFiltres({ ...filtres, ecole: e.target.value })} style={inputStyle} />
        <input placeholder="Filière" value={filtres.filiere} onChange={(e) => setFiltres({ ...filtres, filiere: e.target.value })} style={inputStyle} />
        <input placeholder="Année (ex: 2024)" value={filtres.annee} onChange={(e) => setFiltres({ ...filtres, annee: e.target.value })} style={inputStyle} />
        <button className="btn btn-primary" onClick={rechercher}>Filtrer</button>
      </div>

      {loading && <p>Recherche…</p>}

      <div className="module-grid">
        {epreuves.map((ep) => (
          <div key={ep.id} className="card module-card">
            <span className="tag">{ep.session} — {ep.annee}</span>
            <h3 style={{ margin: 0 }}>{ep.matiere}</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>{ep.ecole} · {ep.filiere}</p>
            <a className="btn btn-ghost" href={ep.fichier_url} target="_blank" rel="noreferrer">
              Télécharger
            </a>
          </div>
        ))}
        {!loading && epreuves.length === 0 && (
          <p style={{ color: "var(--color-text-muted)" }}>Aucune épreuve trouvée pour ces critères.</p>
        )}
      </div>
    </div>
  );
}

const inputStyle = { padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border)", flex: 1, minWidth: 160 };
