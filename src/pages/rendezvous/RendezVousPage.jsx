import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

/**
 * Module 1 — Rendez-vous.
 * Liste les bureaux et leurs créneaux disponibles (table "creneaux" filtrée
 * sur disponible = true), et permet à l'étudiant connecté d'en réserver un.
 * Voir supabase/schema.sql pour la structure des tables bureaux / creneaux / rendezvous.
 */
export default function RendezVousPage() {
  const { user } = useAuth();
  const [bureaux, setBureaux] = useState([]);
  const [creneaux, setCreneaux] = useState([]);
  const [bureauSelectionne, setBureauSelectionne] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    chargerBureaux();
  }, []);

  async function chargerBureaux() {
    const { data, error } = await supabase.from("bureaux").select("*").order("nom");
    if (!error) setBureaux(data || []);
    setLoading(false);
  }

  async function chargerCreneaux(bureauId) {
    setBureauSelectionne(bureauId);
    const { data } = await supabase
      .from("creneaux")
      .select("*")
      .eq("bureau_id", bureauId)
      .eq("disponible", true)
      .order("date_heure");
    setCreneaux(data || []);
  }

  async function reserver(creneauId) {
    setMessage("");
    const { error } = await supabase.from("rendezvous").insert({
      etudiant_id: user.id,
      creneau_id: creneauId,
      statut: "confirme",
    });

    if (error) {
      setMessage("Ce créneau vient d'être pris, merci d'en choisir un autre.");
      return;
    }
    // Le créneau devient indisponible dès qu'il est réservé.
    await supabase.from("creneaux").update({ disponible: false }).eq("id", creneauId);
    setMessage("Rendez-vous confirmé ✅");
    chargerCreneaux(bureauSelectionne);
  }

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">Module 01</div>
        <h1>Prendre rendez-vous</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Choisissez un bureau, puis un créneau libre. Le nombre de créneaux par jour
          est plafonné par chaque bureau pour éviter les retards.
        </p>
      </div>

      {message && <div className="error-banner" style={{ background: "#eaf5ea", color: "var(--color-green)", borderColor: "#c8e6c9" }}>{message}</div>}

      {loading ? (
        <p>Chargement des bureaux…</p>
      ) : (
        <div className="module-grid" style={{ marginBottom: 24 }}>
          {bureaux.map((b) => (
            <button
              key={b.id}
              className="card module-card"
              style={{ textAlign: "left", border: bureauSelectionne === b.id ? "2px solid var(--color-primary)" : undefined }}
              onClick={() => chargerCreneaux(b.id)}
            >
              <span className="tag">{b.categorie}</span>
              <h3 style={{ margin: 0 }}>{b.nom}</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>{b.localisation}</p>
            </button>
          ))}
          {bureaux.length === 0 && (
            <p style={{ color: "var(--color-text-muted)" }}>
              Aucun bureau enregistré pour le moment. Ajoutez-en dans la table "bureaux".
            </p>
          )}
        </div>
      )}

      {bureauSelectionne && (
        <div className="card" style={{ padding: 20 }}>
          <h3>Créneaux disponibles</h3>
          {creneaux.length === 0 && <p style={{ color: "var(--color-text-muted)" }}>Aucun créneau libre pour ce bureau.</p>}
          {creneaux.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
              <span>{new Date(c.date_heure).toLocaleString("fr-FR")}</span>
              <button className="btn btn-primary" onClick={() => reserver(c.id)}>
                Réserver
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
