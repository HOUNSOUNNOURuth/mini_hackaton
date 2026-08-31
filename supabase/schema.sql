-- ============================================================================
-- CAMPUSGO — SCHÉMA SUPABASE (PostgreSQL)
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. PROFILS UTILISATEURS
-- Chaque compte Supabase Auth (auth.users) a une ligne miroir ici, créée
-- automatiquement à l'inscription (trigger plus bas). C'est cette table qui
-- porte le matricule, le nom affiché et le rôle de l'utilisateur.
-- ----------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nom text not null,
  matricule text unique,               -- null pour les comptes "particulier"
  telephone text,                      -- nécessaire pour initier un paiement Money Fusion (numeroSend)
  role text not null default 'etudiant' check (role in ('etudiant', 'particulier', 'personnel', 'admin')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Un utilisateur peut lire son propre profil"
  on profiles for select
  using (auth.uid() = id);

create policy "Un utilisateur peut modifier son propre profil"
  on profiles for update
  using (auth.uid() = id);

-- Création automatique du profil dès qu'un compte s'inscrit (voir AuthContext.jsx
-- qui envoie nom / matricule / role dans les métadonnées lors de auth.signUp()).
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nom, matricule, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nom', new.email),
    new.raw_user_meta_data ->> 'matricule',
    coalesce(new.raw_user_meta_data ->> 'role', 'etudiant')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ============================================================================
-- MODULE 2 — GUIDAGE & LOCALISATION (points d'intérêt du campus)
-- Placé AVANT le Module 1 car les bureaux (Module 1) pointent vers un lieu
-- ici défini : une seule source de vérité pour la position d'un bureau,
-- partagée entre la prise de rendez-vous et le guidage.
-- ============================================================================

create table if not exists lieux (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  type text,                 -- "bureau", "ecole", "amphi", "service", ...
  batiment text,
  description text,
  repere text,                -- description relative si pas de coordonnées GPS précises, ex: "juste derrière l'EPAC, face au terrain de foot"
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

alter table lieux enable row level security;
create policy "Tout utilisateur connecté peut chercher un lieu" on lieux for select using (auth.uid() is not null);


-- ----------------------------------------------------------------------------
-- Dictionnaire fon (le fon n'est pas couvert par les services de traduction
-- automatique gratuits comme MyMemory ou même Google Translate — il faut donc
-- un petit lexique maison, à remplir par une personne qui parle fon).
-- La fonction "traduire" (Edge Function) cherche ici en priorité quand la
-- langue cible ou source est "fon", au lieu d'appeler un service externe.
-- ----------------------------------------------------------------------------
create table if not exists dictionnaire_fon (
  id uuid primary key default gen_random_uuid(),
  terme_fr text not null,     -- ex: "bibliothèque", "où est"
  terme_fon text not null,    -- la traduction en fon, à faire vérifier par un locuteur natif
  categorie text,             -- ex: "lieu", "expression", "mot courant"
  created_at timestamptz not null default now()
);

alter table dictionnaire_fon enable row level security;
create policy "Tout utilisateur connecté peut consulter le dictionnaire fon" on dictionnaire_fon for select using (auth.uid() is not null);
create policy "Seul un admin peut modifier le dictionnaire fon" on dictionnaire_fon for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- Quelques lignes de départ à COMPLÉTER ET VÉRIFIER avec un locuteur fon
-- (les traductions ci-dessous sont indicatives, à confirmer avant usage réel) :
-- insert into dictionnaire_fon (terme_fr, terme_fon, categorie) values
--   ('bibliothèque', 'à compléter', 'lieu'),
--   ('bureau de la scolarité', 'à compléter', 'lieu'),
--   ('amphithéâtre', 'à compléter', 'lieu'),
--   ('où est', 'à compléter', 'expression');


-- ============================================================================
-- MODULE 1 — RENDEZ-VOUS & FILES D'ATTENTE
-- ============================================================================

create table if not exists bureaux (
  id uuid primary key default gen_random_uuid(),
  nom text not null,              -- ex: "Secrétariat - EPAC", "Bureau du Directeur - EPAC"
  categorie text,                 -- ex: "Secrétariat", "Direction", "Bourses", "Finance"
  ecole text,                     -- ex: "EPAC", "FLLAC", "Rectorat" — pour regrouper/filtrer facilement
  lieu_id uuid references lieux (id), -- position réelle du bureau, PARTAGÉE avec le Module 2 (guidage)
  quota_par_jour int not null default 20,
  created_at timestamptz not null default now()
);

create table if not exists creneaux (
  id uuid primary key default gen_random_uuid(),
  bureau_id uuid not null references bureaux (id) on delete cascade,
  date_heure timestamptz not null,
  capacite int not null default 1 check (capacite > 0)   -- nombre de personnes pouvant être reçues sur CE créneau
);

create table if not exists rendezvous (
  id uuid primary key default gen_random_uuid(),
  etudiant_id uuid not null references profiles (id) on delete cascade,
  creneau_id uuid not null references creneaux (id) on delete cascade,
  statut text not null default 'confirme' check (statut in ('confirme', 'honore', 'annule', 'non_honore')),
  rappel_envoye boolean not null default false,  -- évite d'envoyer le rappel plusieurs fois
  created_at timestamptz not null default now(),
  unique (etudiant_id, creneau_id)  -- un étudiant ne peut pas réserver deux fois le même créneau
);

-- Empêche de dépasser la capacité d'un créneau, même en cas de double-clic
-- ou de deux personnes qui réservent au même moment (protégé au niveau base
-- de données, pas seulement côté écran).
create or replace function verifier_capacite_creneau()
returns trigger as $$
declare
  places_prises int;
  places_max int;
begin
  select count(*) into places_prises
    from rendezvous
    where creneau_id = new.creneau_id and statut in ('confirme', 'honore');

  select capacite into places_max from creneaux where id = new.creneau_id;

  if places_prises >= places_max then
    raise exception 'Ce créneau est complet.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists avant_insertion_rendezvous on rendezvous;
create trigger avant_insertion_rendezvous
  before insert on rendezvous
  for each row execute procedure verifier_capacite_creneau();

-- Empêche de dépasser le quota total de rendez-vous par jour d'un bureau
-- (toutes plages horaires confondues), en plus de la capacité par créneau.
create or replace function verifier_quota_journalier()
returns trigger as $$
declare
  rdv_du_jour int;
  quota_max int;
  v_bureau_id uuid;
  v_date date;
begin
  select bureau_id, date_heure::date into v_bureau_id, v_date
    from creneaux where id = new.creneau_id;

  select quota_par_jour into quota_max from bureaux where id = v_bureau_id;

  select count(*) into rdv_du_jour
    from rendezvous r
    join creneaux c on c.id = r.creneau_id
    where c.bureau_id = v_bureau_id
      and c.date_heure::date = v_date
      and r.statut in ('confirme', 'honore');

  if rdv_du_jour >= quota_max then
    raise exception 'Ce bureau a atteint son quota de rendez-vous pour cette journée.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists avant_insertion_quota_journalier on rendezvous;
create trigger avant_insertion_quota_journalier
  before insert on rendezvous
  for each row execute procedure verifier_quota_journalier();

-- Fonction utilisée par le frontend pour afficher, pour chaque créneau d'un
-- bureau, le nombre de places encore libres (capacite - places déjà prises).
-- Passe par une fonction "security definer" plutôt qu'une simple requête,
-- car la sécurité (RLS) sur "rendezvous" limite normalement un étudiant à
-- ne voir que SES PROPRES rendez-vous — hors ici on a besoin d'un compte
-- total tous étudiants confondus, sans exposer qui a réservé quoi.
create or replace function creneaux_disponibles(p_bureau_id uuid)
returns table (id uuid, date_heure timestamptz, capacite int, places_restantes int)
language plpgsql
security definer
as $$
begin
  return query
    select
      c.id,
      c.date_heure,
      c.capacite,
      c.capacite - coalesce((
        select count(*)::int from rendezvous r
        where r.creneau_id = c.id and r.statut in ('confirme', 'honore')
      ), 0) as places_restantes
    from creneaux c
    where c.bureau_id = p_bureau_id
    order by c.date_heure;
end;
$$;

grant execute on function creneaux_disponibles(uuid) to authenticated;

alter table bureaux enable row level security;
alter table creneaux enable row level security;
alter table rendezvous enable row level security;

create policy "Tout utilisateur connecté peut voir les bureaux" on bureaux for select using (auth.uid() is not null);
create policy "Tout utilisateur connecté peut voir les créneaux" on creneaux for select using (auth.uid() is not null);

create policy "Un étudiant voit ses propres rendez-vous" on rendezvous for select using (auth.uid() = etudiant_id);
create policy "Un étudiant peut créer son propre rendez-vous" on rendezvous for insert with check (auth.uid() = etudiant_id);


-- ============================================================================
-- MODULE 3 — BANQUE D'ÉPREUVES (accès réservé aux matricules valides)
-- ============================================================================

-- Registre officiel des étudiants inscrits, tenu par le backend/admin
-- (import depuis le fichier de la scolarité, mise à jour manuelle ou script).
-- C'est CETTE table qui fait foi pour valider un matricule — profiles.matricule
-- n'est qu'une copie posée sur le profil une fois la vérification réussie.
create table if not exists etudiants_officiels (
  matricule text primary key,
  nom text,
  ecole text,
  filiere text,
  annee_inscription int,
  created_at timestamptz not null default now()
);

alter table etudiants_officiels enable row level security;
-- Aucune policy select pour les utilisateurs normaux : cette table n'est
-- jamais lue directement par le frontend, uniquement via la fonction RPC
-- ci-dessous (security definer) pour ne jamais exposer tout le registre.

-- Fonction appelée par le frontend (supabase.rpc('verifier_matricule', ...))
-- au moment où l'étudiant ouvre la Banque d'épreuves. Renvoie seulement
-- true/false, jamais les données du registre.
create or replace function verifier_matricule(matricule_saisi text)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from etudiants_officiels
    where matricule = matricule_saisi
  );
end;
$$;

-- Autorise tout utilisateur connecté à appeler cette fonction de vérification.
grant execute on function verifier_matricule(text) to authenticated;

create table if not exists epreuves (
  id uuid primary key default gen_random_uuid(),
  ecole text not null,
  filiere text not null,
  matiere text not null,
  annee int not null,
  session text not null check (session in ('normale', 'rattrapage')),
  fichier_url text not null,     -- lien vers Supabase Storage (bucket privé "epreuves")
  ajoute_par uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table epreuves enable row level security;

-- Seuls les comptes avec un matricule renseigné peuvent consulter les épreuves.
create policy "Accès épreuves réservé aux matricules valides"
  on epreuves for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.matricule is not null
    )
  );

create policy "Seul un admin ou le personnel peut ajouter une épreuve"
  on epreuves for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'personnel')
    )
  );


-- ============================================================================
-- MODULE 4 — MARKETPLACE DE PETITES TÂCHES
-- ============================================================================

create table if not exists taches (
  id uuid primary key default gen_random_uuid(),
  demandeur_id uuid not null references profiles (id) on delete cascade,
  titre text not null,
  categorie text not null,
  description text,
  prix_propose numeric,
  statut text not null default 'ouverte' check (statut in ('ouverte', 'en_negociation', 'confirmee', 'terminee', 'litige', 'annulee')),
  etudiant_assigne_id uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists candidatures (
  id uuid primary key default gen_random_uuid(),
  tache_id uuid not null references taches (id) on delete cascade,
  etudiant_id uuid not null references profiles (id) on delete cascade,
  statut text not null default 'en_discussion' check (statut in ('en_discussion', 'acceptee', 'refusee')),
  created_at timestamptz not null default now(),
  unique (tache_id, etudiant_id)
);

-- Une transaction par tâche payée. Le calcul (montant, commission 10%) est
-- fait côté serveur par l'Edge Function "payer-tache", jamais côté client.
-- tokenpay / numero_transaction sont renvoyés par Money Fusion et servent à
-- suivre le paiement (webhook "webhook-moneyfusion" les met à jour).
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  tache_id uuid not null references taches (id) on delete cascade,
  montant_total numeric not null,
  commission numeric not null,          -- 10 % de montant_total
  montant_etudiant numeric not null,    -- montant_total - commission
  tokenpay text unique,                 -- identifiant renvoyé par Money Fusion à l'initiation
  numero_transaction text,              -- rempli après confirmation du paiement (webhook)
  statut text not null default 'en_attente' check (statut in ('en_attente', 'sequestre', 'liberee', 'echoue', 'remboursee')),
  created_at timestamptz not null default now()
);

create table if not exists avis (
  id uuid primary key default gen_random_uuid(),
  tache_id uuid not null references taches (id) on delete cascade,
  auteur_id uuid not null references profiles (id),
  cible_id uuid not null references profiles (id),
  note int not null check (note between 1 and 5),
  commentaire text,
  created_at timestamptz not null default now()
);

alter table taches enable row level security;
alter table candidatures enable row level security;
alter table transactions enable row level security;
alter table avis enable row level security;

create policy "Tout utilisateur connecté voit les tâches ouvertes" on taches for select using (auth.uid() is not null);
create policy "Un utilisateur peut publier une tâche" on taches for insert with check (auth.uid() = demandeur_id);
create policy "Le demandeur peut modifier sa propre tâche" on taches for update using (auth.uid() = demandeur_id);

create policy "Un étudiant voit ses candidatures" on candidatures for select using (auth.uid() = etudiant_id);
create policy "Un étudiant peut postuler" on candidatures for insert with check (auth.uid() = etudiant_id);

-- Le demandeur d'une tâche doit aussi pouvoir voir les candidatures reçues
-- (pas seulement l'étudiant qui postule), sinon il ne peut pas ouvrir la
-- messagerie de négociation avec les candidats.
create policy "Le demandeur voit les candidatures de ses tâches"
  on candidatures for select
  using (
    exists (
      select 1 from taches
      where taches.id = candidatures.tache_id
        and taches.demandeur_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- Messagerie de négociation de prix
-- Chaque candidature (un étudiant sur une tâche donnée) a son propre fil de
-- discussion privé entre cet étudiant et le demandeur de la tâche, pour ne
-- pas mélanger les négociations si plusieurs étudiants postulent à la fois.
-- ----------------------------------------------------------------------------
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  candidature_id uuid not null references candidatures (id) on delete cascade,
  auteur_id uuid not null references profiles (id),
  contenu text not null,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

-- Seules les deux personnes concernées (l'étudiant candidat et le demandeur
-- de la tâche correspondante) peuvent lire ou écrire dans ce fil.
create policy "Les deux parties d'une candidature voient les messages"
  on messages for select
  using (
    exists (
      select 1 from candidatures
      join taches on taches.id = candidatures.tache_id
      where candidatures.id = messages.candidature_id
        and (candidatures.etudiant_id = auth.uid() or taches.demandeur_id = auth.uid())
    )
  );

create policy "Les deux parties peuvent écrire dans le fil"
  on messages for insert
  with check (
    auth.uid() = auteur_id
    and exists (
      select 1 from candidatures
      join taches on taches.id = candidatures.tache_id
      where candidatures.id = messages.candidature_id
        and (candidatures.etudiant_id = auth.uid() or taches.demandeur_id = auth.uid())
    )
  );

-- Active le temps réel sur cette table pour que les deux personnes voient les
-- nouveaux messages s'afficher instantanément sans recharger la page.
-- (Si la commande ci-dessous renvoie une erreur "already member of publication",
-- c'est déjà activé par défaut sur votre projet, vous pouvez l'ignorer.)
alter publication supabase_realtime add table messages;

create policy "Les parties concernées voient la transaction"
  on transactions for select
  using (
    exists (
      select 1 from taches
      where taches.id = transactions.tache_id
        and (taches.demandeur_id = auth.uid() or taches.etudiant_assigne_id = auth.uid())
    )
  );
-- Les insertions/mises à jour de transactions se font uniquement via l'Edge
-- Function "payer-tache" (clé de service), pas de policy insert/update côté client.

create policy "Tout utilisateur connecté peut lire les avis" on avis for select using (auth.uid() is not null);
create policy "Un utilisateur peut laisser un avis" on avis for insert with check (auth.uid() = auteur_id);


-- ============================================================================
-- DONNÉES DE DÉMONSTRATION (optionnel, à retirer en production)
-- ============================================================================
-- insert into bureaux (nom, categorie, localisation, quota_par_jour) values
--   ('Bureau de la scolarité', 'Scolarité', 'Bâtiment A, RDC', 25),
--   ('Service financier', 'Finance', 'Bâtiment A, 1er étage', 15);

-- insert into etudiants_officiels (matricule, nom, ecole, filiere, annee_inscription) values
--   ('21B01234', 'Awa Kouassi', 'FAST', 'Informatique', 2024);