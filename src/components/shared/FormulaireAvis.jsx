import { useEffect, useState } from 'react'
import { Star, CheckCircle2 } from 'lucide-react'
import { laisserAvis, getMonAvisPourTache } from '../../lib/avisService'
import { useAuth } from '../../context/AuthContext'

export default function FormulaireAvis({ tacheId, cibleId }) {
  const { user } = useAuth()
  const [avisExistant, setAvisExistant] = useState(null)
  const [note, setNote] = useState(0)
  const [noteSurvol, setNoteSurvol] = useState(0)
  const [commentaire, setCommentaire] = useState('')
  const [chargement, setChargement] = useState(true)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    getMonAvisPourTache(tacheId, user.id)
      .then(setAvisExistant)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false))
  }, [tacheId, user.id])

  async function handleSubmit(e) {
    e.preventDefault()
    if (note === 0) {
      setErreur('Choisis une note avant d\'envoyer.')
      return
    }
    setErreur(null)
    setEnCours(true)
    try {
      await laisserAvis(tacheId, cibleId, user.id, note, commentaire.trim())
      setAvisExistant({ note, commentaire })
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnCours(false)
    }
  }

  if (chargement) return null

  if (avisExistant) {
    return (
      <div className="text-sm bg-secondary/5 rounded-md p-3 flex items-center gap-2 text-secondary-dark">
        <CheckCircle2 size={16} />
        Avis envoyé ({avisExistant.note}/5)
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-md p-3 flex flex-col gap-2">
      <p className="text-sm font-medium">Laisser un avis</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((valeur) => (
          <button
            key={valeur}
            type="button"
            onClick={() => setNote(valeur)}
            onMouseEnter={() => setNoteSurvol(valeur)}
            onMouseLeave={() => setNoteSurvol(0)}
          >
            <Star
              size={22}
              className={
                valeur <= (noteSurvol || note)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-300'
              }
            />
          </button>
        ))}
      </div>
      <textarea
        placeholder="Commentaire (facultatif)"
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        rows={2}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm resize-none"
      />
      {erreur && <p className="text-red-600 text-xs">{erreur}</p>}
      <button
        type="submit"
        disabled={enCours}
        className="bg-primary text-white py-1.5 rounded-md text-sm font-medium hover:bg-primary-dark transition disabled:opacity-50 self-start px-4"
      >
        {enCours ? 'Envoi...' : "Envoyer l'avis"}
      </button>
    </form>
  )
}