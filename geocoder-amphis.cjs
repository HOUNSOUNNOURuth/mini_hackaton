// À exécuter comme le précédent : node geocoder-amphis.cjs
// Cherche les amphis et les derniers lieux restants sur OpenStreetMap.

const fs = require("fs");

const lieux = [
  { nom: "Amphi Ouattara", requete: "Amphi Ouattara Abomey-Calavi Université" },
  { nom: "Amphi Houégbadja", requete: "Amphi Houégbadja Abomey-Calavi Université" },
  { nom: "Amphi B500", requete: "Amphi B500 Abomey-Calavi" },
  { nom: "Amphi A500", requete: "Amphi A500 Abomey-Calavi" },
  { nom: "Amphi B750", requete: "Amphi B750 Abomey-Calavi" },
  { nom: "Amphi C1000", requete: "Amphi C1000 Abomey-Calavi" },
  { nom: "Amphi Idriss Déby Itno", requete: "Amphi Idriss Deby Itno Abomey-Calavi" },
  { nom: "Amphi UEMOA", requete: "Amphi UEMOA Abomey-Calavi Université" },
  { nom: "Amphi Etisalat", requete: "Amphi Etisalat Abomey-Calavi Université" },
  { nom: "Amphi C", requete: "Amphi C Université Abomey-Calavi" },
  { nom: "Amphi A", requete: "Amphi A Université Abomey-Calavi" },
  { nom: "Amphi B", requete: "Amphi B Université Abomey-Calavi" },
  { nom: "Amphi 1000", requete: "Amphi 1000 Abomey-Calavi" },
  { nom: "Amphi 500", requete: "Amphi 500 Abomey-Calavi" },
  { nom: "Amphi 600", requete: "Amphi 600 Abomey-Calavi" },
  { nom: "Amphi Iran 1", requete: "Amphi Iran Abomey-Calavi" },
  { nom: "Amphi Iran 2", requete: "Amphi Iran Abomey-Calavi" },
  { nom: "Amphi Mamadou Coulibaly", requete: "Amphi Mamadou Coulibaly Abomey-Calavi" },
  { nom: "Amphi ODD", requete: "Amphi ODD Abomey-Calavi Université" },
  { nom: "Terrain de Football", requete: "terrain football Université Abomey-Calavi" },
  { nom: "Jardin Botanique", requete: "jardin botanique Abomey-Calavi Université" },
  { nom: "UBA - Agence campus", requete: "UBA Rue Circulaire des Sciences Abomey-Calavi" },
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
  let sql = "-- Résultats du géocodage des amphis (à relire avant d'exécuter)\n\n";
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
        sql += `-- NON TROUVÉ : ${lieu.nom}\n\n`;
        nonTrouves.push(lieu.nom);
      }
    } catch (err) {
      console.log("⚠️ erreur : " + err.message);
      nonTrouves.push(lieu.nom);
    }
    await attendre(1100);
  }

  fs.writeFileSync("geocodage-amphis.sql", sql, "utf8");

  console.log(`\nTerminé : ${trouves} trouvé(s), ${nonTrouves.length} non trouvé(s).`);
  console.log("Résultats écrits dans geocodage-amphis.sql");
}

main();
