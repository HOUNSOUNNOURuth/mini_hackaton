import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Building2,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Landmark,
  GraduationCap,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

/**
 * Module 1 — Rendez-vous.
 * Un créneau n'est plus limité à une seule personne : chaque créneau a une
 * "capacite" (définie par le bureau), et on affiche le nombre de places
 * encore libres via la fonction RPC "creneaux_disponibles".
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
    setLoading(true);
    const { data, error } = await supabase
      .from("bureaux")
      .select("*, lieux(nom, batiment)")
      .order("nom");
    if (!error) setBureaux(data || []);
    setLoading(false);
  }

  async function chargerCreneaux(bureauId) {
    setBureauSelectionne(bureauId);
    setMessage("");
    const { data, error } = await supabase.rpc("creneaux_disponibles", {
      p_bureau_id: bureauId,
    });
    if (error) {
      setMessage("Impossible de charger les créneaux pour ce bureau.");
      return;
    }
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
      setMessage(
        error.message.includes("complet")
          ? "Ce créneau vient d'être complet, choisissez-en un autre."
          : "Vous avez déjà un rendez-vous sur ce créneau."
      );
      chargerCreneaux(bureauSelectionne);
      return;
    }
    setMessage("Rendez-vous confirmé");
    chargerCreneaux(bureauSelectionne);
  }

  // Icône selon la catégorie du bureau
  function iconeCategorie(cat) {
    const c = (cat || "").toLowerCase();
    if (c.includes("bibliothèque") || c.includes("biblio"))
      return <BookOpen size={20} className="text-amber-600" />;
    if (c.includes("banque") || c.includes("boa") || c.includes("argent"))
      return <Landmark size={20} className="text-blue-600" />;
    if (c.includes("direction") || c.includes("directeur"))
      return <Building2 size={20} className="text-purple-600" />;
    if (c.includes("bourse") || c.includes("scolarité"))
      return <GraduationCap size={20} className="text-green-600" />;
    return <Building2 size={20} className="text-gray-500" />;
  }

  // Couleur du badge catégorie
  function couleurCategorie(cat) {
    const c = (cat || "").toLowerCase();
    if (c.includes("bibliothèque") || c.includes("biblio"))
      return "bg-amber-100 text-amber-700";
    if (c.includes("banque") || c.includes("boa"))
      return "bg-blue-100 text-blue-700";
    if (c.includes("direction") || c.includes("directeur"))
      return "bg-purple-100 text-purple-700";
    if (c.includes("bourse") || c.includes("scolarité"))
      return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-600";
  }

  // Couleur du badge places
  function couleurPlaces(restantes, capacite) {
    if (restantes <= 0) return "bg-red-100 text-red-700";
    if (restantes <= capacite * 0.25) return "bg-orange-100 text-orange-700";
    return "bg-green-100 text-green-700";
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Module 01
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
          Prendre rendez-vous
        </h1>
        <p className="text-gray-500 text-sm md:text-base max-w-2xl">
          Choisissez un bureau, puis un créneau. Chaque créneau indique le nombre
          de places encore disponibles.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border ${
            message.includes("confirmé")
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {message.includes("confirmé") ? (
            <CheckCircle size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          {message}
        </div>
      )}

      {/* Chargement */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-8">
          <Loader2 size={18} className="animate-spin" />
          Chargement des bureaux…
        </div>
      ) : (
        <>
          {/* Grid bureaux */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bureaux.map((b) => (
              <button
                key={b.id}
                onClick={() => chargerCreneaux(b.id)}
                className={`text-left bg-white rounded-xl border p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                  bureauSelectionne === b.id
                    ? "border-blue-500 ring-1 ring-blue-500 shadow-md"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${couleurCategorie(
                      b.categorie
                    )}`}
                  >
                    {b.categorie || "Bureau"}
                  </span>
                  {iconeCategorie(b.categorie)}
                </div>

                <h3 className="font-bold text-gray-900 text-[15px] leading-tight mb-1">
                  {b.nom}
                  {b.ecole ? ` — ${b.ecole}` : ""}
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <MapPin size={12} />
                  <span>
                    {b.lieux
                      ? `${b.lieux.nom}${
                          b.lieux.batiment ? " — " + b.lieux.batiment : ""
                        }`
                      : "Localisation à venir"}
                  </span>
                </div>
              </button>
            ))}

            {bureaux.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-400 text-sm">
                Aucun bureau enregistré pour le moment.
              </div>
            )}
          </div>

          {/* Créneaux */}
          {bureauSelectionne && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={18} className="text-blue-600" />
                <h3 className="font-bold text-gray-900">Créneaux disponibles</h3>
              </div>

              {creneaux.length === 0 && (
                <p className="text-gray-400 text-sm py-4">
                  Aucun créneau programmé pour ce bureau.
                </p>
              )}

              <div className="space-y-2">
                {creneaux.map((c) => {
                  const complet = c.places_restantes <= 0;
                  return (
                    <div
                      key={c.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border transition-all ${
                        complet
                          ? "bg-gray-50 border-gray-200 opacity-70"
                          : "bg-white border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock size={14} className="text-gray-400" />
                          <span className="font-semibold text-gray-900 text-sm">
                            {new Date(c.date_heure).toLocaleString("fr-FR", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${couleurPlaces(
                              c.places_restantes,
                              c.capacite
                            )}`}
                          >
                            <Users size={10} />
                            {complet
                              ? "Complet"
                              : `${c.places_restantes} / ${c.capacite} places`}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => reserver(c.id)}
                        disabled={complet}
                        className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          complet
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95"
                        }`}
                      >
                        {complet ? "Complet" : "Réserver"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}