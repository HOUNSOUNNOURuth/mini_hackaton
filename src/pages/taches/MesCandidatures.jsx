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
}