import { useState } from 'react'
import { postulerTache } from '../../lib/tachesService'
import { useAuth } from '../../context/AuthContext'

const LABELS_CATEGORIE = {
  menage: 'Ménage',
  garde_enfants: "Garde d'enfants",
  courses: 'Aide aux courses',
  petits_travaux: 'Petits travaux',
  soutien_scolaire: 'Soutien scolaire',
}

export default function ListeTaches({ taches }) {
  const { user } = useAuth()
  const [postuleesIds, setPostuleesIds] = useState(new Set())
  const [enCoursId, setEnCoursId] = useState(null)
  const [erreurs, setErreurs] = useState({})

  async function handlePostuler(tacheId) {
    setEnCoursId(tacheId)
    setErreurs((prev) => ({ ...prev, [tacheId]: null }))
    try {
      await postulerTache(tacheId, user.id)
      setPostuleesIds((prev) => new Set(prev).add(tacheId))
    } catch (err) {
      setErreurs((prev) => ({ ...prev, [tacheId]: err.message }))
    } finally {
      setEnCoursId(null)
    }
  }

  if (taches.length === 0) {
    return <p className="text-gray-500 text-sm">Aucune tâche disponible pour le moment.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {taches.map((tache) => {
        const dejaPostule = postuleesIds.has(tache.id)
        return (
          <div key={tache.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{tache.titre}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {LABELS_CATEGORIE[tache.categorie] ?? tache.categorie}
                  {tache.prix_propose && ` · ${tache.prix_propose} FCFA`}
                </div>
              </div>
              <button
                onClick={() => handlePostuler(tache.id)}
                disabled={dejaPostule || enCoursId === tache.id}
                className="shrink-0 bg-secondary text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-secondary-dark transition disabled:opacity-50"
              >
                {dejaPostule ? 'Envoyée' : enCoursId === tache.id ? '...' : 'Postuler'}
              </button>
            </div>
            {tache.description && (
              <p className="text-sm text-gray-600 mt-2">{tache.description}</p>
            )}
            {erreurs[tache.id] && (
              <p className="text-red-600 text-xs mt-1">{erreurs[tache.id]}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}