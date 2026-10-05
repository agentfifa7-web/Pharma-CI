import { useEffect, type ReactNode } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { LatLng } from '../types'

export type MapMarker = {
  id: string
  position: LatLng
  /** Couleur de la pastille (CSS). */
  color?: string
  /** Emoji ou texte court affiché dans la pastille. */
  glyph?: string
  size?: number
  pulse?: boolean
  popup?: ReactNode
  onClick?: () => void
}

const icon = (m: MapMarker) => {
  const s = m.size ?? 30
  return L.divIcon({
    className: '',
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    html: `<div style="position:relative;width:${s}px;height:${s}px;color:${m.color ?? '#009e60'}">
      ${m.pulse ? '<span class="pulse-ring" style="position:absolute;inset:0;border-radius:9999px"></span>' : ''}
      <div style="position:relative;display:grid;place-items:center;width:100%;height:100%;border-radius:9999px;background:${m.color ?? '#009e60'};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);font-size:${Math.round(s * 0.45)}px;line-height:1">${m.glyph ?? ''}</div>
    </div>`,
  })
}

function Fit({ points, center, zoom }: { points: LatLng[]; center?: LatLng; zoom?: number }) {
  const map = useMap()
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|')
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng], zoom ?? map.getZoom())
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 })
    else if (points.length === 1) map.setView([points[0]!.lat, points[0]!.lng], zoom ?? 15)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, center?.lat, center?.lng])
  return null
}

export default function MapView({
  markers, center, zoom = 13, className = 'h-72', route, fit = true,
}: { markers: MapMarker[]; center?: LatLng; zoom?: number; className?: string; route?: LatLng[]; fit?: boolean }) {
  const start = center ?? markers[0]?.position ?? { lat: 5.3364, lng: -4.0267 }
  return (
    <div className={className}>
      <MapContainer center={[start.lat, start.lng]} zoom={zoom} scrollWheelZoom className="h-full w-full">
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {route && route.length > 1 && <Polyline positions={route.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#f77f00', weight: 4, dashArray: '8 8' }} />}
        {markers.map((m) => (
          <Marker key={m.id} position={[m.position.lat, m.position.lng]} icon={icon(m)} eventHandlers={m.onClick ? { click: m.onClick } : undefined}>
            {m.popup && <Popup>{m.popup}</Popup>}
          </Marker>
        ))}
        {fit && <Fit points={markers.map((m) => m.position)} center={center} zoom={center ? zoom : undefined} />}
      </MapContainer>
    </div>
  )
}
