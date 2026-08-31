import { supabase } from './supabaseClient'

export async function getTachesOuvertes(categorie = null) {
  let query = supabase
    .from('taches')
    .select('*')
    .eq('statut', 'ouverte')
    .order('created_at', { ascending: false })

  if (categorie) query = query.eq('categorie', categorie)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function postulerTache(tacheId, etudiantId) {
  const { error } = await supabase
    .from('candidatures')
    .insert({ tache_id: tacheId, etudiant_id: etudiantId })

  if (error) {
    // La contrainte "unique (tache_id, etudiant_id)" du schéma renvoie ce code
    // si l'étudiant a déjà postulé à cette tâche.
    if (error.code === '23505') {
      throw new Error('Tu as déjà postulé à cette tâche.')
    }
    throw error
  }
}

export async function getMesCandidatures(etudiantId) {
  const { data, error } = await supabase
    .from('candidatures')
    .select('*, taches(id, titre, categorie, prix_propose, statut, demandeur_id)')
    .eq('etudiant_id', etudiantId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function publierTache(demandeurId, { titre, categorie, description, prixPropose }) {
  const { data, error } = await supabase
    .from('taches')
    .insert({
      demandeur_id: demandeurId,
      titre,
      categorie,
      description,
      prix_propose: prixPropose || null,
      statut: 'ouverte',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getMesTachesPubliees(demandeurId) {
  const { data, error } = await supabase
    .from('taches')
    .select('*, candidatures(count)')
    .eq('demandeur_id', demandeurId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getCandidaturesPourTache(tacheId) {
  const { data, error } = await supabase
    .from('candidatures')
    .select('*, profiles(nom)')
    .eq('tache_id', tacheId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function accepterCandidature(candidatureId) {
  const { error } = await supabase.rpc('accepter_candidature', {
    p_candidature_id: candidatureId,
  })
  if (error) throw error
}

export async function initierPaiement(tacheId) {
  const { data, error } = await supabase.functions.invoke('payer-tache', {
    body: { tache_id: tacheId },
  })
  if (error) throw error
  return data.lien_paiement
}

export async function confirmerExecution(tacheId) {
  const { data, error } = await supabase.functions.invoke('liberer-paiement', {
    body: { tache_id: tacheId },
  })
  if (error) throw error
  return data
}

export async function getTransactionPourTache(tacheId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('tache_id', tacheId)
    .maybeSingle() // pas d'erreur si aucune transaction n'existe encore

  if (error) throw error
  return data
}