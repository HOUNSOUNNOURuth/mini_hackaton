import { useState } from 'react'
import { publierTache } from '../../lib/tachesService'
import { useAuth } from '../../context/AuthContext'

const CATEGORIES = [
  { value: 'menage', label: 'Ménage' },
  { value: 'garde_enfants', label: "Garde d'enfants" },
  { value: 'courses', label: 'Aide aux courses' },
  { value: 'petits_travaux', label: 'Petits travaux' },
  { value: 'soutien_scolaire', label: 'Soutien scolaire' },
]

export default function FormulairePublierTache({ onPublished }) {
  const { user } = useAuth()
  const [titre, setTitre] = useState('')
  const [categorie, setCategorie] = useState(CATEGORIES[0].value)
  const [description, setDescription] = useState('')
  const [prixPropose, setPrixPropose] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setErreur(null)
    setEnCours(true)
    try {
      const tache = await publierTache(user.id, {
        titre: titre.trim(),
        categorie,
        description: description.trim(),
        prixPropose: prixPropose ? Number(prixPropose) : null,
      })
      setTitre('')
      setDescription('')
      setPrixPropose('')
      onPublished?.(tache)
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
      <h2 className="font-medium text-primary">Publier une tâche</h2>

      <input
        type="text"
        placeholder="Titre de la tâche"
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        required
        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
      />

      <select
        value={categorie}
        onChange={(e) => setCategorie(e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
      >
        {CATEGORIES.map((cat) => (
          <option key={cat.value} value={cat.value}>{cat.label}</option>
        ))}
      </select>

      <textarea
        placeholder="Description (facultatif)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm resize-none"
      />

      <input
        type="number"
        placeholder="Prix proposé en FCFA (facultatif)"
        value={prixPropose}
        onChange={(e) => setPrixPropose(e.target.value)}
        min="0"
        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
      />

      {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

      <button
        type="submit"
        disabled={enCours}
        className="bg-secondary text-white py-2 rounded-md font-medium hover:bg-secondary-dark transition disabled:opacity-50"
      >
        {enCours ? 'Publication...' : 'Publier'}
      </button>
    </form>
  )
}