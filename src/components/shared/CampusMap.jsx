import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Icône bleue distincte pour représenter l'utilisateur sur la carte
const iconUtilisateur = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'hue-rotate-180', // teinte différente pour se distinguer visuellement
})

const CENTRE_CAMPUS = [6.3703, 2.3912]

// Composant interne qui recentre la carte quand le lieu sélectionné change
function RecentrerCarte({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.setView(position, map.getZoom())
  }, [position, map])
  return null
}

export default function CampusMap({ lieux, selectedLieu, onSelectLieu, positionUtilisateur }) {
  return (
    <MapContainer center={CENTRE_CAMPUS} zoom={17} className="w-full h-full rounded-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {lieux
        .filter((lieu) => lieu.latitude && lieu.longitude)
        .map((lieu) => (
          <Marker
            key={lieu.id}
            position={[lieu.latitude, lieu.longitude]}
            eventHandlers={{ click: () => onSelectLieu?.(lieu) }}
          >
            <Popup>
              <strong>{lieu.nom}</strong>
              {lieu.batiment && <div>{lieu.batiment}</div>}
            </Popup>
          </Marker>
        ))}

      {positionUtilisateur && (
        <Marker position={positionUtilisateur} icon={iconUtilisateur}>
          <Popup>Toi</Popup>
        </Marker>
      )}

      {positionUtilisateur && selectedLieu?.latitude && (
        <Polyline
          positions={[positionUtilisateur, [selectedLieu.latitude, selectedLieu.longitude]]}
          pathOptions={{ color: '#16A34A', dashArray: '6 6', weight: 3 }}
        />
      )}

      {selectedLieu?.latitude && (
        <RecentrerCarte position={[selectedLieu.latitude, selectedLieu.longitude]} />
      )}
    </MapContainer>
  )
}