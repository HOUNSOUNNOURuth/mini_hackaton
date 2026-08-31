// Edge Function Supabase : "payer-tache"
//
// Rôle : initier un paiement Money Fusion (Fusion Pay) pour une tâche
// confirmée, et enregistrer la commission de 10 % de CampusGo.
//
// IMPORTANT — spécificité de Money Fusion (voir docs.moneyfusion.net/fr) :
// il n'y a PAS de simple clé API à mettre dans un en-tête Authorization.
// Chaque application créée sur le tableau de bord Money Fusion
// (moneyfusion.net/dashboard/pay) génère une URL UNIQUE : c'est cette URL
// elle-même qu'on appelle directement en POST. Cette URL doit rester
// secrète (elle vaut une clé API) → stockée dans le secret FUSION_PAY_URL.
//
// Money Fusion filtre aussi par adresse IP : seules les IP enregistrées sur
// leur tableau de bord peuvent appeler l'API. Si le premier appel échoue
// avec "IP non autorisée", le message d'erreur contient l'IP à enregistrer
// dans les paramètres de l'application Fusion Pay.
//
// Déploiement : supabase functions deploy payer-tache
// Secrets requis :
//   supabase secrets set FUSION_PAY_URL=url_unique_recuperee_sur_le_dashboard
// Appel depuis le frontend :
//   supabase.functions.invoke('payer-tache', { body: { tacheId } })

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const COMMISSION_TAUX = 0.10; // 10 %

Deno.serve(async (req) => {
  try {
    const { tacheId } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // clé service, jamais la clé anon
    );

    // 1. Récupérer la tâche, son prix, et le profil du demandeur (qui paie).
    const { data: tache, error: tacheError } = await supabaseAdmin
      .from("taches")
      .select("*, profiles!taches_demandeur_id_fkey(nom, telephone)")
      .eq("id", tacheId)
      .single();

    if (tacheError || !tache) {
      return new Response(JSON.stringify({ error: "Tâche introuvable." }), { status: 404 });
    }
    if (!tache.prix_propose) {
      return new Response(JSON.stringify({ error: "Aucun montant convenu pour cette tâche." }), { status: 400 });
    }
    if (!tache.profiles?.telephone) {
      return new Response(
        JSON.stringify({ error: "Le demandeur doit renseigner un numéro de téléphone avant de payer." }),
        { status: 400 }
      );
    }

    // 2. Calculer la répartition (commission CampusGo).
    const montantTotal = Number(tache.prix_propose);
    const commission = Math.round(montantTotal * COMMISSION_TAUX);
    const montantEtudiant = montantTotal - commission;

    // 3. Initier le paiement auprès de Fusion Pay, avec le format exact
    //    attendu par leur API (voir docs.moneyfusion.net/fr/webapi).
    const fusionPayUrl = Deno.env.get("FUSION_PAY_URL");
    if (!fusionPayUrl) {
      return new Response(JSON.stringify({ error: "URL Fusion Pay non configurée côté serveur." }), { status: 500 });
    }

    const paymentData = {
      totalPrice: montantTotal,
      article: [{ [tache.titre]: montantTotal }],
      numeroSend: tache.profiles.telephone,
      nomclient: tache.profiles.nom,
      personal_Info: [{ tacheId }],
      // Money Fusion enverra la confirmation de paiement à cette adresse :
      webhook_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-moneyfusion`,
    };

    const mfResponse = await fetch(fusionPayUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData),
    });

    const mfData = await mfResponse.json();

    if (!mfResponse.ok || !mfData.statut) {
      // Le message d'erreur de Money Fusion (ex: IP non autorisée) est
      // renvoyé tel quel pour faciliter le diagnostic pendant les tests.
      return new Response(JSON.stringify({ error: "Échec du paiement.", detail: mfData }), { status: 502 });
    }

    // 4. Enregistrer la transaction en "en_attente" : le webhook
    //    "webhook-moneyfusion" la passera en "sequestre" une fois le
    //    paiement confirmé par Money Fusion (événement payin.session.completed).
    const { error: txError } = await supabaseAdmin.from("transactions").insert({
      tache_id: tacheId,
      montant_total: montantTotal,
      commission,
      montant_etudiant: montantEtudiant,
      tokenpay: mfData.token,
      statut: "en_attente",
    });

    if (txError) {
      return new Response(JSON.stringify({ error: "Paiement initié mais échec d'enregistrement.", detail: txError.message }), { status: 500 });
    }

    // 5. Renvoyer l'URL de paiement : le frontend doit rediriger
    //    l'utilisateur (le demandeur) vers cette page pour qu'il confirme
    //    le paiement via son opérateur mobile money.
    return new Response(
      JSON.stringify({ success: true, lien_paiement: mfData.url, commission, montantEtudiant }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});