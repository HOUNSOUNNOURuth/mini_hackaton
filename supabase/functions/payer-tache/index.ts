import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MONEY_FUSION_API_URL = 'https://www.moneyfusion.net/api/v1/payment' // à ajuster selon la vraie doc Money Fusion
const MONEY_FUSION_API_KEY = Deno.env.get('MONEY_FUSION_API_KEY')
const COMMISSION_TAUX = 0.10

Deno.serve(async (req) => {
  try {
    const { tache_id } = await req.json()

    // Client avec la clé de service : contourne les RLS pour cette opération serveur,
    // mais toute la logique métier (qui a le droit de payer quoi) est vérifiée ci-dessous.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    // Identifie l'utilisateur appelant à partir de son JWT (envoyé automatiquement par supabase.functions.invoke)
    const authHeader = req.headers.get('Authorization')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 })
    }

    // Récupère la tâche et vérifie qu'elle est payable
    const { data: tache, error: tacheError } = await supabaseAdmin
      .from('taches')
      .select('*')
      .eq('id', tache_id)
      .single()

    if (tacheError || !tache) {
      return new Response(JSON.stringify({ error: 'Tâche introuvable' }), { status: 404 })
    }
    if (tache.demandeur_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Seul le demandeur peut payer cette tâche' }), { status: 403 })
    }
    if (tache.statut !== 'confirmee') {
      return new Response(JSON.stringify({ error: 'La tâche doit être confirmée avant paiement' }), { status: 400 })
    }
    if (!tache.prix_propose) {
      return new Response(JSON.stringify({ error: 'Aucun montant défini pour cette tâche' }), { status: 400 })
    }

    const montantTotal = tache.prix_propose
    const commission = Math.round(montantTotal * COMMISSION_TAUX)
    const montantEtudiant = montantTotal - commission

    // Appel réel à l'API Money Fusion — à ajuster précisément selon leur documentation
    // (endpoint, format du body, méthode d'auth) une fois les identifiants obtenus.
    const paiementResponse = await fetch(MONEY_FUSION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MONEY_FUSION_API_KEY}`,
      },
      body: JSON.stringify({
        amount: montantTotal,
        reference: `campusgo-tache-${tache_id}`,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-money-fusion`,
      }),
    })

    if (!paiementResponse.ok) {
      const detail = await paiementResponse.text()
      return new Response(JSON.stringify({ error: `Erreur Money Fusion : ${detail}` }), { status: 502 })
    }

    const paiementData = await paiementResponse.json()

    // Enregistre la transaction en attente, en attendant la confirmation par webhook
    const { error: insertError } = await supabaseAdmin.from('transactions').insert({
      tache_id,
      montant_total: montantTotal,
      commission,
      montant_etudiant: montantEtudiant,
      reference_moneyfusion: paiementData.reference ?? paiementData.id,
      statut: 'en_attente',
    })

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500 })
    }

    return new Response(
      JSON.stringify({ lien_paiement: paiementData.payment_url ?? paiementData.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
  const message = err instanceof Error ? err.message : 'Erreur inconnue'
  return new Response(JSON.stringify({ error: message }), { status: 500 })
}
})