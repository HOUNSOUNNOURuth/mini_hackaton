import { useState } from 'react'

export default function FiltresEpreuves({ onFilter }) {
  const [filtres, setFiltres] = useState({
    ecole: '',
    filiere: '',
    annee: '',
    session: '',
    matiere: '',
  })

  function handleChange(champ, valeur) {
    const nouveaux = { ...filtres, [champ]: valeur }
    setFiltres(nouveaux)
    // On ne transmet que les champs remplis (évite d'envoyer des chaînes vides comme filtre)
    const filtresActifs = Object.fromEntries(
      Object.entries(nouveaux).filter(([, v]) => v !== '')
    )
    onFilter(filtresActifs)
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-white p-3 rounded-lg border border-gray-200">
      <input
        type="text"
        placeholder="École"
        value={filtres.ecole}
        onChange={(e) => handleChange('ecole', e.target.value)}
        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
      />
      <input
        type="text"
        placeholder="Filière"
        value={filtres.filiere}
        onChange={(e) => handleChange('filiere', e.target.value)}
        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
      />
      <input
        type="number"
        placeholder="Année"
        value={filtres.annee}
        onChange={(e) => handleChange('annee', e.target.value)}
        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
      />
      <select
        value={filtres.session}
        onChange={(e) => handleChange('session', e.target.value)}
        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
      >
        <option value="">Toutes sessions</option>
        <option value="normale">Normale</option>
        <option value="rattrapage">Rattrapage</option>
      </select>
      <input
        type="text"
        placeholder="Matière"
        value={filtres.matiere}
        onChange={(e) => handleChange('matiere', e.target.value)}
        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
      />
    </div>
  )
}