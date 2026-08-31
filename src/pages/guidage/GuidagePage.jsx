import { useEffect, useState } from 'react'
import { getLieux } from '../../lib/lieuxService'
import { useGeolocation } from '../../hooks/useGeolocation'
import { distanceMetres } from '../../lib/geo'
import CampusMap from '../../components/shared/CampusMap'
import RechercheLieu from '../../components/shared/RechercheLieu'

export default function GuidagePage() {
  const [lieux, setLieux] = useState([])
  const [recherche, setRecherche] = useState('')
  const [selectedLieu, setSelectedLieu] = useState(null)
  const [erreur, setErreur] = useState(null)
  const { position, erreur: erreurGeoloc } = useGeolocation()

  useEffect(() => {
    getLieux()
      .then(setLieux)
      .catch((err) => setErreur(err.message))
  }, [])

  const lieuxFiltres = lieux.filter((lieu) =>
    lieu.nom.toLowerCase().includes(recherche.toLowerCase())
  )

  const distance =
    position && selectedLieu?.latitude
      ? Math.round(distanceMetres(position, [selectedLieu.latitude, selectedLieu.longitude]))
      : null

  return (
    <div className="flex flex-col h-full gap-4">
      <h1 className="text-2xl font-bold text-primary">Guidage sur le campus</h1>

      <RechercheLieu onSearch={setRecherche} />

      {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
      {erreurGeoloc && (
        <p className="text-amber-600 text-sm">
          Position non disponible : {erreurGeoloc}. Active la géolocalisation pour voir l'itinéraire.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-4 flex-1 min-h-0">
        <div className="sm:w-64 flex flex-col gap-2 overflow-y-auto">
          {lieuxFiltres.length === 0 && (
            <p className="text-gray-500 text-sm">Aucun lieu trouvé.</p>
          )}
          {lieuxFiltres.map((lieu) => (
            <button
              key={lieu.id}
              onClick={() => setSelectedLieu(lieu)}
              className={`text-left px-3 py-2 rounded-md text-sm transition ${
                selectedLieu?.id === lieu.id
                  ? 'bg-secondary text-white'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="font-medium">{lieu.nom}</div>
              {lieu.batiment && <div className="text-xs opacity-80">{lieu.batiment}</div>}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-[400px]">
          <CampusMap
            lieux={lieux}
            selectedLieu={selectedLieu}
            onSelectLieu={setSelectedLieu}
            positionUtilisateur={position}
          />
        </div>
      </div>

      {selectedLieu && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
          <strong>{selectedLieu.nom}</strong>
          {distance !== null && <span> — à environ {distance} m de ta position</span>}
        </div>
      )}
    </div>
  )
}