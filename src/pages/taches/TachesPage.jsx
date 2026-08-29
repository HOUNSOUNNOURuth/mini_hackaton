import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

/**
 * Module 4 — Marketplace de petites tâches.
 * Liste les tâches ouvertes (statut = 'ouverte'). Un étudiant peut postuler ;
 * le paiement réel (API Money Fusion) et le prélèvement de la commission de
 * 10 % sont effectués côté serveur par l'Edge Function "payer-tache"
 * (voir supabase/functions/payer-tache), jamais directement depuis le frontend.
 */
export default function TachesPage() {
  const { user, profile } = useAuth();
  const [taches, setTaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ titre: "", categorie: "menage", description: "", prix_propose: "" });

  useEffect(() => {
    chargerTaches();
  }, []);

  async function chargerTaches() {
    const { data } = await supabase
      .from("taches")
      .select("*")
      .eq("statut", "ouverte")
      .order("created_at", { ascending: false });
    setTaches(data || []);
    setLoading(false);
  }

  async function publierTache(e) {
    e.preventDefault();
    await supabase.from("taches").insert({
      demandeur_id: user.id,
      titre: form.titre,
      categorie: form.categorie,
      description: form.description,
      prix_propose: Number(form.prix_propose) || null,
      statut: "ouverte",
    });
    setForm({ titre: "", categorie: "menage", description: "", prix_propose: "" });
    chargerTaches();
  }

  async function postuler(tacheId) {
    await supabase.from("candidatures").insert({
      tache_id: tacheId,
      etudiant_id: user.id,
      statut: "en_discussion",
    });
    alert("Candidature envoyée. Utilisez la messagerie de la tâche pour vous mettre d'accord sur le prix.");
  }

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">Module 04</div>
        <h1>Petites tâches rémunérées</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Le paiement se fait entièrement sur la plateforme via Money Fusion.
          CampusGo prélève automatiquement 10 % de commission à la validation de la tâche.
        </p>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h3>Publier une nouvelle tâche</h3>
        <form onSubmit={publierTache}>
          <div className="field">
            <label>Titre</label>
            <input required value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Ex : Aide au ménage samedi matin" />
          </div>
          <div className="field">
            <label>Catégorie</label>
            <select value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
              <option value="menage">Ménage</option>
              <option value="garde">Garde d'enfants</option>
              <option value="courses">Courses</option>
              <option value="soutien_scolaire">Soutien scolaire</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div className="field">
            <label>Description</label>
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="field">
            <label>Prix proposé (FCFA, indicatif — négociable dans la discussion)</label>
            <input type="number" value={form.prix_propose} onChange={(e) => setForm({ ...form, prix_propose: e.target.value })} />
          </div>
          <button className="btn btn-primary" type="submit">Publier la tâche</button>
        </form>
      </div>

      <h3>Tâches disponibles</h3>
      {loading && <p>Chargement…</p>}
      <div className="module-grid">
        {taches.map((t) => (
          <div key={t.id} className="card module-card">
            <span className="tag">{t.categorie}</span>
            <h3 style={{ margin: 0 }}>{t.titre}</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>{t.description}</p>
            {t.prix_propose && <strong>{t.prix_propose} FCFA (indicatif)</strong>}
            {profile?.role === "etudiant" && (
              <button className="btn btn-primary" onClick={() => postuler(t.id)}>
                Je suis disponible
              </button>
            )}
          </div>
        ))}
        {!loading && taches.length === 0 && <p style={{ color: "var(--color-text-muted)" }}>Aucune tâche ouverte pour le moment.</p>}
      </div>
    </div>
  );
}
