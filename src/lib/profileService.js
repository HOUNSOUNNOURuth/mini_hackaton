import { supabase } from './supabaseClient'

export async function mettreAJourNom(userId, nom) {
  const { error } = await supabase
    .from('profiles')
    .update({ nom })
    .eq('id', userId)

  if (error) throw error
}

export async function mettreAJourMotDePasse(nouveauMotDePasse) {
  const { error } = await supabase.auth.updateUser({ password: nouveauMotDePasse })
  if (error) throw error
}