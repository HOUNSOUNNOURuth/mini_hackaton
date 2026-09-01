// Edge Function Supabase : "payer-tache"
//
// Rôle : initier un paiement FedaPay pour une tâche confirmée, et
// enregistrer la commission de 10 % de CampusGo.
//
// FedaPay (voir docs.fedapay.com) fonctionne en 2 étapes :
//   1. Créer une transaction (POST /v1/transactions)
//   2. Générer un lien de paiement pour cette transaction
//      (POST /v1/transactions/{id}/token)
// Le lien renvoyé permet au demandeur de payer par Mobile Money ou carte.
//
// Déploiement : supabase functions deploy payer-tache
// Secrets requis :
//   supabase secrets set FEDAPAY_SECRET_KEY=votre_cle_secrete_fedapay
//   supabase secrets set FEDAPAY_API_URL=https://sandbox-api.fedapay.com   (mode test)
//     ou https://api.fedapay.com pour un compte Live une fois validé

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const COMMISSION_TAUX = 0.10; // 10 %

// Sans ces en-têtes, le navigateur bloque l'appel avant même qu'il parte
// (erreur CORS) — curl ne rencontre jamais ce problème car cette
// vérification est spécifique aux navigateurs web.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Le navigateur envoie d'abord une requête "OPTIONS" de vérification
  // avant la vraie requête POST — il faut y répondre correctement.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tacheId } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Récupérer la tâche, son prix, et le profil du demandeur (qui paie).
    const { data: tache, error: tacheError } = await supabaseAdmin
      .from("taches")
      .select("*, profiles!taches_demandeur_id_fkey(nom, telephone)")
      .eq("id", tacheId)
      .single();

    if (tacheError || !tache) {
      return new Response(JSON.stringify({ error: "Tâche introuvable." }), { status: 404, headers: corsHeaders });
    }
    if (!tache.prix_propose) {
      return new Response(JSON.stringify({ error: "Aucun montant convenu pour cette tâche." }), { status: 400, headers: corsHeaders });
    }
    if (!tache.profiles?.telephone) {
      return new Response(
        JSON.stringify({ error: "Le demandeur doit renseigner un numéro de téléphone avant de payer." }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(tache.demandeur_id);
    const emailDemandeur = userData?.user?.email || "demandeur@campusgo.app";

    // 2. Calculer la répartition (commission CampusGo).
    const montantTotal = Number(tache.prix_propose);
    const commission = Math.round(montantTotal * COMMISSION_TAUX);
    const montantEtudiant = montantTotal - commission;

    const fedapayUrl = Deno.env.get("FEDAPAY_API_URL"); // sandbox ou live selon le secret configuré
    const fedapayKey = Deno.env.get("FEDAPAY_SECRET_KEY");
    if (!fedapayUrl || !fedapayKey) {
      return new Response(JSON.stringify({ error: "FedaPay non configuré côté serveur." }), { status: 500, headers: corsHeaders });
    }

    const [firstname, ...reste] = (tache.profiles.nom || "Étudiant CampusGo").split(" ");
    const lastname = reste.join(" ") || "-";

    // 3. Créer la transaction chez FedaPay.
    const transactionResponse = await fetch(`${fedapayUrl}/v1/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fedapayKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description: `CampusGo — ${tache.titre}`,
        amount: montantTotal,
        currency: { iso: "XOF" },
        callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-fedapay`,
        customer: {
          firstname,
          lastname,
          email: emailDemandeur,
          phone_number: { number: tache.profiles.telephone, country: "bj" },
        },
      }),
    });

    const transactionData = await transactionResponse.json();
    if (!transactionResponse.ok) {
      return new Response(JSON.stringify({ error: "Échec de création de la transaction.", detail: transactionData }), { status: 502, headers: corsHeaders });
    }

    // La réponse de FedaPay peut être imbriquée sous différentes clés selon
    // la version de l'API — on essaie plusieurs formes pour être robuste.
    const transactionId = transactionData?.id || transactionData?.["v1/transaction"]?.id || transactionData?.transaction?.id;
    if (!transactionId) {
      return new Response(JSON.stringify({ error: "Identifiant de transaction introuvable dans la réponse FedaPay.", detail: transactionData }), { status: 502, headers: corsHeaders });
    }

    // 4. Générer le lien de paiement pour cette transaction.
    const tokenResponse = await fetch(`${fedapayUrl}/v1/transactions/${transactionId}/token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fedapayKey}`,
        "Content-Type": "application/json",
      },
    });

    const tokenData = await tokenResponse.json();
    const lienPaiement = tokenData?.url || tokenData?.token?.url || tokenData?.["v1/token"]?.url;

    if (!tokenResponse.ok || !lienPaiement) {
      return new Response(JSON.stringify({ error: "Échec de génération du lien de paiement.", detail: tokenData }), { status: 502, headers: corsHeaders });
    }

    // 5. Enregistrer la transaction en "en_attente" : le webhook
    //    "webhook-fedapay" la passera en "sequestre" une fois le paiement
    //    confirmé (événement transaction.approved).
    const { error: txError } = await supabaseAdmin.from("transactions").insert({
      tache_id: tacheId,
      montant_total: montantTotal,
      commission,
      montant_etudiant: montantEtudiant,
      tokenpay: String(transactionId),
      statut: "en_attente",
    });

    if (txError) {
      return new Response(JSON.stringify({ error: "Paiement initié mais échec d'enregistrement.", detail: txError.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ success: true, lien_paiement: lienPaiement, commission, montantEtudiant }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});