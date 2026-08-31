import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function SignIn() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/')
  }

 return (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-primary mb-4">Connexion</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
          Se connecter
        </button>
      </form>
      <p className="text-sm text-gray-600 mt-3">
        Pas encore de compte ? <Link to="/signup" className="text-secondary font-medium">S'inscrire</Link>
      </p>
    </div>
  </div>
)
}