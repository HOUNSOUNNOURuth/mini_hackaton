import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ⚠️ À adapter précisément selon la doc Money Fusion : la plupart des agrégateurs
// signent leurs webhooks avec un secret partagé, à vérifier ici avant de faire
// confiance à la moindre donnée reçue. Exemple générique en attendant la vraie doc :
const WEBHOOK_SECRET = Deno.env.get('MONEY_FUSION_WEBHOOK_SECRET')

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('x-moneyfusion-signature')
    if (!signature || signature !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'Signature invalide' }), { status: 401 })
    }

    const payload = await req.json()
    const reference = payload.reference
    const statutPaiement = payload.status // ex: "success", "failed" — à ajuster au vrai format Money Fusion

    if (!reference) {
      return new Response(JSON.stringify({ error: 'Référence manquante' }), { status: 400 })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    const nouveauStatut = statutPaiement === 'success' ? 'sequestre' : 'remboursee'

    const { error } = await supabaseAdmin
      .from('transactions')
      .update({ statut: nouveauStatut })
      .eq('reference_moneyfusion', reference)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
})