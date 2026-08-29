export default function AuthVisualPanel() {
  return (
    <div className="auth-visual">
      <div className="auth-visual-brand">CampusGo</div>
      <div className="auth-visual-pitch">
        <h2>Ton campus, en un clic.</h2>
        <p>
          Rendez-vous sans file d'attente, guidage vers n'importe quel bâtiment,
          accès aux anciennes épreuves et petites tâches rémunérées entre
          étudiants — tout est réuni au même endroit.
        </p>
      </div>
      <div className="auth-modules">
        <span className="auth-module-chip">Rendez-vous</span>
        <span className="auth-module-chip">Guidage</span>
        <span className="auth-module-chip">Épreuves</span>
        <span className="auth-module-chip">Tâches</span>
      </div>
    </div>
  );
}
