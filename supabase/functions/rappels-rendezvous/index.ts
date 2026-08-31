// Edge Function Supabase : "rappels-rendezvous"
//
// Rôle : envoyer un e-mail de rappel aux étudiants dont le rendez-vous a
// lieu dans les prochaines 24h, et qui n'ont pas encore reçu de rappel.
//
// Cette fonction est prévue pour être appelée automatiquement toutes les
// heures par une tâche planifiée (pg_cron), pas manuellement — voir les
// instructions SQL fournies pour la programmer.
//
// Service utilisé : Brevo (ex-Sendinblue), gratuit jusqu'à 300 emails/jour,
// sans carte bancaire.
//
// Déploiement : supabase functions deploy rappels-rendezvous --no-verify-jwt
// Secrets requis :
//   supabase secrets set BREVO_API_KEY=votre_cle_brevo
//   supabase secrets set BREVO_EMAIL_EXPEDITEUR=votre_email_verifie_sur_brevo
//   supabase secrets set RAPPELS_SECRET=un_mot_de_passe_choisi_par_vous

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    // Protection simple : seul un appel connaissant ce secret (la tâche
    // planifiée) peut déclencher l'envoi, pour éviter les appels abusifs.
    const secretRecu = req.headers.get("x-cron-secret");
    if (secretRecu !== Deno.env.get("RAPPELS_SECRET")) {
      return new Response(JSON.stringify({ error: "Non autorisé." }), { status: 401 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rendez-vous confirmés, dans les prochaines 24h, pas encore rappelés.
    const dansVingtQuatreHeures = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: rendezvousAVenir, error } = await supabaseAdmin
      .from("rendezvous")
      .select(`
        id, etudiant_id, rappel_envoye,
        creneaux ( date_heure, bureaux ( nom ) ),
        profiles ( nom )
      `)
      .eq("statut", "confirme")
      .eq("rappel_envoye", false)
      .lte("creneaux.date_heure", dansVingtQuatreHeures)
      .gte("creneaux.date_heure", new Date().toISOString());

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    let envoyes = 0;

    for (const rdv of rendezvousAVenir || []) {
      if (!rdv.creneaux) continue;

      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(rdv.etudiant_id);
      const email = userData?.user?.email;
      if (!email) continue;

      const dateFormatee = new Date(rdv.creneaux.date_heure).toLocaleString("fr-FR", {
        dateStyle: "full",
        timeStyle: "short",
      });

      const envoiOk = await envoyerEmailBrevo({
        destinataireEmail: email,
        destinataireNom: rdv.profiles?.nom || "",
        sujet: "Rappel : votre rendez-vous CampusGo demain",
        contenuHtml: `
          <p>Bonjour ${rdv.profiles?.nom || ""},</p>
          <p>Petit rappel : vous avez rendez-vous <strong>${dateFormatee}</strong>
          au bureau <strong>${rdv.creneaux.bureaux?.nom || ""}</strong>.</p>
          <p>Merci d'arriver quelques minutes en avance.</p>
          <p>— L'équipe CampusGo</p>
        `,
      });

      if (envoiOk) {
        await supabaseAdmin.from("rendezvous").update({ rappel_envoye: true }).eq("id", rdv.id);
        envoyes++;
      }
    }

    return new Response(JSON.stringify({ rappels_envoyes: envoyes }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

async function envoyerEmailBrevo({ destinataireEmail, destinataireNom, sujet, contenuHtml }: {
  destinataireEmail: string;
  destinataireNom: string;
  sujet: string;
  contenuHtml: string;
}): Promise<boolean> {
  const reponse = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": Deno.env.get("BREVO_API_KEY")!,
    },
    body: JSON.stringify({
      sender: { name: "CampusGo", email: Deno.env.get("BREVO_EMAIL_EXPEDITEUR") },
      to: [{ email: destinataireEmail, name: destinataireNom }],
      subject: sujet,
      htmlContent: contenuHtml,
    }),
  });

  return reponse.ok;
}