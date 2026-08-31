const CATEGORIES = [
  { value: null, label: 'Toutes' },
  { value: 'menage', label: 'Ménage' },
  { value: 'garde_enfants', label: "Garde d'enfants" },
  { value: 'courses', label: 'Aide aux courses' },
  { value: 'petits_travaux', label: 'Petits travaux' },
  { value: 'soutien_scolaire', label: 'Soutien scolaire' },
]

export default function FiltresCategorieTaches({ categorieActive, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.label}
          onClick={() => onChange(cat.value)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
            categorieActive === cat.value
              ? 'bg-secondary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}