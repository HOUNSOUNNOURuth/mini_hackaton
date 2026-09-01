// Edge Function Supabase : "webhook-fedapay"
//
// Rôle : recevoir les notifications que FedaPay envoie automatiquement
// quand le statut d'un paiement change (transaction.approved,
// transaction.canceled, transaction.declined...).
//
// ⚠️ NOTE HONNÊTE : FedaPay signe ses webhooks (en-tête X-FEDAPAY-SIGNATURE)
// et fournit un secret dédié pour vérifier cette signature, mais leur
// documentation officielle décrit la vérification uniquement via leurs
// propres librairies (PHP/Node), sans détailler l'algorithme exact utilisé
// en clair. Cette fonction ne vérifie donc PAS la signature pour l'instant
// (elle fait confiance au contenu reçu, comme pour Money Fusion) — à
// sécuriser avant un vrai lancement en production, en suivant précisément
// la documentation FedaPay au moment de l'implémentation finale.
//
// Déploiement : supabase functions deploy webhook-fedapay --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const notification = await req.json();

    // La structure exacte peut varier ; on essaie plusieurs formes.
    const nomEvenement: string = notification?.name || notification?.event || "";
    const transactionId = notification?.entity?.id || notification?.data?.id || notification?.id;

    if (!transactionId) {
      return new Response(JSON.stringify({ received: true, note: "Aucun id de transaction dans la notification" }), { status: 200 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: transaction } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("tokenpay", String(transactionId))
      .single();

    if (!transaction) {
      return new Response(JSON.stringify({ received: true, note: "Transaction introuvable" }), { status: 200 });
    }

    const correspondance: Record<string, string> = {
      "transaction.approved": "sequestre", // paiement réussi, fonds retenus jusqu'à validation de la tâche
      "transaction.canceled": "echoue",
      "transaction.declined": "echoue",
    };
    const nouveauStatut = correspondance[nomEvenement];

    if (!nouveauStatut || transaction.statut === nouveauStatut) {
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    await supabaseAdmin
      .from("transactions")
      .update({ statut: nouveauStatut })
      .eq("id", transaction.id);

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});