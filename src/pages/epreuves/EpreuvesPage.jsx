import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getEpreuves } from '../../lib/epreuvesService'
import VerificationMatricule from '../../components/shared/VerificationMatricule'
import FiltresEpreuves from '../../components/shared/FiltresEpreuves'
import ListeEpreuves from '../../components/shared/ListeEpreuves'

export default function EpreuvesPage() {
  const { matricule, loading: loadingAuth } = useAuth()
  const [epreuves, setEpreuves] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)

  async function chargerEpreuves(filtres = {}) {
    setChargement(true)
    setErreur(null)
    try {
      const data = await getEpreuves(filtres)
      setEpreuves(data)
    } catch (err) {
      setErreur(err.message)
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => {
    if (matricule) chargerEpreuves()
  }, [matricule])

  if (loadingAuth) return <p>Chargement...</p>

  if (!matricule) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-primary mb-6">Banque d'épreuves</h1>
        <VerificationMatricule />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">Banque d'épreuves</h1>

      <FiltresEpreuves onFilter={chargerEpreuves} />

      {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

      {chargement ? (
        <p className="text-gray-500 text-sm">Chargement des épreuves...</p>
      ) : (
        <ListeEpreuves epreuves={epreuves} />
      )}
    </div>
  )
}