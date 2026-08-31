import { useState } from 'react'
import { verifierMatricule, enregistrerMatricule } from '../../lib/epreuvesService'
import { useAuth } from '../../context/AuthContext'

export default function VerificationMatricule() {
  const { user, rafraichirProfil } = useAuth()
  const [matricule, setMatricule] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setErreur(null)
    setEnCours(true)
    try {
      const valide = await verifierMatricule(matricule.trim())
      if (!valide) {
        setErreur("Ce matricule n'est pas reconnu. Vérifie la saisie.")
        return
      }
      await enregistrerMatricule(user.id, matricule.trim())
      await rafraichirProfil()
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto bg-white p-6 rounded-lg shadow border border-gray-200">
      <h2 className="text-lg font-bold text-primary mb-2">Vérification du matricule</h2>
      <p className="text-sm text-gray-600 mb-4">
        L'accès à la banque d'épreuves nécessite un matricule étudiant valide.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Ton matricule"
          value={matricule}
          onChange={(e) => setMatricule(e.target.value)}
          required
          className="border border-gray-300 rounded-md px-3 py-2"
        />
        {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
        <button
          type="submit"
          disabled={enCours}
          className="bg-primary text-white py-2 rounded-md font-medium hover:bg-primary-dark transition disabled:opacity-50"
        >
          {enCours ? 'Vérification...' : 'Vérifier'}
        </button>
      </form>
    </div>
  )
}