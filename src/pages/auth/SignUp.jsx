import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthVisualPanel from "./AuthVisualPanel";

/**
 * Inscription ouverte à tous : aucun matricule n'est demandé ici.
 * Un compte permet d'utiliser le site (rendez-vous, guidage, tâches).
 * Le matricule n'est demandé et vérifié que plus tard, uniquement pour
 * ouvrir la Banque d'épreuves (voir pages/epreuves/EpreuvesPage.jsx).
 */
export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ nom: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (form.password !== form.confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    const { error } = await signUp({
      email: form.email,
      password: form.password,
      nom: form.nom,
      role: "etudiant",
    });
    setSubmitting(false);

    if (error) {
      setError(traduireErreur(error.message));
      return;
    }

    setInfo("Compte créé ! Vérifiez votre boîte e-mail pour confirmer votre adresse, puis connectez-vous.");
    setTimeout(() => navigate("/connexion"), 2500);
  }

  return (
    <div className="auth-shell">
      <AuthVisualPanel />
      <div className="auth-form-side">
        <div className="auth-form-wrap">
          <h1>Créer mon compte</h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: 0, marginBottom: 24 }}>
            Un compte suffit pour accéder à CampusGo. Le matricule ne sera demandé
            que pour consulter la banque d'épreuves.
          </p>

          {error && <div className="error-banner">{error}</div>}
          {info && (
            <div className="error-banner" style={{ background: "#eaf5ea", color: "var(--color-green)", borderColor: "#c8e6c9" }}>
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="nom">Nom complet</label>
              <input
                id="nom"
                type="text"
                required
                placeholder="Ex : Awa Kouassi"
                value={form.nom}
                onChange={update("nom")}
              />
            </div>

            <div className="field">
              <label htmlFor="email">Adresse e-mail</label>
              <input
                id="email"
                type="email"
                required
                placeholder="vous@exemple.com"
                value={form.email}
                onChange={update("email")}
              />
            </div>

            <div className="field">
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                placeholder="6 caractères minimum"
                value={form.password}
                onChange={update("password")}
              />
            </div>

            <div className="field">
              <label htmlFor="confirm">Confirmer le mot de passe</label>
              <input
                id="confirm"
                type="password"
                required
                value={form.confirm}
                onChange={update("confirm")}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? "Création en cours…" : "Créer mon compte"}
            </button>
          </form>

          <p className="auth-switch">
            Déjà un compte ? <Link to="/connexion">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function traduireErreur(message) {
  if (message.includes("already registered")) return "Un compte existe déjà avec cet e-mail.";
  if (message.includes("Password should be")) return "Le mot de passe est trop court (6 caractères minimum).";
  return message;
}
