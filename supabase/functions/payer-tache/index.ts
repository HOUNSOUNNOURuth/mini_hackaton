// Edge Function Supabase : "payer-tache"
//
// Rôle : déclencher un paiement Money Fusion pour une tâche confirmée,
// et calculer/enregistrer la commission de 10 % de CampusGo.
// La clé API Money Fusion (MONEYFUSION_API_KEY) ne doit JAMAIS être exposée
// côté frontend : elle vit uniquement dans les variables d'environnement
// de cette fonction (Supabase Dashboard > Edge Functions > Secrets).
//
// Déploiement : supabase functions deploy payer-tache
// Appel depuis le frontend : supabase.functions.invoke('payer-tache', { body: { tacheId } })

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const COMMISSION_TAUX = 0.10; // 10 %

Deno.serve(async (req) => {
  try {
    const { tacheId } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // clé service, jamais la clé anon
    );

    // 1. Récupérer la tâche et son prix convenu.
    const { data: tache, error: tacheError } = await supabaseAdmin
      .from("taches")
      .select("*")
      .eq("id", tacheId)
      .single();

    if (tacheError || !tache) {
      return new Response(JSON.stringify({ error: "Tâche introuvable." }), { status: 404 });
    }
    if (!tache.prix_propose) {
      return new Response(JSON.stringify({ error: "Aucun montant convenu pour cette tâche." }), { status: 400 });
    }

    // 2. Calculer la répartition.
    const montantTotal = Number(tache.prix_propose);
    const commission = Math.round(montantTotal * COMMISSION_TAUX);
    const montantEtudiant = montantTotal - commission;

    // 3. Initier le paiement auprès de Money Fusion.
    const mfResponse = await fetch("https://api.moneyfusion.net/paiement/initier", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("MONEYFUSION_API_KEY")}`,
      },
      body: JSON.stringify({
        montant: montantTotal,
        reference: `campusgo-tache-${tacheId}`,
      }),
    });

    if (!mfResponse.ok) {
      return new Response(JSON.stringify({ error: "Échec de l'initialisation du paiement." }), { status: 502 });
    }
    const mfData = await mfResponse.json();

    // 4. Enregistrer la transaction (statut "séquestre" en attendant confirmation de la tâche).
    const { error: txError } = await supabaseAdmin.from("transactions").insert({
      tache_id: tacheId,
      montant_total: montantTotal,
      commission,
      montant_etudiant: montantEtudiant,
      reference_moneyfusion: mfData.reference ?? null,
      statut: "sequestre",
    });

    if (txError) {
      return new Response(JSON.stringify({ error: "Paiement initié mais échec d'enregistrement." }), { status: 500 });
    }

    return new Response(
      JSON.stringify({ success: true, lien_paiement: mfData.lien_paiement, commission, montantEtudiant }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
