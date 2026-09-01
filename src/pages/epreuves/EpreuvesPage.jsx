import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

const NIVEAUX = [
  { key: "L1", label: "L1" },
  { key: "L2", label: "L2" },
  { key: "L3", label: "L3" },
  { key: "M1", label: "M1" },
  { key: "M2", label: "M2" },
  { key: "Doctorat", label: "Doctorat" },
];

const TYPES = [
  { key: "Partiel", label: "Partiel" },
  { key: "Session", label: "Session" },
  { key: "Rattrapage", label: "Rattrapage" },
  { key: "Devoir", label: "Devoir" },
  { key: "TP", label: "TP" },
];

const ANNEES = [
  { key: "2026", label: "2026" },
  { key: "2025", label: "2025" },
  { key: "2024", label: "2024" },
  { key: "2023", label: "2023" },
  { key: "2022", label: "2022" },
  { key: "2021", label: "2021" },
  { key: "2020", label: "2020" },
];

const ECOLES = [
  { key: "IFRI", label: "IFRI" },
  { key: "FASEG", label: "FASEG" },
  { key: "FLASH", label: "FLASH" },
  { key: "FDS", label: "FDS" },
  { key: "FSS", label: "FSS" },
  { key: "EPAC", label: "EPAC" },
  { key: "Autre", label: "Autre" },
];

const FILIERES = [
  { key: "GL", label: "Génie Logiciel (GL)" },
  { key: "SR", label: "Sécurité & Réseaux (SR)" },
  { key: "IM", label: "IM" },
  { key: "Gestion", label: "Gestion" },
  { key: "Economie", label: "Economie" },
  { key: "Medecine", label: "Médecine" },
  { key: "Droit", label: "Droit" },
  { key: "Autre", label: "Autre" },
];

/**
 * Banque d'épreuves — CampusGo
 * Vérification matricule obligatoire avant accès.
 * Seuls les admins peuvent publier.
 */
export default function EpreuvesPage() {
  const { user, profile } = useAuth();

  // ── Récupération directe du rôle (fallback si useAuth ne le passe pas) ──
  const [localRole, setLocalRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRoleLoading(false);
        return;
      }
      // Si useAuth a déjà le rôle, on l'utilise
      if (profile?.role) {
        setLocalRole(profile.role);
        setRoleLoading(false);
        return;
      }
      // Sinon, on va le chercher directement
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!error && data) {
        setLocalRole(data.role);
      }
      setRoleLoading(false);
    }
    fetchRole();
  }, [user, profile]);

  const effectiveRole = localRole || profile?.role;
  const isAdmin = effectiveRole === "admin";

  const tabs = isAdmin
    ? [
        { key: "explorer", label: "📚 Rechercher" },
        { key: "publier", label: "➕ Publier" },
        { key: "mes_epreuves", label: "📋 Mes épreuves" },
        { key: "moderation", label: "⏳ Modération" },
      ]
    : [{ key: "explorer", label: "📚 Rechercher" }];

  const [activeTab, setActiveTab] = useState("explorer");

  // ── Vérification matricule ──
  const [matriculeVerifie, setMatriculeVerifie] = useState(() => {
    return localStorage.getItem("epreuves_matricule_verifie") === "true";
  });
  const [matriculeInput, setMatriculeInput] = useState("");
  const [verifLoading, setVerifLoading] = useState(false);

  // ── Recherche ──
  const [rechercheFaite, setRechercheFaite] = useState(false);
  const [searchForm, setSearchForm] = useState({
    niveau: "L1",
    ecole: "IFRI",
    filiere: "GL",
    annee: "2024",
    matiere: "",
  });

  // ── Données ──
  const [epreuves, setEpreuves] = useState([]);
  const [mesEpreuves, setMesEpreuves] = useState([]);
  const [epreuvesAttente, setEpreuvesAttente] = useState([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── Formulaire publication ──
  const [form, setForm] = useState({
    matiere: "",
    niveau: "L1",
    ecole: "IFRI",
    filiere: "GL",
    annee: "2024",
    type: "Partiel",
    description: "",
  });
  const [pdfFile, setPdfFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user && isAdmin) {
      chargerEpreuvesAttente();
      chargerMesEpreuves();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  async function verifierMatricule(e) {
    e.preventDefault();
    if (!matriculeInput.trim()) {
      alert("Veuillez entrer votre matricule.");
      return;
    }
    setVerifLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, matricule")
      .eq("matricule", matriculeInput.trim())
      .single();

    setVerifLoading(false);

    if (error || !data) {
      alert("Matricule non reconnu. Veuillez vérifier votre saisie.");
      return;
    }

    localStorage.setItem("epreuves_matricule_verifie", "true");
    localStorage.setItem("epreuves_matricule", matriculeInput.trim());
    setMatriculeVerifie(true);
  }

  async function chargerEpreuvesAttente() {
    const { data, error } = await supabase
      .from("epreuves")
      .select("*, profiles(nom)")
      .eq("statut", "en_attente")
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setEpreuvesAttente(data || []);
  }

  async function chargerMesEpreuves() {
    const { data, error } = await supabase
      .from("epreuves")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setMesEpreuves(data || []);
  }

  async function rechercherEpreuves(e) {
    e.preventDefault();
    if (!searchForm.matiere.trim()) {
      alert("Veuillez indiquer la matière.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("epreuves")
      .select("*")
      .eq("statut", "approuve")
      .eq("niveau", searchForm.niveau)
      .eq("ecole", searchForm.ecole)
      .eq("filiere", searchForm.filiere)
      .eq("annee", Number(searchForm.annee))
      .ilike("matiere", `%${searchForm.matiere.trim()}%`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Erreur lors de la recherche.");
    } else {
      setEpreuves(data || []);
      setRechercheFaite(true);
    }
    setLoading(false);
  }

  async function uploadPDF(file) {
    const ext = file.name.split(".").pop();
    const fileName = `epreuves/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upError } = await supabase.storage
      .from("epreuves-pdf")
      .upload(fileName, file, { contentType: file.type });
    if (upError) throw upError;

    const { data: urlData } = supabase.storage
      .from("epreuves-pdf")
      .getPublicUrl(fileName);
    return urlData.publicUrl;
  }

  async function publierEpreuve(e) {
    e.preventDefault();
    if (!form.matiere.trim()) {
      alert("Veuillez indiquer la matière.");
      return;
    }
    if (!pdfFile) {
      alert("Veuillez sélectionner un fichier PDF.");
      return;
    }

    setPublishing(true);
    setUploading(true);
    try {
      const fichierUrl = await uploadPDF(pdfFile);
      setUploading(false);

      const { error } = await supabase.from("epreuves").insert({
        user_id: user.id,
        matiere: form.matiere.trim(),
        niveau: form.niveau,
        ecole: form.ecole,
        filiere: form.filiere,
        annee: Number(form.annee),
        type: form.type,
        description: form.description.trim() || null,
        fichier_url: fichierUrl,
        statut: "en_attente",
      });

      if (error) {
        alert("Erreur lors de la publication : " + error.message);
        setPublishing(false);
        return;
      }

      setForm({
        matiere: "",
        niveau: "L1",
        ecole: "IFRI",
        filiere: "GL",
        annee: "2024",
        type: "Partiel",
        description: "",
      });
      setPdfFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      await Promise.all([chargerEpreuvesAttente(), chargerMesEpreuves()]);
      setActiveTab("mes_epreuves");
    } catch (err) {
      alert("Erreur upload PDF : " + err.message);
    } finally {
      setPublishing(false);
      setUploading(false);
    }
  }

  async function modereEpreuve(id, nouveauStatut) {
    const { error } = await supabase
      .from("epreuves")
      .update({ statut: nouveauStatut })
      .eq("id", id);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    await Promise.all([chargerEpreuvesAttente(), chargerMesEpreuves()]);
  }

  async function supprimerEpreuve(id, fichierUrl) {
    if (!window.confirm("Supprimer définitivement cette épreuve ?")) return;
    if (fichierUrl) {
      const path = fichierUrl.split("/epreuves-pdf/")[1];
      if (path) await supabase.storage.from("epreuves-pdf").remove([path]);
    }
    const { error } = await supabase.from("epreuves").delete().eq("id", id);
    if (error) {
      alert("Erreur suppression : " + error.message);
      return;
    }
    await Promise.all([chargerEpreuvesAttente(), chargerMesEpreuves()]);
  }

  const tagStyle = {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    background: "var(--color-surface)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid var(--color-border)",
    fontSize: 15,
    background: "var(--color-surface)",
    color: "var(--color-text)",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontSize: 14,
    fontWeight: 600,
  };

  // ═══════════════════════════════════════════════════════════
  // ÉCRAN DE VÉRIFICATION MATRICULE
  // ═══════════════════════════════════════════════════════════
  if (!matriculeVerifie) {
    return (
      <div style={{ maxWidth: 420, margin: "80px auto", padding: "0 16px" }}>
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--color-primary)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              margin: "0 auto 20px",
            }}
          >
            🔒
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>
            Accès réservé aux étudiants
          </h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
            Pour accéder à la banque d'épreuves, veuillez entrer votre numéro de matricule.
          </p>

          <form onSubmit={verifierMatricule}>
            <div style={{ marginBottom: 20 }}>
              <input
                required
                value={matriculeInput}
                onChange={(e) => setMatriculeInput(e.target.value)}
                placeholder="Entrez votre matricule…"
                style={{
                  ...inputStyle,
                  textAlign: "center",
                  fontSize: 18,
                  letterSpacing: 2,
                  fontWeight: 600,
                }}
              />
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={verifLoading}
              style={{
                width: "100%",
                padding: "14px",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {verifLoading ? "Vérification…" : "✅ Vérifier mon matricule"}
            </button>
          </form>

          <p style={{ margin: "16px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
            Votre matricule doit être enregistré dans votre profil CampusGo.
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // CONTENU PRINCIPAL
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 24,
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 700 }}>
            Banque d'épreuves
          </h1>
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 14 }}>
            Matricule : {localStorage.getItem("epreuves_matricule")}
            {isAdmin && (
              <span style={{ color: "#059669", fontWeight: 600, marginLeft: 8 }}>
                ● Mode Admin
              </span>
            )}
          </p>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => {
            localStorage.removeItem("epreuves_matricule_verifie");
            localStorage.removeItem("epreuves_matricule");
            setMatriculeVerifie(false);
            setMatriculeInput("");
          }}
          style={{ fontSize: 12, padding: "6px 12px" }}
        >
          🚪 Changer de matricule
        </button>
      </div>
      <p style={{ margin: "8px 0 20px", color: "var(--color-text-muted)", fontSize: 15 }}>
        Recherchez les anciens sujets par matière, niveau, école et filière.
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
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key === "explorer") setRechercheFaite(false);
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
          ONGLET : EXPLORER
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "explorer" && (
        <div>
          {!rechercheFaite ? (
            <div className="card" style={{ maxWidth: 560, padding: 28, margin: "0 auto" }}>
              <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700 }}>
                📚 Rechercher une épreuve
              </h2>
              <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--color-text-muted)" }}>
                Entrez vos coordonnées pour trouver les épreuves de votre filière.
              </p>
              <form onSubmit={rechercherEpreuves}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                  <div>
                    <label style={labelStyle}>Niveau</label>
                    <select
                      value={searchForm.niveau}
                      onChange={(e) => setSearchForm({ ...searchForm, niveau: e.target.value })}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      {NIVEAUX.map((n) => (
                        <option key={n.key} value={n.key}>{n.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>École</label>
                    <select
                      value={searchForm.ecole}
                      onChange={(e) => setSearchForm({ ...searchForm, ecole: e.target.value })}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      {ECOLES.map((e) => (
                        <option key={e.key} value={e.key}>{e.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                  <div>
                    <label style={labelStyle}>Filière</label>
                    <select
                      value={searchForm.filiere}
                      onChange={(e) => setSearchForm({ ...searchForm, filiere: e.target.value })}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      {FILIERES.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Année de l'épreuve</label>
                    <select
                      value={searchForm.annee}
                      onChange={(e) => setSearchForm({ ...searchForm, annee: e.target.value })}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      {ANNEES.map((a) => (
                        <option key={a.key} value={a.key}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>Matière</label>
                  <input
                    required
                    value={searchForm.matiere}
                    onChange={(e) => setSearchForm({ ...searchForm, matiere: e.target.value })}
                    placeholder="Ex : SQL, Droit constitutionnel, Analyse…"
                    style={inputStyle}
                  />
                </div>

                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={loading}
                  style={{ width: "100%", padding: "14px", fontSize: 16, fontWeight: 600 }}
                >
                  {loading ? "Recherche en cours…" : "🔍 Rechercher"}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                  Résultats pour : {searchForm.matiere}
                </h2>
                <button
                  className="btn btn-ghost"
                  onClick={() => setRechercheFaite(false)}
                  style={{ fontSize: 13 }}
                >
                  🔙 Nouvelle recherche
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {epreuves.map((ep) => (
                  <div key={ep.id} className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={tagStyle}>{ep.niveau}</span>
                      <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>{ep.annee}</span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{ep.matiere}</h3>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ ...tagStyle, fontSize: 11 }}>{ep.ecole}</span>
                      <span style={{ ...tagStyle, fontSize: 11 }}>{ep.filiere}</span>
                      <span style={{ ...tagStyle, background: "var(--color-primary)", color: "#fff", border: "none", fontSize: 11 }}>{ep.type}</span>
                    </div>
                    {ep.description && (
                      <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5, flex: 1 }}>{ep.description}</p>
                    )}
                    <a
                      href={ep.fichier_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ width: "100%", marginTop: 4, textAlign: "center", textDecoration: "none", display: "inline-block" }}
                    >
                      📄 Voir le PDF
                    </a>
                  </div>
                ))}
              </div>

              {epreuves.length === 0 && (
                <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--color-text-muted)" }}>
                  <p style={{ fontSize: 16 }}>Aucune épreuve trouvée pour ces critères.</p>
                  <button className="btn btn-primary" onClick={() => setRechercheFaite(false)} style={{ marginTop: 12 }}>
                    Modifier la recherche
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ONGLET : PUBLIER (admin)
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "publier" && isAdmin && (
        <div className="card" style={{ maxWidth: 560, padding: 28 }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700 }}>
            ➕ Publier une épreuve
          </h2>
          <form onSubmit={publierEpreuve}>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Matière</label>
              <input required value={form.matiere} onChange={(e) => setForm({ ...form, matiere: e.target.value })} placeholder="Ex : SQL, Droit constitutionnel…" style={inputStyle} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
              <div>
                <label style={labelStyle}>Niveau</label>
                <select value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                  {NIVEAUX.map((n) => (<option key={n.key} value={n.key}>{n.label}</option>))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Année</label>
                <select value={form.annee} onChange={(e) => setForm({ ...form, annee: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                  {ANNEES.map((a) => (<option key={a.key} value={a.key}>{a.label}</option>))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
              <div>
                <label style={labelStyle}>École</label>
                <select value={form.ecole} onChange={(e) => setForm({ ...form, ecole: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                  {ECOLES.map((e) => (<option key={e.key} value={e.key}>{e.label}</option>))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Filière</label>
                <select value={form.filiere} onChange={(e) => setForm({ ...form, filiere: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                  {FILIERES.map((f) => (<option key={f.key} value={f.key}>{f.label}</option>))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Type d'épreuve</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                {TYPES.map((t) => (<option key={t.key} value={t.key}>{t.label}</option>))}
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Description (optionnel)</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Précisions : durée, professeur, chapitres…" style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Fichier PDF</label>
              <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={(e) => setPdfFile(e.target.files[0] || null)} style={{ ...inputStyle, cursor: "pointer" }} />
              {pdfFile && (
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
                  📎 {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} Mo)
                </p>
              )}
            </div>

            <button className="btn btn-primary" type="submit" disabled={publishing} style={{ width: "100%", padding: "14px", fontSize: 16, fontWeight: 600 }}>
              {uploading ? "Upload du PDF…" : publishing ? "Publication…" : "Publier l'épreuve"}
            </button>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--color-text-muted)", textAlign: "center" }}>
              L'épreuve sera soumise à validation avant d'être visible.
            </p>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ONGLET : MES ÉPREUVES (admin)
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "mes_epreuves" && isAdmin && (
        <div>
          {mesEpreuves.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--color-text-muted)" }}>
              <p style={{ fontSize: 16 }}>Vous n'avez publié aucune épreuve.</p>
              <button className="btn btn-primary" onClick={() => setActiveTab("publier")} style={{ marginTop: 12 }}>
                Publier ma première épreuve
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {mesEpreuves.map((ep) => (
                <div key={ep.id} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 600 }}>{ep.matiere}</h3>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
                        {ep.ecole} · {ep.filiere} · {ep.niveau} · {ep.annee} · {ep.type}
                      </p>
                    </div>
                    <span style={{ ...tagStyle, flexShrink: 0, background: ep.statut === "approuve" ? "#059669" : ep.statut === "refuse" ? "#dc2626" : "#f59e0b", color: "#fff", border: "none" }}>
                      {ep.statut === "approuve" ? "✅ Approuvée" : ep.statut === "refuse" ? "❌ Refusée" : "⏳ En attente"}
                    </span>
                  </div>
                  {ep.description && (
                    <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5 }}>{ep.description}</p>
                  )}
                  <a href={ep.fichier_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ alignSelf: "flex-start", fontSize: 13, textDecoration: "none" }}>
                    📄 Voir le PDF
                  </a>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                    {ep.statut === "en_attente" && (
                      <>
                        <button className="btn btn-primary" style={{ background: "#059669", fontSize: 14, padding: "10px 18px" }} onClick={() => modereEpreuve(ep.id, "approuve")}>
                          ✅ Auto-approuver
                        </button>
                        <button className="btn btn-ghost" style={{ fontSize: 14, padding: "10px 18px", color: "#dc2626" }} onClick={() => modereEpreuve(ep.id, "refuse")}>
                          ❌ Refuser
                        </button>
                      </>
                    )}
                    <button className="btn btn-ghost" style={{ fontSize: 14, padding: "10px 18px" }} onClick={() => supprimerEpreuve(ep.id, ep.fichier_url)}>
                      🗑 Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ONGLET : MODÉRATION (admin)
          ═══════════════════════════════════════════════════════ */}
      {activeTab === "moderation" && isAdmin && (
        <div>
          {epreuvesAttente.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--color-text-muted)" }}>
              <p style={{ fontSize: 16 }}>Aucune épreuve en attente de validation.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {epreuvesAttente.map((ep) => (
                <div key={ep.id} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 600 }}>{ep.matiere}</h3>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
                        {ep.ecole} · {ep.filiere} · {ep.niveau} · {ep.annee} · {ep.type}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
                        Publié par {ep.profiles?.nom || "Admin"}
                      </p>
                    </div>
                    <span style={{ ...tagStyle, background: "#f59e0b", color: "#fff", border: "none", flexShrink: 0 }}>En attente</span>
                  </div>
                  {ep.description && (
                    <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5 }}>{ep.description}</p>
                  )}
                  <a href={ep.fichier_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ alignSelf: "flex-start", fontSize: 13, textDecoration: "none" }}>
                    📄 Prévisualiser le PDF
                  </a>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                    <button className="btn btn-primary" style={{ background: "#059669", fontSize: 14, padding: "10px 18px" }} onClick={() => modereEpreuve(ep.id, "approuve")}>
                      ✅ Approuver
                    </button>
                    <button className="btn btn-ghost" style={{ fontSize: 14, padding: "10px 18px", color: "#dc2626" }} onClick={() => modereEpreuve(ep.id, "refuse")}>
                      ❌ Refuser
                    </button>
                    <button className="btn btn-ghost" style={{ fontSize: 14, padding: "10px 18px" }} onClick={() => supprimerEpreuve(ep.id, ep.fichier_url)}>
                      🗑 Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}