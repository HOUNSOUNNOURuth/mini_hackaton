import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getMesTachesPubliees } from '../../lib/tachesService'
import CandidaturesTache from '../../components/shared/CandidaturesTache'
import PaiementTache from '../../components/shared/PaiementTache'
import FormulaireAvis from '../../components/shared/FormulaireAvis'


const LABELS_STATUT = {
  ouverte: { texte: 'Ouverte', classe: 'bg-secondary/15 text-secondary-dark' },
  en_negociation: { texte: 'En négociation', classe: 'bg-amber-100 text-amber-700' },
  confirmee: { texte: 'Confirmée', classe: 'bg-primary/15 text-primary-dark' },
  terminee: { texte: 'Terminée', classe: 'bg-gray-200 text-gray-700' },
  litige: { texte: 'Litige', classe: 'bg-red-100 text-red-700' },
  annulee: { texte: 'Annulée', classe: 'bg-gray-100 text-gray-500' },
}

export default function MesTachesPubliees() {
  const { user } = useAuth()
  const [taches, setTaches] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [tacheOuverteId, setTacheOuverteId] = useState(null)

  async function charger() {
    setChargement(true)
    try {
      const data = await getMesTachesPubliees(user.id)
      setTaches(data)
    } catch (err) {
      setErreur(err.message)
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => {
    charger()
  }, [user.id])

  function toggleTache(tacheId) {
    setTacheOuverteId((prev) => (prev === tacheId ? null : tacheId))
  }

  function handleCandidatureAcceptee() {
    setTacheOuverteId(null)
    charger() // la tâche acceptée passe à "confirmée" — on rafraîchit la liste
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link to="/taches" className="text-gray-500 hover:text-primary">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-primary">Mes tâches publiées</h1>
      </div>

      {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

      {chargement ? (
        <p className="text-gray-500 text-sm">Chargement...</p>
      ) : taches.length === 0 ? (
        <p className="text-gray-500 text-sm">Tu n'as encore publié aucune tâche.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {taches.map((tache) => {
            const statut = LABELS_STATUT[tache.statut] ?? {
              texte: tache.statut,
              classe: 'bg-gray-100 text-gray-700',
            }
            const nbCandidatures = tache.candidatures?.[0]?.count ?? 0
            const estOuvert = tacheOuverteId === tache.id

            return (
              <div key={tache.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleTache(tache.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div>
                    <div className="font-medium">{tache.titre}</div>
                    <div className="text-xs text-gray-500">
                      {nbCandidatures} candidature{nbCandidatures !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statut.classe}`}>
                      {statut.texte}
                    </span>
                    {estOuvert ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </button>

                {estOuvert && (
  tache.statut === 'ouverte' ? (
    <CandidaturesTache
      tacheId={tache.id}
      statutTache={tache.statut}
      onAccepted={handleCandidatureAcceptee}
    />
  ) : tache.statut === 'terminee' ? (
    <div className="px-4 py-3 border-t border-gray-100">
      <FormulaireAvis tacheId={tache.id} cibleId={tache.etudiant_assigne_id} />
    </div>
  ) : (
    <PaiementTache tache={tache} onUpdated={charger} />
  )
)}

   
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}