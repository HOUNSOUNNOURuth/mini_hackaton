import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Plus, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getTachesOuvertes } from '../../lib/tachesService'
import FiltresCategorieTaches from '../../components/shared/FiltresCategorieTaches'
import ListeTaches from '../../components/shared/ListeTaches'
import FormulairePublierTache from '../../components/shared/FormulairePublierTache'

// Rôles autorisés à publier une tâche (le personnel/admin peut aussi en avoir besoin ponctuellement)
const ROLES_DEMANDEUR = ['particulier', 'admin']

export default function TachesPage() {
  const { role } = useAuth()
  const [taches, setTaches] = useState([])
  const [categorieActive, setCategorieActive] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)

  const peutPublier = ROLES_DEMANDEUR.includes(role)

  async function charger(categorie) {
    setChargement(true)
    setErreur(null)
    try {
      const data = await getTachesOuvertes(categorie)
      setTaches(data)
    } catch (err) {
      setErreur(err.message)
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => {
    charger(categorieActive)
  }, [categorieActive])

  function handleTachePubliee() {
    setFormulaireOuvert(false)
    charger(categorieActive) // recharge la liste pour inclure la nouvelle tâche
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-primary">Marketplace de tâches</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link
            to="/taches/mes-candidatures"
            className="flex items-center gap-1.5 text-secondary font-medium hover:underline"
          >
            <ClipboardList size={16} />
            Mes candidatures
          </Link>
          {peutPublier && (
            <Link
              to="/taches/mes-publications"
              className="flex items-center gap-1.5 text-secondary font-medium hover:underline"
            >
              <ClipboardList size={16} />
              Mes publications
            </Link>
          )}
        </div>
      </div>

      {peutPublier && (
        <div>
          <button
            onClick={() => setFormulaireOuvert((v) => !v)}
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition"
          >
            {formulaireOuvert ? <X size={16} /> : <Plus size={16} />}
            {formulaireOuvert ? 'Annuler' : 'Publier une tâche'}
          </button>
          {formulaireOuvert && (
            <div className="mt-3">
              <FormulairePublierTache onPublished={handleTachePubliee} />
            </div>
          )}
        </div>
      )}

      <FiltresCategorieTaches categorieActive={categorieActive} onChange={setCategorieActive} />

      {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

      {chargement ? (
        <p className="text-gray-500 text-sm">Chargement des tâches...</p>
      ) : (
        <ListeTaches taches={taches} />
      )}
    </div>
  )
}