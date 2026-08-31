import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function SignUp() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('etudiant')
  const [matricule, setMatricule] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    
    const { error } = await signUp(email, password, {
      nom: nom.trim(),
      role,
      matricule: role === 'etudiant' && matricule.trim() ? matricule.trim() : null,
    })

    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <p className="text-center max-w-sm">
          Compte créé ! Vérifie ton email pour confirmer, puis{' '}
          <Link to="/login" className="text-secondary font-medium">connecte-toi</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-primary mb-4">Inscription</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text" placeholder="Nom complet" value={nom}
            onChange={(e) => setNom(e.target.value)} required
            className="border border-gray-300 rounded-md px-3 py-2"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole('etudiant')}
              className={`flex-1 py-2 rounded-md text-sm font-medium border transition ${
                role === 'etudiant'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Étudiant
            </button>
            <button
              type="button"
              onClick={() => setRole('particulier')}
              className={`flex-1 py-2 rounded-md text-sm font-medium border transition ${
                role === 'particulier'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Particulier
            </button>
          </div>

          {role === 'etudiant' && (
  <div>
    <input
      type="text" placeholder="Matricule (optionnel)" value={matricule}
      onChange={(e) => setMatricule(e.target.value)}
      className="border border-gray-300 rounded-md px-3 py-2 w-full"
    />
    <p className="text-xs text-gray-500 mt-1">
      Pas encore ton matricule ? Tu pourras l'ajouter plus tard pour accéder à la banque d'épreuves.
    </p>
  </div>
)}

          <input
            type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required
            className="border border-gray-300 rounded-md px-3 py-2"
          />
          <input
            type="password" placeholder="Mot de passe" value={password}
            onChange={(e) => setPassword(e.target.value)} required
            className="border border-gray-300 rounded-md px-3 py-2"
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" className="bg-primary text-white py-2 rounded-md font-medium hover:bg-primary-dark transition">
            S'inscrire
          </button>
        </form>
        <p className="text-sm text-gray-600 mt-3">
          Déjà un compte ? <Link to="/login" className="text-secondary font-medium">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}