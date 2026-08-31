import { useEffect, useState } from 'react'
import { getCandidaturesPourTache, accepterCandidature } from '../../lib/tachesService'

export default function CandidaturesTache({ tacheId, statutTache, onAccepted }) {
  const [candidatures, setCandidatures] = useState([])
  const [chargement, setChargement] = useState(true)
  const [enCoursId, setEnCoursId] = useState(null)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    getCandidaturesPourTache(tacheId)
      .then(setCandidatures)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false))
  }, [tacheId])

  async function handleAccepter(candidatureId) {
    setErreur(null)
    setEnCoursId(candidatureId)
    try {
      await accepterCandidature(candidatureId)
      onAccepted?.()
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnCoursId(null)
    }
  }

  if (chargement) return <p className="text-sm text-gray-500 px-4 py-2">Chargement des candidatures...</p>

  if (candidatures.length === 0) {
    return <p className="text-sm text-gray-500 px-4 py-2">Aucune candidature reçue pour l'instant.</p>
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-2 border-t border-gray-100">
      {erreur && <p className="text-red-600 text-xs">{erreur}</p>}
      {candidatures.map((candidature) => (
        <div key={candidature.id} className="flex items-center justify-between text-sm">
          <div>
            <span className="font-medium">{candidature.profiles?.nom ?? 'Étudiant'}</span>
            <span className="text-gray-500 ml-2 text-xs">
              {candidature.statut === 'acceptee' && 'Acceptée'}
              {candidature.statut === 'refusee' && 'Refusée'}
              {candidature.statut === 'en_discussion' && statutTache === 'ouverte' && 'En attente'}
            </span>
          </div>
          {statutTache === 'ouverte' && candidature.statut === 'en_discussion' && (
            <button
              onClick={() => handleAccepter(candidature.id)}
              disabled={enCoursId === candidature.id}
              className="bg-secondary text-white px-2.5 py-1 rounded-md text-xs font-medium hover:bg-secondary-dark transition disabled:opacity-50"
            >
              {enCoursId === candidature.id ? '...' : 'Accepter'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}