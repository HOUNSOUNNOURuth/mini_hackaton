# Structure du projet CampusGo — répartition Backend / Frontend

Ce document explique comment le projet est organisé, pour que le travail entre
la personne backend (base de données Supabase) et la personne frontend (React)
puisse avancer en parallèle sans se marcher dessus.

## Règle d'accès mise à jour

- **Créer un compte est obligatoire pour utiliser le site**, mais **aucun
  matricule n'est demandé à l'inscription**. Nom, e-mail, mot de passe suffisent.
- Le **matricule n'est demandé qu'au moment d'ouvrir la Banque d'épreuves**
  (Module 3). Il est vérifié contre le registre officiel des étudiants
  (table `etudiants_officiels`, gérée par le backend), puis mémorisé sur le
  profil pour les prochaines visites.
- Les 3 autres modules (rendez-vous, guidage, tâches) sont accessibles à tout
  compte connecté, sans matricule.

## Arborescence complète

```
campusgo/
├── README.md                     → instructions d'installation
├── STRUCTURE.md                  → ce document
├── package.json
├── vite.config.js
├── index.html
├── .env.example                  → variables Supabase à copier en .env
│
├── supabase/                     ███ CÔTÉ BACKEND ███
│   ├── schema.sql                → toutes les tables, RLS, triggers, fonctions RPC
│   └── functions/
│       └── payer-tache/
│           └── index.ts          → Edge Function : paiement Money Fusion + commission 10%
│
└── src/                          ███ CÔTÉ FRONTEND ███
    ├── main.jsx
    ├── App.jsx                   → déclaration de toutes les routes
    ├── index.css                 → design system (couleurs, typo, composants .btn/.card/.field)
    │
    ├── lib/
    │   └── supabaseClient.js     → connexion à Supabase (ne pas modifier la logique, juste les clés .env)
    │
    ├── context/
    │   └── AuthContext.jsx       → signUp / signIn / signOut / verifierMatricule
    │
    ├── components/
    │   ├── ProtectedRoute.jsx    → bloque l'accès si pas connecté
    │   ├── PublicOnlyRoute.jsx   → cache connexion/inscription si déjà connecté
    │   ├── AppLayout.jsx         → structure sidebar + topbar + contenu
    │   ├── Sidebar.jsx
    │   ├── TopBar.jsx
    │   └── Loader.jsx
    │
    └── pages/
        ├── auth/
        │   ├── SignUp.jsx        → inscription (nom, email, mot de passe)
        │   ├── SignIn.jsx        → connexion
        │   └── AuthVisualPanel.jsx
        ├── Dashboard.jsx         → accueil après connexion, liens vers les 4 modules
        ├── rendezvous/
        │   └── RendezVousPage.jsx    → Module 1
        ├── guidage/
        │   └── GuidagePage.jsx       → Module 2
        ├── epreuves/
        │   └── EpreuvesPage.jsx      → Module 3 (demande le matricule ici)
        └── taches/
            └── TachesPage.jsx        → Module 4
```

## Qui fait quoi

### Backend / base de données (toi)
Tout se passe dans `supabase/`.

1. Créer le projet sur supabase.com.
2. Exécuter `supabase/schema.sql` dans le SQL Editor — il crée :
   - `profiles` (+ trigger de création automatique à l'inscription)
   - `bureaux`, `creneaux`, `rendezvous` (Module 1)
   - `lieux` (Module 2)
   - `etudiants_officiels` + fonction `verifier_matricule()` + `epreuves` (Module 3)
   - `taches`, `candidatures`, `transactions`, `avis` (Module 4)
   - toutes les policies RLS (sécurité ligne par ligne)
3. Remplir `etudiants_officiels` avec le vrai registre des étudiants (import CSV ou insertions manuelles) — c'est ce qui permet à `verifier_matricule()` de fonctionner.
4. Déployer et maintenir l'Edge Function `payer-tache` (clé Money Fusion, calcul de la commission de 10 %).
5. Communiquer au frontend : l'URL Supabase + la clé anon publique (jamais la clé `service_role`, qui reste secrète côté toi uniquement).

### Frontend (ton collègue)
Tout se passe dans `src/`, essentiellement dans `pages/` et `components/`.

- Le squelette fonctionnel existe déjà (inscription, connexion, navigation entre modules, appels Supabase de base) : il peut partir de là pour la mise en forme visuelle, l'ergonomie mobile, les animations, etc.
- Il n'a pas besoin de toucher à `supabase/` ni à `AuthContext.jsx` (la logique d'authentification est déjà branchée) — seulement à `index.css` et au contenu des `pages/*` et `components/*` pour l'aspect visuel.
- Il doit juste copier `.env.example` en `.env` avec les clés que tu lui donnes pour pouvoir développer contre ta vraie base Supabase.

## Contrat de données (ce que le frontend peut attendre de chaque table)

| Table | Champs clés | Utilisée par |
|---|---|---|
| `profiles` | `id`, `nom`, `matricule` (nullable), `role` | Partout (contexte utilisateur) |
| `bureaux` | `id`, `nom`, `categorie`, `localisation`, `quota_par_jour` | Module 1 |
| `creneaux` | `id`, `bureau_id`, `date_heure`, `disponible` | Module 1 |
| `rendezvous` | `id`, `etudiant_id`, `creneau_id`, `statut` | Module 1 |
| `lieux` | `id`, `nom`, `type`, `batiment`, `description`, `latitude`, `longitude` | Module 2 |
| `etudiants_officiels` | `matricule`, `nom`, `ecole`, `filiere` | Backend uniquement (jamais lue par le frontend) |
| `epreuves` | `id`, `ecole`, `filiere`, `matiere`, `annee`, `session`, `fichier_url` | Module 3 |
| `taches` | `id`, `demandeur_id`, `titre`, `categorie`, `description`, `prix_propose`, `statut` | Module 4 |
| `candidatures` | `id`, `tache_id`, `etudiant_id`, `statut` | Module 4 |
| `transactions` | `id`, `tache_id`, `montant_total`, `commission`, `montant_etudiant`, `statut` | Module 4 (lecture seule côté client) |
| `avis` | `id`, `tache_id`, `auteur_id`, `cible_id`, `note`, `commentaire` | Module 4 |

Toute évolution de ces colonnes (ajout/renommage) doit être communiquée à l'autre personne, puisque le frontend construit ses formulaires et affichages directement sur ces noms de champs.

## Prochaine étape technique à se répartir

- Backend : remplir `etudiants_officiels` avec de vraies données de test, ajouter la table `messages` pour la négociation de prix du Module 4.
- Frontend : habiller visuellement les pages existantes, ajouter la messagerie de négociation une fois la table `messages` prête côté backend.
