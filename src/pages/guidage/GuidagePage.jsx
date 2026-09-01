import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import {
  MapPin, Navigation, Volume2, VolumeX, Play, Pause,
  RotateCcw, ChevronRight, ChevronLeft, Flag, LocateFixed,
  ArrowUp, CornerUpLeft, CornerUpRight, CircleDot,
  Clock, AlertCircle, Mic, Radar, Crosshair,
} from "lucide-react";

/* ─── Math Haversine ─── */
function deg2rad(d) { return d * (Math.PI / 180); }

function distanceMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function capDegres(lat1, lon1, lat2, lon2) {
  const dLon = deg2rad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(deg2rad(lat2));
  const x =
    Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
    Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(dLon);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function directionTexte(deg) {
  if (deg >= 337.5 || deg < 22.5) return "Nord";
  if (deg < 67.5) return "Nord-Est";
  if (deg < 112.5) return "Est";
  if (deg < 157.5) return "Sud-Est";
  if (deg < 202.5) return "Sud";
  if (deg < 247.5) return "Sud-Ouest";
  if (deg < 292.5) return "Ouest";
  return "Nord-Ouest";
}

function tournerTexte(capActuel, capSuivant) {
  let diff = ((capSuivant - capActuel + 540) % 360) - 180;
  if (Math.abs(diff) < 15) return "Continuez tout droit";
  if (diff > 0 && diff < 45) return "Légèrement à droite";
  if (diff < 0 && diff > -45) return "Légèrement à gauche";
  if (diff > 0) return "Tournez à droite";
  return "Tournez à gauche";
}

function genererEtapes(dep, arr) {
  const distTotale = distanceMetres(dep.lat, dep.lng, arr.lat, arr.lng);
  const nbSegments = Math.max(2, Math.ceil(distTotale / 150));
  const etapes = [];
  for (let i = 0; i <= nbSegments; i++) {
    const t = i / nbSegments;
    etapes.push({
      lat: dep.lat + (arr.lat - dep.lat) * t,
      lng: dep.lng + (arr.lng - dep.lng) * t,
    });
  }
  const instructions = [];
  for (let i = 0; i < etapes.length - 1; i++) {
    const d = distanceMetres(etapes[i].lat, etapes[i].lng, etapes[i + 1].lat, etapes[i + 1].lng);
    const cap = capDegres(etapes[i].lat, etapes[i].lng, etapes[i + 1].lat, etapes[i + 1].lng);
    let texte;
    if (i === 0) {
      texte = "Départ depuis " + dep.nom + ". Continuez vers le " + directionTexte(cap);
    } else if (i === etapes.length - 2) {
      texte = "Vous arrivez à " + arr.nom;
    } else {
      const capPrec = capDegres(etapes[i - 1].lat, etapes[i - 1].lng, etapes[i].lat, etapes[i].lng);
      texte = tournerTexte(capPrec, cap);
    }
    instructions.push({
      instruction: texte,
      distance: d,
      lat: etapes[i].lat,
      lng: etapes[i].lng,
      type: i === 0 ? 0 : i === etapes.length - 2 ? 1 : 6,
    });
  }
  return {
    steps: instructions,
    distance: distTotale,
    duration: Math.round((distTotale / 1.2) / 60),
  };
}

/* ─── Composant Carte Leaflet ─── */
function CarteGuidage({ depart, arrivee, positionLive, enCours }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);
  const LRef = useRef(null);
  const [leafletReady, setLeafletReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function initLeaflet() {
      const L = await import("leaflet");
      if (!mounted) return;
      LRef.current = L;
      await import("leaflet/dist/leaflet.css");

      const map = L.map("map-guidage").setView([depart.lat, depart.lng], 17);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      // Marqueur départ
      const depHtml = '<div style="background:#3b82f6;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>';
      L.marker([depart.lat, depart.lng], {
        icon: L.divIcon({ className: "", html: depHtml, iconSize: [14, 14], iconAnchor: [7, 7] }),
      }).addTo(map).bindPopup("Depart : " + depart.nom);

      // Marqueur arrivée
      const arrHtml = '<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>';
      L.marker([arrivee.lat, arrivee.lng], {
        icon: L.divIcon({ className: "", html: arrHtml, iconSize: [14, 14], iconAnchor: [7, 7] }),
      }).addTo(map).bindPopup("Arrivee : " + arrivee.nom);

      // Ligne trajet
      const polyline = L.polyline(
        [[depart.lat, depart.lng], [arrivee.lat, arrivee.lng]],
        { color: "#3b82f6", weight: 5, opacity: 0.7, dashArray: "8, 6" }
      ).addTo(map);
      polylineRef.current = polyline;

      // Marqueur live
      const liveHtml = '<div style="position:relative;width:20px;height:20px;"><div style="position:absolute;inset:0;background:#22c55e;border-radius:50%;opacity:0.3;animation:pulse-ring 1.5s infinite;"></div><div style="position:absolute;inset:4px;background:#22c55e;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div></div><style>@keyframes pulse-ring{0%{transform:scale(1);opacity:0.4;}100%{transform:scale(2.5);opacity:0;}}</style>';
      const liveMarker = L.marker([depart.lat, depart.lng], {
        icon: L.divIcon({ className: "", html: liveHtml, iconSize: [20, 20], iconAnchor: [10, 10] }),
      }).addTo(map);
      markerRef.current = liveMarker;
      mapRef.current = map;
      setLeafletReady(true);
    }
    initLeaflet();
    return () => { mounted = false; if (mapRef.current) mapRef.current.remove(); };
  }, [depart, arrivee]);

  useEffect(() => {
    if (!leafletReady || !positionLive || !markerRef.current || !mapRef.current) return;
    const { lat, lng } = positionLive;
    markerRef.current.setLatLng([lat, lng]);
    if (enCours) {
      mapRef.current.panTo([lat, lng], { animate: true, duration: 0.5 });
    }
  }, [positionLive, enCours, leafletReady]);

  return <div id="map-guidage" className="w-full h-full rounded-xl" />;
}

export default function GuidagePage() {
  const { user } = useAuth();
  const [lieux, setLieux] = useState([]);
  const [depart, setDepart] = useState(null);
  const [arrivee, setArrivee] = useState(null);
  const [itineraire, setItineraire] = useState(null);
  const [etapeIdx, setEtapeIdx] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const [mute, setMute] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");
  const [arrive, setArrive] = useState(false);
  const [geoStatus, setGeoStatus] = useState("detecting");
  const [geoCoords, setGeoCoords] = useState(null);
  const [positionLive, setPositionLive] = useState(null);
  const watchIdRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  /* ── 1. Charger lieux ── */
  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase
        .from("lieux")
        .select("id, nom, latitude, longitude, batiment")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("nom");
      if (!error) setLieux(data || []);
      setLoading(false);
    }
    charger();
  }, []);

  /* ── 2. Détecter position GPS ── */
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("detecting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGeoCoords(coords);
        setPositionLive(coords);
        setGeoStatus("found");
      },
      (err) => {
        console.error("Geolocalisation refusee:", err);
        setGeoStatus(err.code === 1 ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  /* ── 3. Auto-selectionner depart ── */
  useEffect(() => {
    if (geoStatus !== "found" || lieux.length === 0 || !geoCoords) return;
    let plusProche = null;
    let minDist = Infinity;
    lieux.forEach((l) => {
      const d = distanceMetres(geoCoords.lat, geoCoords.lng, l.latitude, l.longitude);
      if (d < minDist) {
        minDist = d;
        plusProche = l;
      }
    });
    if (plusProche) {
      setDepart({ ...plusProche, lat: plusProche.latitude, lng: plusProche.longitude });
    }
  }, [geoStatus, lieux, geoCoords]);

  /* ── 4. Watch position temps reel ── */
  function demarrerWatch() {
    if (!navigator.geolocation) return;
    if (watchIdRef.current !== null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPositionLive(coords);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  function arreterWatch() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  useEffect(() => {
    return () => arreterWatch();
  }, []);

  useEffect(() => () => synthRef.current.cancel(), []);

  const parler = useCallback((texte) => {
    if (mute || !texte) return;
    const s = synthRef.current;
    s.cancel();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = "fr-FR";
    u.rate = 1;
    u.pitch = 1;
    s.speak(u);
  }, [mute]);

  function calculer() {
    setErreur("");
    setItineraire(null);
    setArrive(false);
    setEtapeIdx(0);
    setEnCours(false);
    if (!depart || !arrivee) {
      setErreur("Selectionnez un depart et une destination.");
      return;
    }
    if (depart.id === arrivee.id) {
      setErreur("Le depart et l'arrivee sont identiques.");
      return;
    }
    setItineraire(genererEtapes(depart, arrivee));
  }

  function demarrerNavigation() {
    if (!itineraire || itineraire.steps.length === 0) return;
    setEnCours(true);
    setArrive(false);
    setEtapeIdx(0);
    demarrerWatch();
    lireEtape(0);
  }

  function lireEtape(idx) {
    if (!itineraire) return;
    const steps = itineraire.steps;
    if (idx >= steps.length) {
      setArrive(true);
      setEnCours(false);
      arreterWatch();
      parler("Vous etes arrive a destination.");
      return;
    }
    setEtapeIdx(idx);
    const etape = steps[idx];
    const texte = idx === steps.length - 1
      ? etape.instruction + ". Vous etes arrive."
      : etape.instruction + " pendant " + etape.distance + " metres.";
    parler(texte);
  }

  function etapeSuivante() {
    if (!enCours || !itineraire) return;
    lireEtape(etapeIdx + 1);
  }
  function etapePrecedente() {
    if (!enCours || !itineraire || etapeIdx <= 0) return;
    lireEtape(etapeIdx - 1);
  }

  function iconeDirection(type) {
    switch (type) {
      case 0: return <CircleDot size={28} className="text-blue-600" />;
      case 1: return <Flag size={28} className="text-green-600" />;
      case 2: return <CornerUpLeft size={28} className="text-amber-600" />;
      case 3: return <CornerUpRight size={28} className="text-amber-600" />;
      default: return <ArrowUp size={28} className="text-blue-500" />;
    }
  }

  function badgeGeo() {
    if (geoStatus === "detecting")
      return (
        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-xs font-medium">
          <Radar size={12} className="animate-spin" />
          Detection de votre position…
        </span>
      );
    if (geoStatus === "denied")
      return (
        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full text-xs font-medium">
          <AlertCircle size={12} />
          Geolocalisation refusee — choisissez le depart manuellement
        </span>
      );
    if (geoStatus === "error")
      return (
        <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-xs font-medium">
          <AlertCircle size={12} />
          GPS indisponible — choisissez le depart manuellement
        </span>
      );
    if (depart)
      return (
        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium">
          <LocateFixed size={12} />
          Depart detecte : <strong>{depart.nom}</strong>
          {positionLive && (
            <span className="text-green-500 ml-1">
              <Crosshair size={10} className="inline animate-pulse" /> Live
            </span>
          )}
        </span>
      );
    return null;
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
          Module Guidage
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
          Guidage GPS Campus
        </h1>
        <p className="text-gray-500 text-sm md:text-base">
          Votre position est detectee automatiquement. La carte suit vos deplacements en temps reel.
        </p>
        {badgeGeo()}
      </div>

      {/* Selecteurs */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 shadow-sm space-y-4">
        {loading ? (
          <p className="text-gray-500 text-sm">Chargement des lieux…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Depart {geoStatus === "found" && <span className="text-green-600 font-normal normal-case">(auto-detecte)</span>}
                </label>
                <div className="relative">
                  <LocateFixed size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                  <select
                    value={depart?.id || ""}
                    onChange={(e) => {
                      const l = lieux.find((x) => x.id === e.target.value);
                      setDepart(l ? { ...l, lat: l.latitude, lng: l.longitude } : null);
                    }}
                    className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-gray-300 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Choisir un lieu…</option>
                    {lieux.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nom} {l.batiment ? "— " + l.batiment : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" />
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Destination
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" />
                  <select
                    value={arrivee?.id || ""}
                    onChange={(e) => {
                      const l = lieux.find((x) => x.id === e.target.value);
                      setArrivee(l ? { ...l, lat: l.latitude, lng: l.longitude } : null);
                    }}
                    className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-gray-300 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Choisir un lieu…</option>
                    {lieux.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nom} {l.batiment ? "— " + l.batiment : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={calculer}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95"
              >
                <Navigation size={16} />
                Calculer l'itineraire
              </button>

              {itineraire && (
                <button
                  onClick={() => setMute((m) => !m)}
                  className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  {mute ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  {mute ? "Son coupe" : "Son active"}
                </button>
              )}
            </div>

            {erreur && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
                <AlertCircle size={16} />
                {erreur}
              </div>
            )}
          </>
        )}
      </div>

      {/* RESULTAT */}
      {itineraire && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Panneau instruction */}
          <div className="lg:col-span-1 space-y-3">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-blue-600 text-white p-5 text-center">
                {arrive ? (
                  <>
                    <Flag size={48} className="mx-auto mb-2" />
                    <div className="text-2xl font-bold">Vous etes arrive !</div>
                    <div className="text-blue-100 text-sm mt-1">{arrivee.nom}</div>
                  </>
                ) : (
                  <>
                    <div className="mx-auto mb-2">{iconeDirection(itineraire.steps[etapeIdx]?.type)}</div>
                    <div className="text-lg font-bold leading-tight">
                      {itineraire.steps[etapeIdx]?.instruction || "Pret a partir"}
                    </div>
                    <div className="text-blue-100 text-sm mt-1">
                      {itineraire.steps[etapeIdx]?.distance > 0
                        ? "Pendant " + Math.round(itineraire.steps[etapeIdx].distance) + " m"
                        : "Vous y etes"}
                    </div>
                  </>
                )}
              </div>

              <div className="p-3 flex items-center justify-between gap-2 border-t border-gray-100">
                <button
                  onClick={etapePrecedente}
                  disabled={!enCours || etapeIdx <= 0}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={16} /> Precedent
                </button>

                {!enCours && !arrive ? (
                  <button
                    onClick={demarrerNavigation}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition active:scale-95"
                  >
                    <Play size={16} /> Demarrer
                  </button>
                ) : arrive ? (
                  <button
                    onClick={() => { setArrive(false); setEnCours(false); setEtapeIdx(0); }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
                  >
                    <RotateCcw size={16} /> Recommencer
                  </button>
                ) : (
                  <button
                    onClick={etapeSuivante}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition active:scale-95"
                  >
                    Suivant <ChevronRight size={16} />
                  </button>
                )}

                <button
                  onClick={() => { setEnCours(false); synthRef.current.cancel(); arreterWatch(); }}
                  disabled={!enCours}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Pause size={16} /> Pause
                </button>
              </div>

              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1"><Navigation size={12} /> {Math.round(itineraire.distance)} m</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {itineraire.duration} min</span>
                <span className="flex items-center gap-1"><CornerUpRight size={12} /> {itineraire.steps.length} etapes</span>
              </div>
            </div>

            {/* Liste etapes */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm max-h-80 overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Detail de l'itineraire
              </div>
              {itineraire.steps.map((s, i) => (
                <div
                  key={i}
                  onClick={() => { setEtapeIdx(i); if (enCours) lireEtape(i); }}
                  className={"flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer transition " +
                    (i === etapeIdx ? "bg-blue-50 border-l-4 border-l-blue-500" : "hover:bg-gray-50 border-l-4 border-l-transparent")}
                >
                  <div className="mt-0.5 shrink-0">{iconeDirection(s.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 leading-snug">{s.instruction}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.distance > 0 ? Math.round(s.distance) + " m" : "—"}</div>
                  </div>
                  {i === etapeIdx && enCours && <Mic size={14} className="text-blue-500 shrink-0 mt-1 animate-pulse" />}
                </div>
              ))}
            </div>
          </div>

          {/* Carte Leaflet */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-96 lg:h-full min-h-[400px]">
              <CarteGuidage
                depart={depart}
                arrivee={arrivee}
                positionLive={positionLive}
                enCours={enCours}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}