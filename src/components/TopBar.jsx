import { useAuth } from "../context/AuthContext";

export default function TopBar() {
  const { profile, user, signOut } = useAuth();

  return (
    <header className="topbar">
      <div>
        <strong>{profile?.nom || user?.email}</strong>
        {profile?.matricule && (
          <span style={{ marginLeft: 10, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text-muted)" }}>
            #{profile.matricule}
          </span>
        )}
      </div>
      <button className="btn btn-ghost" onClick={signOut}>
        Se déconnecter
      </button>
    </header>
  );
}
