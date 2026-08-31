import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const { tache_id } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

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

    const { data: tache, error: tacheError } = await supabaseAdmin
      .from('taches')
      .select('*')
      .eq('id', tache_id)
      .single()

    if (tacheError || !tache) {
      return new Response(JSON.stringify({ error: 'Tâche introuvable' }), { status: 404 })
    }
    if (tache.demandeur_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Seul le demandeur peut confirmer cette tâche' }), { status: 403 })
    }

    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('tache_id', tache_id)
      .single()

    if (transactionError || !transaction) {
      return new Response(JSON.stringify({ error: 'Aucune transaction trouvée pour cette tâche' }), { status: 404 })
    }
    if (transaction.statut !== 'sequestre') {
      return new Response(JSON.stringify({ error: 'Les fonds ne sont pas (ou plus) séquestrés' }), { status: 400 })
    }

    // ⚠️ Ici, appel réel à l'API Money Fusion pour déclencher le virement vers
    // l'étudiant (transaction.montant_etudiant) — à implémenter selon leur doc
    // de "transfert" ou "payout" une fois les identifiants disponibles.
    // const transfertResponse = await fetch('...', { ... })

    const { error: updateTransactionError } = await supabaseAdmin
      .from('transactions')
      .update({ statut: 'liberee' })
      .eq('id', transaction.id)

    if (updateTransactionError) {
      return new Response(JSON.stringify({ error: updateTransactionError.message }), { status: 500 })
    }

    const { error: updateTacheError } = await supabaseAdmin
      .from('taches')
      .update({ statut: 'terminee' })
      .eq('id', tache_id)

    if (updateTacheError) {
      return new Response(JSON.stringify({ error: updateTacheError.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
})