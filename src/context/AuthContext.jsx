import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

/**
 * Fournit à toute l'application :
 * - session / user : l'utilisateur Supabase Auth connecté (ou null)
 * - profile : la ligne correspondante dans la table "profiles" (nom, matricule, rôle)
 * - loading : true tant qu'on ne sait pas encore si quelqu'un est connecté
 * - signUp / signIn / signOut : actions d'authentification
 *
 * Tant que loading est true ou que user est null, aucune page du site
 * (rendez-vous, guidage, épreuves, tâches) ne doit être accessible :
 * voir <ProtectedRoute /> qui applique cette règle.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("[CampusGo] Impossible de charger le profil :", error.message);
    }
    setProfile(data ?? null);
    setLoading(false);
  }

  /**
   * Création de compte obligatoire avant toute utilisation du site.
   * Le matricule n'est PAS demandé ici : il n'est requis que plus tard,
   * au moment d'ouvrir le module "Banque d'épreuves" (voir EpreuvesPage.jsx
   * et la fonction verifierMatricule ci-dessous). nom et role sont stockés
   * dans les métadonnées Supabase Auth, puis recopiés automatiquement dans
   * la table "profiles" par le trigger handle_new_user() (schema.sql).
   */
  async function signUp({ email, password, nom, role }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nom, role: role || "etudiant" },
      },
    });
    return { data, error };
  }

  /**
   * Vérifie un matricule saisi par l'utilisateur contre le registre officiel
   * des étudiants (table "etudiants_officiels", alimentée côté backend) via
   * la fonction RPC "verifier_matricule". Si valide, l'enregistre sur le
   * profil pour débloquer durablement l'accès à la banque d'épreuves.
   */
  async function verifierMatricule(matricule) {
    const { data: estValide, error: rpcError } = await supabase.rpc("verifier_matricule", {
      matricule_saisi: matricule.trim(),
    });

    if (rpcError) return { ok: false, error: rpcError.message };
    if (!estValide) return { ok: false, error: "Matricule introuvable dans le registre des étudiants." };

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ matricule: matricule.trim() })
      .eq("id", session.user.id);

    if (updateError) return { ok: false, error: updateError.message };

    await fetchProfile(session.user.id);
    return { ok: true };
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    verifierMatricule,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>");
  return ctx;
}
