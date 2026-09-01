import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, ArrowRight } from 'lucide-react'

export default function Accueil() {
  const navigate = useNavigate()
  const [flash, setFlash] = useState(true)
  const [shake, setShake] = useState(false)

  // Effet tonnerre au chargement
  useEffect(() => {
    const timer1 = setTimeout(() => setFlash(false), 800)
    const timer2 = setTimeout(() => setShake(true), 200)
    const timer3 = setTimeout(() => setShake(false), 1200)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
      {/* Flash blanc tonnerre */}
      {flash && (
        <div className="absolute inset-0 bg-white z-50 animate-pulse pointer-events-none" />
      )}

      {/* Particules explosion */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-ping"
            style={{
              top: `${40 + Math.random() * 20}%`,
              left: `${40 + Math.random() * 20}%`,
              backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'][i % 6],
              animationDuration: `${0.8 + Math.random() * 1}s`,
              animationDelay: `${Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Contenu principal */}
      <div className={`relative z-10 text-center px-4 ${shake ? 'animate-bounce' : ''}`}>
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
            <Zap size={48} className="text-yellow-400 animate-pulse" />
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-4 tracking-tight">
          Bienvenue sur CampusGo
        </h1>

        <p className="text-gray-400 text-lg md:text-xl max-w-lg mx-auto mb-10 leading-relaxed">
          La plateforme qui connecte les étudiants et les particuliers pour des missions locales, simples et rémunérées.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
           // AVANT (si tu avais ça)
           onClick={() => navigate('/dashboard')}

           // APRÈS (redirection vers login si pas connecté, sinon dashboard)
           onClick={() => navigate('/dashboard')}
            className="group flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-primary/30"
          >
            Entrer sur CampusGo
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="mt-12 flex justify-center gap-8 text-gray-500 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Tâches locales
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            Paiement sécurisé
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            Communauté étudiante
          </div>
        </div>
      </div>
    </div>
  )
}