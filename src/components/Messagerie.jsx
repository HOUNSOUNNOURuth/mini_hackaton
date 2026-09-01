import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

/**
 * Fil de discussion pour UNE candidature précise (un étudiant ↔ un demandeur,
 * sur une tâche donnée). Utilisé pour négocier le prix avant confirmation.
 * Les messages apparaissent en temps réel grâce à Supabase Realtime
 * (voir "alter publication supabase_realtime add table messages" dans schema.sql).
 */
export default function Messagerie({ candidatureId, onFermer }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [loading, setLoading] = useState(true);
  const finDeListe = useRef(null);

  useEffect(() => {
    chargerMessages();

    // Abonnement temps réel : dès qu'un nouveau message est inséré pour
    // cette candidature, on l'ajoute directement à l'écran.
    const channel = supabase
      .channel(`messages-candidature-${candidatureId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `candidature_id=eq.${candidatureId}` },
        (payload) => setMessages((msgs) => [...msgs, payload.new])
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [candidatureId]);

  useEffect(() => {
    finDeListe.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function chargerMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("candidature_id", candidatureId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoading(false);
  }

  async function envoyer(e) {
    e.preventDefault();
    if (!texte.trim()) return;
    const contenu = texte.trim();
    setTexte("");
    await supabase.from("messages").insert({
      candidature_id: candidatureId,
      auteur_id: user.id,
      contenu,
    });
    // Pas besoin de recharger : l'abonnement realtime ci-dessus ajoute
    // automatiquement le message envoyé (y compris pour l'expéditeur).
  }

  return (
    <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column", height: 420 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>Négociation</strong>
        {onFermer && (
          <button className="btn btn-ghost" onClick={onFermer} style={{ padding: "4px 10px" }}>
            Fermer
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {loading && <p style={{ color: "var(--color-text-muted)" }}>Chargement…</p>}
        {!loading && messages.length === 0 && (
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
            Aucun message pour l'instant. Proposez un prix ou une disponibilité pour commencer.
          </p>
        )}
        {messages.map((m) => {
          const estMoi = m.auteur_id === user.id;
          return (
            <div
              key={m.id}
              style={{
                alignSelf: estMoi ? "flex-end" : "flex-start",
                background: estMoi ? "var(--color-primary)" : "var(--color-bg)",
                color: estMoi ? "white" : "var(--color-text)",
                padding: "8px 12px",
                borderRadius: 12,
                maxWidth: "75%",
                fontSize: 14,
              }}
            >
              {m.contenu}
            </div>
          );
        })}
        <div ref={finDeListe} />
      </div>

      <form onSubmit={envoyer} style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--color-border)" }}>
        <input
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Ex : Je peux le faire à 3000 FCFA, disponible samedi matin"
          style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border)" }}
        />
        <button className="btn btn-primary" type="submit">Envoyer</button>
      </form>
    </div>
  );
}
