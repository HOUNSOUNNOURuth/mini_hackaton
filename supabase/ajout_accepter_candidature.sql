-- ============================================================================
-- AJOUT VALIDÉ — proposé par le collègue frontend, sans conflit avec l'existant
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================================

-- Accepte une candidature de façon atomique : confirme la tâche, assigne
-- l'étudiant, et refuse automatiquement toutes les autres candidatures
-- reçues sur cette même tâche.
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
