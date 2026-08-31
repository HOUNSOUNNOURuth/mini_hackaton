import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getMesCandidatures } from '../../lib/tachesService'
import FormulaireAvis from '../../components/shared/FormulaireAvis'

const LABELS_STATUT = {
  en_discussion: { texte: 'En discussion', classe: 'bg-amber-100 text-amber-700' },
  acceptee: { texte: 'Acceptée', classe: 'bg-secondary/15 text-secondary-dark' },
  refusee: { texte: 'Refusée', classe: 'bg-red-100 text-red-700' },
}

export default function MesCandidatures() {
  const { user } = useAuth()
  const [candidatures, setCandidatures] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    getMesCandidatures(user.id)
      .then(setCandidatures)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false))
  }, [user.id])

  if (chargement) {
    return <div className="p-4 text-center">Chargement...</div>
  }

  if (erreur) {
    return <div className="p-4 text-center text-red-600">{erreur}</div>
  }

  if (candidatures.length === 0) {
    return (
      <div className="p-4">
        <Link to="/taches" className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <ArrowLeft size={16} />
          Retour aux tâches
        </Link>
        <p className="text-center text-gray-500">Aucune candidature trouvée.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <Link to="/taches" className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <ArrowLeft size={16} />
        Retour aux tâches
      </Link>

      <h1 className="text-xl font-bold mb-4">Mes candidatures</h1>

      {candidatures.map((candidature) => {
        const statut = LABELS_STATUT[candidature.statut] || { texte: candidature.statut, classe: 'bg-gray-100 text-gray-600' }

        return (
          <div
            key={candidature.id}
            className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{candidature.taches?.titre}</div>
                <div className="text-xs text-gray-500">
                  {candidature.taches?.prix_propose && `${candidature.taches.prix_propose} FCFA`}
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statut.classe}`}>
                {statut.texte}
              </span>
            </div>

            {candidature.statut === 'acceptee' && candidature.taches?.statut === 'terminee' && (
              <FormulaireAvis
                tacheId={candidature.taches.id}
                cibleId={candidature.taches.demandeur_id}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}