// Edge Function Supabase : "webhook-moneyfusion"
//
// Rôle : recevoir les notifications que Money Fusion envoie automatiquement
// quand le statut d'un paiement change (voir docs.moneyfusion.net/fr/webapi
// section "Suivi des Transactions en Temps Réel via Webhook").
//
// Cette URL est celle qu'on transmet dans "webhook_url" au moment d'appeler
// payer-tache. Money Fusion peut envoyer plusieurs fois le même événement :
// on vérifie donc le statut actuel avant de mettre à jour, pour éviter les
// doublons de traitement (recommandation officielle de leur documentation).
//
// Déploiement : supabase functions deploy webhook-moneyfusion

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const notification = await req.json();
    const { event, tokenPay, numeroTransaction } = notification;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: transaction } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("tokenpay", tokenPay)
      .single();

    if (!transaction) {
      // Transaction inconnue : on répond quand même 200 pour éviter que
      // Money Fusion ne réessaie indéfiniment un événement qu'on ne peut pas traiter.
      return new Response(JSON.stringify({ received: true, note: "Transaction introuvable" }), { status: 200 });
    }

    // On ignore les notifications redondantes qui ne changent rien.
    const correspondance: Record<string, string> = {
      "payin.session.pending": "en_attente",
      "payin.session.completed": "sequestre", // paiement réussi, fonds retenus jusqu'à validation de la tâche
      "payin.session.cancelled": "echoue",
    };
    const nouveauStatut = correspondance[event];

    if (!nouveauStatut || transaction.statut === nouveauStatut) {
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    await supabaseAdmin
      .from("transactions")
      .update({ statut: nouveauStatut, numero_transaction: numeroTransaction ?? transaction.numero_transaction })
      .eq("id", transaction.id);

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});