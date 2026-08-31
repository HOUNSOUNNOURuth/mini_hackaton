import { supabase } from './supabaseClient'

export async function laisserAvis(tacheId, cibleId, auteurId, note, commentaire) {
  const { error } = await supabase.from('avis').insert({
    tache_id: tacheId,
    cible_id: cibleId,
    auteur_id: auteurId,
    note,
    commentaire: commentaire || null,
  })
  if (error) throw error
}

export async function getMonAvisPourTache(tacheId, auteurId) {
  const { data, error } = await supabase
    .from('avis')
    .select('*')
    .eq('tache_id', tacheId)
    .eq('auteur_id', auteurId)
    .maybeSingle()

  if (error) throw error
  return data
}