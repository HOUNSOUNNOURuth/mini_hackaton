// Edge Function Supabase : "traduire"
//
// Rôle : traduire un texte saisi (ou dicté) par l'utilisateur, dans n'importe
// quelle langue, vers le français — la langue de référence dans laquelle
// sont enregistrés les lieux du campus (table "lieux").
//
// Service utilisé : MyMemory Translation API (https://mymemory.translated.net)
// -> GRATUIT, SANS carte bancaire, sans clé API à gérer pour un usage normal
//    (limite : ~5000 mots/jour par adresse IP appelante ; comme l'appel part
//    du serveur Supabase, c'est largement suffisant pour un projet étudiant).
//
// Déploiement : supabase functions deploy traduire
// Appel depuis le frontend :
//   supabase.functions.invoke('traduire', { body: { texte: "...", cible: "fr" } })

Deno.serve(async (req) => {
  try {
    const { texte, cible, source } = await req.json();

    if (!texte || !cible) {
      return new Response(JSON.stringify({ error: "Paramètres 'texte' et 'cible' requis." }), { status: 400 });
    }

    // "source" est optionnel : si absent, on met "autodetect" pour laisser
    // MyMemory deviner la langue d'origine (pratique pour la voix multilingue).
    const langpair = `${source || "autodetect"}|${cible}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texte)}&langpair=${langpair}`;

    const response = await fetch(url);
    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Échec de la traduction." }), { status: 502 });
    }

    const data = await response.json();
    const traduction = data?.responseData?.translatedText ?? texte;

    return new Response(
      JSON.stringify({ traduction }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});