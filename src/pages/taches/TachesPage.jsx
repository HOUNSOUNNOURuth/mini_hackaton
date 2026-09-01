import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import Messagerie from "../../components/Messagerie";

const CATEGORIES = [
  { key: "tous", label: "Tous" },
  { key: "menage", label: "Ménage" },
  { key: "garde", label: "Garde d'enfants" },
  { key: "courses", label: "Courses" },
  { key: "soutien_scolaire", label: "Soutien scolaire" },
  { key: "autre", label: "Autre" },
];

const TABS = [
  { key: "disponibles", label: "🔍 Disponibles" },
  { key: "nouvelle", label: "➕ Nouvelle tâche" },
  { key: "publications", label: "📋 Mes publications" },
  { key: "candidatures", label: "📤 Mes candidatures" },
];

/**
 * Marketplace de petites tâches — CampusGo
 * Paiement via FedaPay délégué côté serveur (Edge Function "payer-tache").
 */
export default function TachesPage() {
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState("disponibles");
  const [catFilter, setCatFilter] = useState("tous");

  const [taches, setTaches] = useState([]);
  const [mesPublications, setMesPublications] = useState([]);
  const [mesCandidatures, setMesCandidatures] = useState([]);
  const [candidaturesRecues, setCandidaturesRecues] = useState([]);

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [candidatureOuverte, setCandidatureOuverte] = useState(null);

  const [form, setForm] = useState({
    titre: "",
    categorie: "menage",
    description: "",
    prix_propose: "",
  });

  useEffect(() => {
    if (user) chargerTout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function chargerTout() {
    setLoading(true);
    await Promise.all([
      chargerTaches(),
      chargerMesPublications(),
      chargerMesCandidatures(),
      chargerCandidaturesRecues(),
    ]);
    setLoading(false);
  }

  async function chargerTaches() {
    const { data, error } = await supabase
      .from("taches")
      .select("*")
      .eq("statut", "ouverte")
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setTaches(data || []);
  }

  async function chargerMesPublications() {
    const { data, error } = await supabase
      .from("taches")
      .select("*")
      .eq("demandeur_id", user.id)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setMesPublications(data || []);
  }

  async function chargerMesCandidatures() {
    const { data, error } = await supabase
      .from("candidatures")
      .select("*, taches(titre, prix_propose, categorie)")
      .eq("etudiant_id", user.id)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setMesCandidatures(data || []);
  }

  async function chargerCandidaturesRecues() {
    const { data, error } = await supabase
      .from("candidatures")
      .select(
        "*, taches!inner(titre, prix_propose, demandeur_id), profiles(nom)"
      )
      .eq("taches.demandeur_id", user.id)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setCandidaturesRecues(data || []);
  }

  async function publierTache(e) {
    e.preventDefault();
    if (!form.titre.trim() || !form.description.trim()) {
      alert("Veuillez remplir le titre et la description.");
      return;
    }
    setPublishing(true);
    const { error } = await supabase.from("taches").insert({
      demandeur_id: user.id,
      titre: form.titre.trim(),
      categorie: form.categorie,
      description: form.description.trim(),
      prix_propose: Number(form.prix_propose) || null,
      statut: "ouverte",
    });
    setPublishing(false);
    if (error) {
      alert("Erreur lors de la publication : " + error.message);
      return;
    }
    setForm({ titre: "", categorie: "menage", description: "", prix_propose: "" });
    await chargerTout();
    setActiveTab("publications");
  }

  async function postuler(tacheId) {
    const { data, error } = await supabase
      .from("candidatures")
      .insert({ tache_id: tacheId, etudiant_id: user.id, statut: "en_discussion" })
      .select()
      .single();
    if (error) {
      alert("Vous avez peut-être déjà postulé à cette tâche.");
      return;
    }
    await chargerMesCandidatures();
    setCandidatureOuverte(data.id);
    setActiveTab("candidatures");
  }

  async function accepterCandidature(candidatureId) {
    const { error } = await supabase.rpc("accepter_candidature", {
      p_candidature_id: candidatureId,
    });
    if (error) {
      alert("Impossible d'accepter cette candidature : " + error.message);
      return;
    }
    await chargerTout();
  }

  async function payerTache(tacheId) {
    setPayingId(tacheId);
    try {
      const { data, error } = await supabase.functions.invoke("payer-tache", {
        body: { tacheId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.lien_paiement) window.open(data.lien_paiement, "_blank");
      else if (data?.redirect_url) window.location.href = data.redirect_url;
      else if (data?.token && data?.checkout_url) window.open(data.checkout_url, "_blank");
      else throw new Error("Réponse du serveur inattendue.");
    } catch (err) {
      alert("Échec du paiement FedaPay : " + err.message);
    } finally {
      setPayingId(null);
    }
  }

  // ── CONDITION ROBUSTE pour afficher le bouton postuler ──
  // Le bouton s'affiche SI :
  // 1. L'utilisateur est connecté
  // 2. Ce n'est PAS sa propre tâche
  // 3. Son rôle n'est pas "particulier"
  const peutPostuler = (tache) => {
    if (!user) return false;
    if (tache.demandeur_id === user.id) return false;
    if (profile?.role === "particulier") return false;
    return true;
  };

  const tachesFiltrees =
    catFilter === "tous"
      ? taches
      : taches.filter((t) => t.categorie === catFilter);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px" }}>
      {/* Titre */}
      <h1 style={{ margin: "24px 0 8px", fontSize: 28, fontWeight: 700 }}>
        Petites tâches rémunérées
      </h1>
      <p style={{ margin: "0 0 20px", color: "var(--color-text-muted)", fontSize: 15 }}>
        Publiez une tâche ou postulez à celles disponibles. Le paiement sécurisé se fait via FedaPay.
      </p>

      {/* ── ONGLETS ── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 24,
          borderBottom: "1px solid var(--color-border)",
          paddingBottom: 12,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setCandidatureOuverte(null);
            }}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              background: activeTab === tab.key ? "var(--color-primary)" : "transparent",
              color: activeTab === tab.key ? "#fff" : "var(--color-text)",
              transition: "all 0.2s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
          ONGLET : TÂCHES DISPONIBLES
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "disponibles" && (
        <div>
          {/* Filtres catégories */}
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              marginBottom: 20,
              paddingBottom: 4,
            }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCatFilter(cat.key)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 20,
                  border: "1px solid var(--color-border)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  background: catFilter === cat.key ? "var(--color-primary)" : "var(--color-surface)",
                  color: catFilter === cat.key ? "#fff" : "var(--color-text)",
                  transition: "all 0.15s ease",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {loading && <p>Chargement…</p>}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {tachesFiltrees.map((t) => (
              <div
                key={t.id}
                className="card"
                style={{
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    className="tag"
                    style={{
                      textTransform: "capitalize",
                      fontSize: 12,
                      padding: "4px 10px",
                    }}
                  >
                    {t.categorie}
                  </span>
                  {t.prix_propose && (
                    <span style={{ fontWeight: 700, fontSize: 15, color: "var(--color-primary)" }}>
                      {t.prix_propose} FCFA
                    </span>
                  )}
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{t.titre}</h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: "var(--color-text-muted)",
                    lineHeight: 1.5,
                    flex: 1,
                  }}
                >
                  {t.description}
                </p>
                {peutPostuler(t) && (
                  <button
                    className="btn btn-primary"
                    onClick={() => postuler(t.id)}
                    style={{ width: "100%", marginTop: 4 }}
                  >
                    Je suis disponible
                  </button>
                )}
                {/* Message pour le créateur de la tâche */}
                {user && t.demandeur_id === user.id && (
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                      fontStyle: "italic",
                      marginTop: 4,
                    }}
                  >
                    📝 C'est votre publication
                  </span>
                )}
              </div>
            ))}
          </div>

          {!loading && tachesFiltrees.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--color-text-muted)",
              }}
            >
              <p style={{ fontSize: 16 }}>Aucune tâche dans cette catégorie pour le moment.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ONGLET : NOUVELLE TÂCHE
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "nouvelle" && (
        <div className="card" style={{ maxWidth: 560, padding: 28 }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700 }}>
            ➕ Publier une nouvelle tâche
          </h2>
          <form onSubmit={publierTache}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Titre</label>
              <input required value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Ex : Aide au ménage samedi matin" style={{
                width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--color-border)",
                fontSize: 15, background: "var(--color-surface)", color: "var(--color-text)", boxSizing: "border-box",
              }} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Catégorie</label>
              <select value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} style={{
                width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--color-border)",
                fontSize: 15, background: "var(--color-surface)", color: "var(--color-text)", boxSizing: "border-box", cursor: "pointer",
              }}>
                <option value="menage">Ménage</option>
                <option value="garde">Garde d'enfants</option>
                <option value="courses">Courses</option>
                <option value="soutien_scolaire">Soutien scolaire</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Description</label>
              <textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez la tâche en détail : lieu, horaire, besoins spécifiques…" style={{
                width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--color-border)",
                fontSize: 15, background: "var(--color-surface)", color: "var(--color-text)", boxSizing: "border-box",
                resize: "vertical", fontFamily: "inherit", lineHeight: 1.5,
              }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Prix indicatif (FCFA)</label>
              <input type="number" min="0" value={form.prix_propose} onChange={(e) => setForm({ ...form, prix_propose: e.target.value })} placeholder="Ex : 5000" style={{
                width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--color-border)",
                fontSize: 15, background: "var(--color-surface)", color: "var(--color-text)", boxSizing: "border-box",
              }} />
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>Ce prix est indicatif et négociable dans la messagerie.</p>
            </div>
            <button className="btn btn-primary" type="submit" disabled={publishing} style={{ width: "100%", padding: "14px", fontSize: 16, fontWeight: 600 }}>
              {publishing ? "Publication en cours…" : "Publier la tâche"}
            </button>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ONGLET : MES PUBLICATIONS
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "publications" && (
        <div>
          {mesPublications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--color-text-muted)" }}>
              <p style={{ fontSize: 16 }}>Vous n'avez publié aucune tâche pour le moment.</p>
              <button className="btn btn-primary" onClick={() => setActiveTab("nouvelle")} style={{ marginTop: 12 }}>Publier ma première tâche</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {mesPublications.map((pub) => {
                const candidats = candidaturesRecues.filter((c) => c.tache_id === pub.id);
                return (
                  <div key={pub.id} className="card" style={{ padding: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{pub.titre}</h3>
                      <span className="tag" style={{ fontSize: 12, padding: "4px 10px", textTransform: "capitalize", flexShrink: 0 }}>{pub.statut}</span>
                    </div>
                    <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5 }}>{pub.description}</p>
                    {pub.prix_propose && <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>{pub.prix_propose} FCFA</p>}

                    {candidats.length > 0 && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--color-border)" }}>
                        <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>📥 Candidatures reçues ({candidats.length})</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {candidats.map((c) => (
                            <div key={c.id} style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 16, background: "var(--color-surface)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                <span style={{ fontWeight: 600, fontSize: 15 }}>{c.profiles?.nom || "Étudiant"}</span>
                                <span className="tag" style={{ fontSize: 11, padding: "3px 8px" }}>{c.statut}</span>
                              </div>
                              {candidatureOuverte === c.id && (
                                <div style={{ margin: "10px 0", border: "1px solid var(--color-border)", borderRadius: 8, padding: 10, background: "var(--color-background)" }}>
                                  <Messagerie candidatureId={c.id} onFermer={() => setCandidatureOuverte(null)} />
                                </div>
                              )}
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button className="btn btn-primary" onClick={() => setCandidatureOuverte(candidatureOuverte === c.id ? null : c.id)} style={{ fontSize: 13, padding: "8px 14px" }}>
                                  {candidatureOuverte === c.id ? "🔽 Masquer" : "💬 Discuter"}
                                </button>
                                {c.statut === "en_discussion" && (
                                  <button className="btn btn-ghost" onClick={() => accepterCandidature(c.id)} style={{ fontSize: 13, padding: "8px 14px" }}>✅ Accepter</button>
                                )}
                                {c.statut === "acceptee" && (
                                  <button className="btn btn-primary" style={{ background: "#059669", fontSize: 13, padding: "8px 14px" }} onClick={() => payerTache(c.tache_id)} disabled={payingId === c.tache_id}>
                                    {payingId === c.tache_id ? "Connexion FedaPay…" : "💳 Payer"}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {candidats.length === 0 && (
                      <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>Aucune candidature pour le moment.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ONGLET : MES CANDIDATURES
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "candidatures" && (
        <div>
          {mesCandidatures.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--color-text-muted)" }}>
              <p style={{ fontSize: 16 }}>Vous n'avez postulé à aucune tâche pour le moment.</p>
              <button className="btn btn-primary" onClick={() => setActiveTab("disponibles")} style={{ marginTop: 12 }}>Voir les tâches disponibles</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {mesCandidatures.map((c) => (
                <div key={c.id} className="card" style={{ padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{c.taches?.titre}</h3>
                    <span className="tag" style={{ fontSize: 12, padding: "4px 10px", flexShrink: 0 }}>{c.statut}</span>
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: 14, color: "var(--color-text-muted)" }}>Catégorie : {c.taches?.categorie}</p>
                  {c.taches?.prix_propose && <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>{c.taches.prix_propose} FCFA</p>}
                  {candidatureOuverte === c.id && (
                    <div style={{ margin: "12px 0", border: "1px solid var(--color-border)", borderRadius: 8, padding: 10, background: "var(--color-background)" }}>
                      <Messagerie candidatureId={c.id} onFermer={() => setCandidatureOuverte(null)} />
                    </div>
                  )}
                  <button className="btn btn-primary" onClick={() => setCandidatureOuverte(candidatureOuverte === c.id ? null : c.id)} style={{ fontSize: 14, padding: "10px 18px" }}>
                    {candidatureOuverte === c.id ? "🔽 Masquer la discussion" : "💬 Ouvrir la discussion"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}