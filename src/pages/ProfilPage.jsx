import { useState } from 'react'
import { User, Lock, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { mettreAJourNom, mettreAJourMotDePasse } from '../lib/profileService'

const LABELS_ROLE = {
  etudiant: 'Étudiant',
  particulier: 'Particulier',
  personnel: 'Personnel administratif',
  admin: 'Administrateur',
}

export default function ProfilPage() {
  const { user, role, matricule, nom, rafraichirProfil } = useAuth()

  const [nouveauNom, setNouveauNom] = useState(nom ?? '')
  const [enCoursNom, setEnCoursNom] = useState(false)
  const [erreurNom, setErreurNom] = useState(null)
  const [succesNom, setSuccesNom] = useState(false)

  const [motDePasse, setMotDePasse] = useState('')
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('')
  const [enCoursMdp, setEnCoursMdp] = useState(false)
  const [erreurMdp, setErreurMdp] = useState(null)
  const [succesMdp, setSuccesMdp] = useState(false)

  async function handleSubmitNom(e) {
    e.preventDefault()
    setErreurNom(null)
    setSuccesNom(false)
    setEnCoursNom(true)
    try {
      await mettreAJourNom(user.id, nouveauNom.trim())
      await rafraichirProfil()
      setSuccesNom(true)
    } catch (err) {
      setErreurNom(err.message)
    } finally {
      setEnCoursNom(false)
    }
  }

  async function handleSubmitMotDePasse(e) {
    e.preventDefault()
    setErreurMdp(null)
    setSuccesMdp(false)

    if (motDePasse.length < 6) {
      setErreurMdp('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (motDePasse !== confirmationMotDePasse) {
      setErreurMdp('Les deux mots de passe ne correspondent pas.')
      return
    }

    setEnCoursMdp(true)
    try {
      await mettreAJourMotDePasse(motDePasse)
      setMotDePasse('')
      setConfirmationMotDePasse('')
      setSuccesMdp(true)
    } catch (err) {
      setErreurMdp(err.message)
    } finally {
      setEnCoursMdp(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-2xl font-bold text-primary">Mon profil</h1>

      {/* Informations en lecture seule */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{user?.email}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Rôle</span><span>{LABELS_ROLE[role] ?? role}</span></div>
        {matricule && (
          <div className="flex justify-between"><span className="text-gray-500">Matricule</span><span>{matricule}</span></div>
        )}
      </div>

      {/* Modifier le nom */}
      <form onSubmit={handleSubmitNom} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
        <h2 className="font-medium flex items-center gap-2 text-primary">
          <User size={18} /> Nom affiché
        </h2>
        <input
          type="text"
          value={nouveauNom}
          onChange={(e) => setNouveauNom(e.target.value)}
          required
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        {erreurNom && <p className="text-red-600 text-xs">{erreurNom}</p>}
        {succesNom && (
          <p className="text-secondary-dark text-xs flex items-center gap-1">
            <CheckCircle2 size={14} /> Nom mis à jour
          </p>
        )}
        <button
          type="submit"
          disabled={enCoursNom}
          className="self-start bg-primary text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary-dark transition disabled:opacity-50"
        >
          {enCoursNom ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>

      {/* Changer le mot de passe */}
      <form onSubmit={handleSubmitMotDePasse} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
        <h2 className="font-medium flex items-center gap-2 text-primary">
          <Lock size={18} /> Changer le mot de passe
        </h2>
        <input
          type="password"
          placeholder="Nouveau mot de passe"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          required
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Confirmer le nouveau mot de passe"
          value={confirmationMotDePasse}
          onChange={(e) => setConfirmationMotDePasse(e.target.value)}
          required
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        {erreurMdp && <p className="text-red-600 text-xs">{erreurMdp}</p>}
        {succesMdp && (
          <p className="text-secondary-dark text-xs flex items-center gap-1">
            <CheckCircle2 size={14} /> Mot de passe mis à jour
          </p>
        )}
        <button
          type="submit"
          disabled={enCoursMdp}
          className="self-start bg-primary text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary-dark transition disabled:opacity-50"
        >
          {enCoursMdp ? 'Enregistrement...' : 'Changer le mot de passe'}
        </button>
      </form>
    </div>
  )
}