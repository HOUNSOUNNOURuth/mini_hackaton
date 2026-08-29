import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthVisualPanel from "./AuthVisualPanel";

export default function SignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error } = await signIn({ email, password });
    setSubmitting(false);

    if (error) {
      setError("E-mail ou mot de passe incorrect.");
      return;
    }
    navigate(from, { replace: true });
  }

  return (
    <div className="auth-shell">
      <AuthVisualPanel />
      <div className="auth-form-side">
        <div className="auth-form-wrap">
          <h1>Content de vous revoir</h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: 0, marginBottom: 24 }}>
            Connectez-vous pour accéder à votre espace CampusGo.
          </p>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Adresse e-mail</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          <p className="auth-switch">
            Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
