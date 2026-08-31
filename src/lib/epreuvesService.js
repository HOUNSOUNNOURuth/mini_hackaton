import { supabase } from './supabaseClient'

export async function verifierMatricule(matricule) {
  const { data, error } = await supabase.rpc('verifier_matricule', {
    matricule_saisi: matricule,
  })
  if (error) throw error
  return data // true ou false
}

export async function enregistrerMatricule(userId, matricule) {
  const { error } = await supabase
    .from('profiles')
    .update({ matricule })
    .eq('id', userId)
  if (error) throw error
}

export async function getEpreuves(filtres = {}) {
  let query = supabase.from('epreuves').select('*').order('annee', { ascending: false })

  if (filtres.ecole) query = query.eq('ecole', filtres.ecole)
  if (filtres.filiere) query = query.eq('filiere', filtres.filiere)
  if (filtres.annee) query = query.eq('annee', filtres.annee)
  if (filtres.session) query = query.eq('session', filtres.session)
  if (filtres.matiere) query = query.ilike('matiere', `%${filtres.matiere}%`)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getLienTelechargement(cheminFichier) {
  const { data, error } = await supabase.storage
    .from('epreuves')
    .createSignedUrl(cheminFichier, 60) // lien valable 60 secondes

  if (error) throw error
  return data.signedUrl
}