import { useEffect, useState } from 'react'

export function useGeolocation() {
  const [position, setPosition] = useState(null)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setErreur("La géolocalisation n'est pas supportée par ce navigateur.")
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude])
        setErreur(null)
      },
      (err) => setErreur(err.message),
      { enableHighAccuracy: true }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  return { position, erreur }
}