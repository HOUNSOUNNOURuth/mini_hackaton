import { useEffect, useState } from 'react'
import { CreditCard, CheckCircle2 } from 'lucide-react'
import { getTransactionPourTache, initierPaiement, confirmerExecution } from '../../lib/tachesService'

export default function PaiementTache({ tache, onUpdated }) {
  const [transaction, setTransaction] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    getTransactionPourTache(tache.id)
      .then(setTransaction)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false))
  }, [tache.id])

  async function handlePayer() {
    setErreur(null)
    setEnCours(true)
    try {
      const lien = await initierPaiement(tache.id)
      window.location.href = lien // redirige vers l'interface de paiement Money Fusion
    } catch (err) {
      setErreur(err.message)
      setEnCours(false)
    }
  }

  async function handleConfirmerExecution() {
    setErreur(null)
    setEnCours(true)
    try {
      await confirmerExecution(tache.id)
      onUpdated?.()
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnCours(false)
    }
  }

  if (chargement) return <p className="text-sm text-gray-500 px-4 py-2">Chargement...</p>

  const commission = tache.prix_propose ? Math.round(tache.prix_propose * 0.10) : 0
  const montantEtudiant = tache.prix_propose ? tache.prix_propose - commission : 0

  return (
    <div className="px-4 py-3 border-t border-gray-100 flex flex-col gap-3">
      {erreur && <p className="text-red-600 text-xs">{erreur}</p>}

      {/* Aucune transaction encore : proposer le paiement */}
      {!transaction && tache.statut === 'confirmee' && (
        <>
          <div className="text-sm bg-gray-50 rounded-md p-3 flex flex-col gap-1">
            <div className="flex justify-between"><span>Montant total</span><span>{tache.prix_propose} FCFA</span></div>
            <div className="flex justify-between text-gray-500"><span>Commission (10%)</span><span>-{commission} FCFA</span></div>
            <div className="flex justify-between font-medium"><span>Reversé à l'étudiant</span><span>{montantEtudiant} FCFA</span></div>
          </div>
          <button
            onClick={handlePayer}
            disabled={enCours}
            className="flex items-center justify-center gap-2 bg-primary text-white py-2 rounded-md font-medium hover:bg-primary-dark transition disabled:opacity-50"
          >
            <CreditCard size={16} />
            {enCours ? 'Redirection...' : 'Payer via Money Fusion'}
          </button>
        </>
      )}

      {/* Paiement effectué, en attente de confirmation du webhook */}
      {transaction?.statut === 'en_attente' && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-md p-3">
          Paiement en cours de confirmation...
        </p>
      )}

      {/* Fonds séquestrés : le demandeur peut confirmer une fois la tâche réalisée */}
      {transaction?.statut === 'sequestre' && (
        <>
          <p className="text-sm text-primary bg-primary/5 rounded-md p-3">
            Fonds sécurisés en séquestre. Une fois la tâche réalisée, confirme l'exécution pour libérer le paiement à l'étudiant.
          </p>
          <button
            onClick={handleConfirmerExecution}
            disabled={enCours}
            className="flex items-center justify-center gap-2 bg-secondary text-white py-2 rounded-md font-medium hover:bg-secondary-dark transition disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            {enCours ? 'Confirmation...' : "Confirmer l'exécution"}
          </button>
        </>
      )}

      {/* Paiement libéré : tâche terminée */}
      {transaction?.statut === 'liberee' && (
        <p className="text-sm text-secondary-dark bg-secondary/10 rounded-md p-3 flex items-center gap-2">
          <CheckCircle2 size={16} />
          Tâche terminée, paiement effectué à l'étudiant.
        </p>
      )}

      {transaction?.statut === 'remboursee' && (
        <p className="text-sm text-red-700 bg-red-50 rounded-md p-3">
          Le paiement a échoué ou a été remboursé.
        </p>
      )}
    </div>
  )
}