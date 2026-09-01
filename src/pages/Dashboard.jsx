import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, ClipboardList, Briefcase, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard() {
  const { user, role, nom } = useAuth()
  const [stats, setStats] = useState({ taches: 0, candidatures: 0, rdv: 0 })
  const [prochainsRdv, setProchainsRdv] = useState([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    async function charger() {
      if (!user) {
        setChargement(false)
        return
      }
      try {
        const { count: tachesCount } = await supabase
          .from('taches')
          .select('*', { count: 'exact', head: true })
          .eq('statut', 'ouverte')

        const { count: candCount } = await supabase
          .from('candidatures')
          .select('*', { count: 'exact', head: true })
          .eq('etudiant_id', user.id)

        const { count: rdvCount } = await supabase
          .from('rendezvous')
          .select('*', { count: 'exact', head: true })
          .or(`etudiant_id.eq.${user.id},demandeur_id.eq.${user.id}`)

        const { data: rdvs } = await supabase
          .from('rendezvous')
          .select('*')
          .or(`etudiant_id.eq.${user.id},demandeur_id.eq.${user.id}`)
          .order('date', { ascending: true })
          .limit(3)

        setStats({
          taches: tachesCount ?? 0,
          candidatures: candCount ?? 0,
          rdv: rdvCount ?? 0,
        })
        setProchainsRdv(rdvs ?? [])
      } catch (e) {
        console.error(e)
      } finally {
        setChargement(false)
      }
    }
    charger()
  }, [user])

  if (chargement) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const isEtudiant = role === 'etudiant'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Tableau de bord</h1>
          <p className="text-gray-500 text-sm mt-1">
            Bienvenue, <span className="font-medium text-gray-700">{nom || user?.email || 'Utilisateur'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border text-sm">
          <User size={14} className="text-gray-400" />
          <span className="capitalize text-gray-600">{role || 'Rôle inconnu'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Briefcase size={20} />} label="Tâches ouvertes" value={stats.taches} to="/taches" color="text-blue-600 bg-blue-50" />
        <StatCard icon={<ClipboardList size={20} />} label="Mes candidatures" value={stats.candidatures} to="/taches/mes-candidatures" color="text-green-600 bg-green-50" />
        <StatCard icon={<Calendar size={20} />} label="Rendez-vous" value={stats.rdv} to="/rendez-vous" color="text-orange-600 bg-orange-50" />
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Prochains rendez-vous</h2>
        {prochainsRdv.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun rendez-vous à venir.</p>
        ) : (
          <div className="space-y-3">
            {prochainsRdv.map((rdv) => (
              <div key={rdv.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-white rounded-lg">
                  <Calendar size={16} className="text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{rdv.titre || 'Rendez-vous'}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(rdv.date).toLocaleString()} — {rdv.lieu || 'Non précisé'}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${rdv.statut === 'confirme' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {rdv.statut === 'confirme' ? 'Confirmé' : 'En attente'}
                </span>
              </div>
            ))}
          </div>
        )}
        <Link to="/rendez-vous" className="inline-block mt-4 text-sm text-primary font-medium hover:underline">
          Voir tous les rendez-vous →
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/taches" className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition">
          <Briefcase size={16} />
          {isEtudiant ? 'Trouver une tâche' : 'Publier une tâche'}
        </Link>
        <Link to="/rendez-vous" className="flex items-center gap-2 bg-white border text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
          <Calendar size={16} />
          Gérer mes rendez-vous
        </Link>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, to, color }) {
  return (
    <Link to={to} className="bg-white rounded-xl border p-4 hover:shadow-md transition">
      <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>{icon}</div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </Link>
  )
}