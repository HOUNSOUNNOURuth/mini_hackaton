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
-- MODULE 1 — RENDEZ-VOUS & FILES D'ATTENTE
-- ============================================================================

create table if not exists bureaux (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  categorie text,                 -- ex: "Scolarité", "Finance", "Bibliothèque"
  localisation text,
  quota_par_jour int not null default 20,
  created_at timestamptz not null default now()
);

create table if not exists creneaux (
  id uuid primary key default gen_random_uuid(),
  bureau_id uuid not null references bureaux (id) on delete cascade,
  date_heure timestamptz not null,
  disponible boolean not null default true
);

create table if not exists rendezvous (
  id uuid primary key default gen_random_uuid(),
  etudiant_id uuid not null references profiles (id) on delete cascade,
  creneau_id uuid not null references creneaux (id) on delete cascade,
  statut text not null default 'confirme' check (statut in ('confirme', 'honore', 'annule', 'non_honore')),
  created_at timestamptz not null default now(),
  unique (creneau_id)  -- un seul étudiant par créneau
);

alter table bureaux enable row level security;
alter table creneaux enable row level security;
alter table rendezvous enable row level security;

create policy "Tout utilisateur connecté peut voir les bureaux" on bureaux for select using (auth.uid() is not null);
create policy "Tout utilisateur connecté peut voir les créneaux" on creneaux for select using (auth.uid() is not null);

create policy "Un étudiant voit ses propres rendez-vous" on rendezvous for select using (auth.uid() = etudiant_id);
create policy "Un étudiant peut créer son propre rendez-vous" on rendezvous for insert with check (auth.uid() = etudiant_id);


-- ============================================================================
-- MODULE 2 — GUIDAGE & LOCALISATION (points d'intérêt du campus)
-- ============================================================================

create table if not exists lieux (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  type text,                 -- "bureau", "ecole", "amphi", "service", ...
  batiment text,
  description text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

alter table lieux enable row level security;
create policy "Tout utilisateur connecté peut chercher un lieu" on lieux for select using (auth.uid() is not null);


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
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  tache_id uuid not null references taches (id) on delete cascade,
  montant_total numeric not null,
  commission numeric not null,          -- 10 % de montant_total
  montant_etudiant numeric not null,    -- montant_total - commission
  reference_moneyfusion text,           -- identifiant de transaction Money Fusion
  statut text not null default 'en_attente' check (statut in ('en_attente', 'sequestre', 'liberee', 'remboursee')),
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
