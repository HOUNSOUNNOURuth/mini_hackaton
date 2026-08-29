import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Aide au diagnostic si le fichier .env n'a pas été configuré.
  console.warn(
    "[CampusGo] Variables Supabase manquantes. Copiez .env.example vers .env et renseignez vos clés."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
