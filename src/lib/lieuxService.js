import { supabase } from './supabaseClient'

export async function getLieux() {
  const { data, error } = await supabase
    .from('lieux')
    .select('*')
    .order('nom')

  if (error) throw error
  return data
}