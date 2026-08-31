// Script à exécuter UNE FOIS depuis ton ordinateur (pas dans Supabase) :
//   node geocoder.js
//
// Rôle : interroge OpenStreetMap (gratuit, sans clé) pour chaque lieu de la
// liste ci-dessous, et génère un fichier "geocodage.sql" contenant les
// commandes UPDATE prêtes à copier-coller dans le SQL Editor de Supabase.
//
// Respecte la règle de politesse d'OpenStreetMap : 1 requête par seconde max.

const fs = require("fs");

// Liste des lieux à chercher : "nom" doit correspondre EXACTEMENT au nom
// déjà présent dans la table "lieux" sur Supabase (pour que l'UPDATE marche).
// "requete" est le texte envoyé à OpenStreetMap (on peut être plus précis
// ici que le nom affiché aux étudiants).
const lieux = [
  { nom: "EPAC", requete: "École Polytechnique d'Abomey-Calavi" },
  { nom: "ENEAM", requete: "ENEAM Cotonou Bénin" },
  { nom: "ENAM", requete: "ENAM Abomey-Calavi Bénin" },
  { nom: "FASHS", requete: "FASHS Abomey-Calavi Bénin" },
  { nom: "IFRI", requete: "IFRI Abomey-Calavi Bénin" },
  { nom: "INE", requete: "Institut National de l'Eau Abomey-Calavi" },
  { nom: "FSA", requete: "Faculté des Sciences Agronomiques Abomey-Calavi" },
  { nom: "FAST", requete: "Faculté des Sciences et Techniques Abomey-Calavi" },
  { nom: "FSS", requete: "Faculté des Sciences de la Santé Cotonou" },
  { nom: "INJEPS", requete: "INJEPS Porto-Novo Bénin" },
  { nom: "Bibliothèque Centrale UAC", requete: "Bibliothèque Centrale UAC Abomey-Calavi" },
  { nom: "Resto U (Restaurant Universitaire principal)", requete: "Restaurant Universitaire Abomey-Calavi" },
  { nom: "Ecobank - Agence campus", requete: "Ecobank Abomey-Calavi campus" },
  { nom: "UBA - Agence campus", requete: "UBA Abomey-Calavi campus" },
  { nom: "BOA - Agence campus", requete: "BOA Abomey-Calavi campus" },
  { nom: "Terrain de Football", requete: "terrain de football UAC Abomey-Calavi" },
  { nom: "Jardin Botanique", requete: "Jardin Botanique UAC Abomey-Calavi" },
];

async function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function chercherCoordonnees(requete) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(requete)}&format=json&limit=1`;
  const reponse = await fetch(url, { headers: { "User-Agent": "CampusGo-geocodage/1.0" } });
  const resultats = await reponse.json();
  return resultats[0] || null;
}

async function main() {
  let sql = "-- Résultats du géocodage automatique (à relire avant d'exécuter)\n\n";
  let trouves = 0;
  let nonTrouves = [];

  for (const lieu of lieux) {
    process.stdout.write(`Recherche : ${lieu.nom}... `);
    try {
      const resultat = await chercherCoordonnees(lieu.requete);
      if (resultat) {
        console.log(`✅ trouvé (${resultat.display_name})`);
        sql += `-- ${resultat.display_name}\n`;
        sql += `update lieux set latitude = ${resultat.lat}, longitude = ${resultat.lon} where nom = '${lieu.nom.replace(/'/g, "''")}';\n\n`;
        trouves++;
      } else {
        console.log("❌ non trouvé");
        sql += `-- NON TROUVÉ : ${lieu.nom} — à compléter manuellement avec un "repere" texte\n\n`;
        nonTrouves.push(lieu.nom);
      }
    } catch (err) {
      console.log("⚠️ erreur : " + err.message);
      nonTrouves.push(lieu.nom);
    }
    await attendre(1100); // pause obligatoire d'1 seconde entre chaque requête
  }

  fs.writeFileSync("geocodage.sql", sql, "utf8");

  console.log(`\nTerminé : ${trouves} trouvé(s), ${nonTrouves.length} non trouvé(s).`);
  console.log("Résultats écrits dans geocodage.sql — relis-le avant de l'exécuter dans Supabase.");
  if (nonTrouves.length > 0) {
    console.log("\nÀ compléter manuellement (repere texte) :");
    nonTrouves.forEach((n) => console.log(" - " + n));
  }
}

main();
