import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const LANGUES = [
  { code: "fr-FR", label: "Français" },
  { code: "en-US", label: "English" },
  { code: "yo-NG", label: "Yorùbá" },
];

/**
 * Module 2 — Guidage & localisation.
 * Recherche un point d'intérêt (table "lieux") par texte ou par voix
 * (Web Speech API du navigateur pour la reconnaissance vocale).
 * Pour une vraie traduction multilingue en production, brancher ici un
 * service de traduction (ex: Google Cloud Translation) avant la recherche.
 */
export default function GuidagePage() {
  const [langue, setLangue] = useState("fr-FR");
  const [requete, setRequete] = useState("");
  const [resultats, setResultats] = useState([]);
  const [ecoute, setEcoute] = useState(false);
  const [recherche, setRecherche] = useState(false);

  async function lancerRecherche(texte) {
    const valeur = (texte ?? requete).trim();
    if (!valeur) return;
    setRecherche(true);
    const { data } = await supabase
      .from("lieux")
      .select("*")
      .ilike("nom", `%${valeur}%`)
      .limit(10);
    setResultats(data || []);
    setRecherche(false);
  }

  function demarrerEcouteVocale() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas prise en charge par ce navigateur.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = langue;
    recognition.interimResults = false;

    recognition.onstart = () => setEcoute(true);
    recognition.onend = () => setEcoute(false);
    recognition.onresult = (event) => {
      const texte = event.results[0][0].transcript;
      setRequete(texte);
      lancerRecherche(texte);
    };

    recognition.start();
  }

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">Module 02</div>
        <h1>Où voulez-vous aller ?</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Tapez ou dites le nom d'un bureau, d'une école ou d'un amphithéâtre.
        </p>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <select value={langue} onChange={(e) => setLangue(e.target.value)} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border)" }}>
            {LANGUES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Ex : Amphithéâtre B, Bureau de la scolarité…"
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lancerRecherche()}
            style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border)" }}
          />
          <button className="btn btn-ghost" onClick={demarrerEcouteVocale}>
            {ecoute ? "🎙️ Écoute…" : "🎙️ Parler"}
          </button>
          <button className="btn btn-primary" onClick={() => lancerRecherche()}>
            Chercher
          </button>
        </div>

        {recherche && <p style={{ color: "var(--color-text-muted)" }}>Recherche en cours…</p>}

        {resultats.map((lieu) => (
          <div key={lieu.id} style={{ padding: "12px 0", borderTop: "1px solid var(--color-border)" }}>
            <strong>{lieu.nom}</strong>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--color-text-muted)" }}>
              {lieu.description} — Bâtiment {lieu.batiment}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
