import { useEffect, useRef, useState } from 'react'
import { Search, Mic, MicOff } from 'lucide-react'

export default function RechercheLieu({ onSearch }) {
  const [texte, setTexte] = useState('')
  const [ecoute, setEcoute] = useState(false)
  const recognitionRef = useRef(null)

  // Prépare la reconnaissance vocale une seule fois au montage du composant
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return // API non supportée par ce navigateur

    const recognition = new SpeechRecognition()
    recognition.lang = 'fr-FR'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setTexte(transcript)
      onSearch(transcript)
    }

    recognition.onend = () => setEcoute(false)
    recognition.onerror = () => setEcoute(false)

    recognitionRef.current = recognition
  }, [onSearch])

  function toggleEcoute() {
    if (!recognitionRef.current) {
      alert("La reconnaissance vocale n'est pas supportée sur ce navigateur.")
      return
    }
    if (ecoute) {
      recognitionRef.current.stop()
      setEcoute(false)
    } else {
      recognitionRef.current.start()
      setEcoute(true)
    }
  }

  function handleChange(e) {
    setTexte(e.target.value)
    onSearch(e.target.value)
  }

  return (
    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm">
      <Search size={18} className="text-gray-400" />
      <input
        type="text"
        placeholder="Où veux-tu aller ?"
        value={texte}
        onChange={handleChange}
        className="flex-1 outline-none text-sm"
      />
      <button
        type="button"
        onClick={toggleEcoute}
        className={`p-1.5 rounded-full transition ${
          ecoute ? 'bg-red-100 text-red-600' : 'text-gray-500 hover:bg-gray-100'
        }`}
        title="Recherche vocale"
      >
        {ecoute ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
    </div>
  )
}