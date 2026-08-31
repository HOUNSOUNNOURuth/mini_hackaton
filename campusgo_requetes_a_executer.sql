-- ============================================================================
-- CAMPUSGO — REQUÊTES SQL COMPLÉMENTAIRES À EXÉCUTER
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- (en plus du schema.sql déjà en place)
-- Ordre d'exécution : de haut en bas, ce fichier respecte les dépendances.
-- ============================================================================


-- ============================================================================
-- MODULE 1 — RENDEZ-VOUS (modèle revu : quota par jour, pas de créneaux horaires)
-- ============================================================================
-- Remplace l'ancien modèle par créneaux : un étudiant choisit une date (pas une
-- heure précise) pour un bureau, la disponibilité dépend du quota_par_jour du
-- bureau. Les horaires d'ouverture sont identiques pour tous les bureaux
-- (lundi-vendredi), donc pas besoin de les stocker en base.

drop table if exists creneaux cascade;
drop table if exists rendezvous cascade;

create table rendezvous (
  id uuid primary key default gen_random_uuid(),
  etudiant_id uuid not null references profiles (id) on delete cascade,
  bureau_id uuid not null references bureaux (id) on delete cascade,
  date_rdv date not null,
  motif text not null,
  statut text not null default 'confirme' check (statut in ('confirme', 'honore', 'annule', 'non_honore')),
  created_at timestamptz not null default now()
);

alter table rendezvous enable row level security;

create policy "Un étudiant voit ses propres rendez-vous"
  on rendezvous for select
  using (auth.uid() = etudiant_id);

-- Pas de policy insert directe : la création passe uniquement par la fonction RPC ci-dessous.

create or replace function prendre_rendezvous(p_bureau_id uuid, p_date date, p_motif text)
returns rendezvous
language plpgsql
security definer
as $$
declare
  v_quota int;
  v_nb_rdv int;
  v_deja_actif int;
  v_rdv rendezvous;
begin
  -- 1. La date doit être un jour ouvré (lundi à vendredi)
  if extract(isodow from p_date) > 5 then
    raise exception 'Le bureau est fermé ce jour (week-end)';
  end if;

  -- 2. La date ne peut pas être dans le passé
  if p_date < current_date then
    raise exception 'Impossible de prendre un rendez-vous à une date passée';
  end if;

  -- 3. Verrouille la ligne du bureau le temps de la vérification (évite la
  --    sur-réservation en cas de requêtes simultanées)
  select quota_par_jour into v_quota
  from bureaux
  where id = p_bureau_id
  for update;

  if v_quota is null then
    raise exception 'Bureau introuvable';
  end if;

  -- 4. Compte les rendez-vous déjà pris ce jour-là pour ce bureau
  select count(*) into v_nb_rdv
  from rendezvous
  where bureau_id = p_bureau_id
    and date_rdv = p_date
    and statut = 'confirme';

  if v_nb_rdv >= v_quota then
    raise exception 'Quota atteint pour cette date, choisis un autre jour';
  end if;

  -- 5. Un étudiant ne peut avoir qu'un seul rendez-vous actif à la fois pour un même bureau
  select count(*) into v_deja_actif
  from rendezvous
  where bureau_id = p_bureau_id
    and etudiant_id = auth.uid()
    and statut = 'confirme';

  if v_deja_actif > 0 then
    raise exception 'Tu as déjà un rendez-vous actif pour ce bureau';
  end if;

  insert into rendezvous (etudiant_id, bureau_id, date_rdv, motif)
  values (auth.uid(), p_bureau_id, p_date, p_motif)
  returning * into v_rdv;

  return v_rdv;
end;
$$;

grant execute on function prendre_rendezvous(uuid, date, text) to authenticated;

create or replace function annuler_rendezvous(p_rendezvous_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update rendezvous
  set statut = 'annule'
  where id = p_rendezvous_id and etudiant_id = auth.uid();

  if not found then
    raise exception 'Rendez-vous introuvable ou non autorisé';
  end if;
end;
$$;

grant execute on function annuler_rendezvous(uuid) to authenticated;


-- ============================================================================
-- MODULE 4 — MARKETPLACE DE TÂCHES
-- ============================================================================

-- La policy select actuelle sur "candidatures" ne permet qu'à l'étudiant
-- candidat de voir sa propre candidature. On ajoute une policy pour que le
-- demandeur puisse aussi voir les candidatures reçues sur ses propres tâches
-- (nécessaire pour l'écran "Mes tâches publiées" côté frontend).
create policy "Le demandeur voit les candidatures de ses tâches"
  on candidatures for select
  using (
    exists (
      select 1 from taches
      where taches.id = candidatures.tache_id
        and taches.demandeur_id = auth.uid()
    )
  );

-- Accepte une candidature de façon atomique : confirme la tâche, assigne
-- l'étudiant, et refuse automatiquement toutes les autres candidatures.
create or replace function accepter_candidature(p_candidature_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_tache_id uuid;
  v_etudiant_id uuid;
  v_demandeur_id uuid;
begin
  select c.tache_id, c.etudiant_id, t.demandeur_id
  into v_tache_id, v_etudiant_id, v_demandeur_id
  from candidatures c
  join taches t on t.id = c.tache_id
  where c.id = p_candidature_id;

  if v_tache_id is null then
    raise exception 'Candidature introuvable';
  end if;

  if v_demandeur_id != auth.uid() then
    raise exception 'Seul le demandeur de cette tâche peut accepter une candidature';
  end if;

  update taches
  set statut = 'confirmee', etudiant_assigne_id = v_etudiant_id
  where id = v_tache_id;

  update candidatures
  set statut = 'acceptee'
  where id = p_candidature_id;

  update candidatures
  set statut = 'refusee'
  where tache_id = v_tache_id and id != p_candidature_id;
end;
$$;

grant execute on function accepter_candidature(uuid) to authenticated;


-- ============================================================================
-- SECRETS À CONFIGURER (hors SQL Editor — via le CLI Supabase)
-- ============================================================================
-- Ces valeurs ne se définissent pas ici, mais en ligne de commande :
--
--   npx supabase secrets set MONEY_FUSION_API_KEY=ta_cle_secrete
--   npx supabase secrets set MONEY_FUSION_WEBHOOK_SECRET=ton_secret_webhook
--
-- Nécessaires pour que les Edge Functions payer-tache et webhook-money-fusion
-- fonctionnent (voir supabase/functions/). Valeurs à obtenir auprès de
-- l'équipe une fois l'accès Money Fusion confirmé.


-- ============================================================================
-- DONNÉES DE TEST UTILES POUR VALIDER LE FRONTEND
-- ============================================================================
-- À adapter avec de vraies infos, décommenter et exécuter si besoin de tester
-- rapidement sans attendre les vraies données du campus.

-- insert into bureaux (nom, categorie, localisation, quota_par_jour) values
--   ('Bureau de la scolarité', 'Scolarité', 'Bâtiment A, RDC', 25),
--   ('Service financier', 'Finance', 'Bâtiment A, 1er étage', 15);

-- insert into etudiants_officiels (matricule, nom, ecole, filiere, annee_inscription) values
--   ('21B01234', 'Awa Kouassi', 'FAST', 'Informatique', 2024);

-- insert into lieux (nom, type, batiment, latitude, longitude) values
--   ('Bibliothèque centrale', 'service', 'Bâtiment B', 6.3703, 2.3912),
--   ('Amphi 1', 'amphi', 'Bâtiment A', 6.3710, 2.3920),
--   ('Bureau scolarité', 'bureau', 'Bâtiment A', 6.3705, 2.3915);
