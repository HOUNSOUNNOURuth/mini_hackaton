import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { getLienTelechargement } from '../../lib/epreuvesService'

export default function ListeEpreuves({ epreuves }) {
  const [enCoursId, setEnCoursId] = useState(null)
  const [erreur, setErreur] = useState(null)

  async function telecharger(epreuve) {
    setErreur(null)
    setEnCoursId(epreuve.id)
    try {
      const url = await getLienTelechargement(epreuve.fichier_url)
      window.open(url, '_blank')
    } catch (err) {
      setErreur(`Impossible d'ouvrir "${epreuve.matiere}" : ${err.message}`)
    } finally {
      setEnCoursId(null)
    }
  }

  if (epreuves.length === 0) {
    return <p className="text-gray-500 text-sm">Aucune épreuve ne correspond à ces critères.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
      {epreuves.map((epreuve) => (
        <div
          key={epreuve.id}
          className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-primary shrink-0" />
            <div>
              <div className="font-medium">{epreuve.matiere}</div>
              <div className="text-xs text-gray-500">
                {epreuve.ecole} · {epreuve.filiere} · {epreuve.annee} · {epreuve.session}
              </div>
            </div>
          </div>
          <button
            onClick={() => telecharger(epreuve)}
            disabled={enCoursId === epreuve.id}
            className="flex items-center gap-1.5 bg-secondary text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-secondary-dark transition disabled:opacity-50 shrink-0"
          >
            <Download size={16} />
            {enCoursId === epreuve.id ? '...' : 'Télécharger'}
          </button>
        </div>
      ))}
    </div>
  )
}