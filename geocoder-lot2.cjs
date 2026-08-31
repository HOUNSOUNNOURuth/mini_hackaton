// À exécuter comme les précédents : node geocoder-lot2.cjs

const fs = require("fs");

const lieux = [
  { nom: "Amphi A400", requete: "Amphi A400 Abomey-Calavi" },
  { nom: "Amphi A750", requete: "Amphi A750 Abomey-Calavi" },
  { nom: "Amphi Amousouga 1", requete: "Amphi Amoussouga Abomey-Calavi" },
  { nom: "Amphi Amousouga 2", requete: "Amphi Amoussouga Abomey-Calavi" },
  { nom: "Amphi Amousouga 3", requete: "Amphi Amoussouga Abomey-Calavi" },
  { nom: "Amphi Ampère", requete: "Amphi Ampère Abomey-Calavi Université" },
  { nom: "Amphi Apartement", requete: "Amphi Appartement Abomey-Calavi Université" },
  { nom: "Amphi Avicenne", requete: "Amphi Avicenne Abomey-Calavi Université" },
  { nom: "Amphibi", requete: "Amphibi Abomey-Calavi Université" },
  { nom: "Amphi B2", requete: "Amphi B2 Abomey-Calavi" },
  { nom: "Amphi B200", requete: "Amphi B200 Abomey-Calavi" },
  { nom: "Amphi B3", requete: "Amphi B3 Abomey-Calavi" },
  { nom: "Petit Portail", requete: "Petit Portail Abomey-Calavi Université" },
  { nom: "Petit Portail Zogbadjè", requete: "Petit Portail Zogbadjè Abomey-Calavi" },
  { nom: "Grand Portail", requete: "Grand Portail Abomey-Calavi Université" },
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
  let sql = "-- Résultats du géocodage (lot 2) — à relire avant d'exécuter\n\n";
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

  fs.writeFileSync("geocodage-lot2.sql", sql, "utf8");
  console.log(`\nTerminé : ${trouves} trouvé(s), ${nonTrouves.length} non trouvé(s).`);
  console.log("Résultats écrits dans geocodage-lot2.sql");
}

main();
