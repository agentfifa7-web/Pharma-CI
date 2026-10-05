import { useMemo, useState } from 'react'
import { Clock, Crosshair, Hospital, MapPin, Navigation, Phone } from 'lucide-react'
import type { HealthPlace } from '../../types'
import { EMERGENCY_NUMBERS, HEALTH_KIND, HEALTH_PLACES } from '../../data/health'
import { useStore } from '../../store/useStore'
import { useLocate } from '../../lib/usePharmacies'
import { directionsUrl, distanceKm, formatDistance } from '../../lib/geo'
import MapView, { type MapMarker } from '../../components/MapView'
import { Badge, Button, Chips, Notice, PageHeader } from '../../components/ui'

type Kind = HealthPlace['kind'] | 'tous'

export default function HealthServices() {
  const [kind, setKind] = useState<Kind>('tous')
  const position = useStore((s) => s.user.position)
  const { locate, loading } = useLocate()

  const places = useMemo(
    () => HEALTH_PLACES
      .filter((p) => kind === 'tous' || p.kind === kind)
      .map((p) => ({ ...p, km: distanceKm(position, p.position) }))
      .sort((a, b) => a.km - b.km),
    [kind, position],
  )

  const markers: MapMarker[] = [
    { id: 'me', position, color: '#0f1f1a', glyph: '📍', size: 26, pulse: true, popup: 'Vous êtes ici' },
    ...places.slice(0, 15).map((p) => ({
      id: p.id, position: p.position, color: HEALTH_KIND[p.kind].color, glyph: HEALTH_KIND[p.kind].emoji,
      popup: <div><b>{p.name}</b><br />{p.commune} · {formatDistance(p.km)}</div>,
    })),
  ]

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Autres services de santé"
        subtitle="Laboratoires, cliniques, centres de santé, urgences, médecins"
        icon={<Hospital size={22} />}
        action={<Button variant="outline" size="sm" onClick={locate} disabled={loading}><Crosshair size={15} /><span className="hidden sm:inline">{loading ? 'Localisation…' : 'Me localiser'}</span></Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {EMERGENCY_NUMBERS.slice(0, 2).map((e) => (
          <a key={e.number} href={`tel:${e.number}`} className="flex items-center gap-2 rounded-2xl bg-red-600 px-3 py-2.5 text-white shadow-sm hover:bg-red-700">
            <span className="text-xl">{e.emoji}</span>
            <span className="min-w-0"><span className="block text-lg font-extrabold leading-none">{e.number}</span><span className="text-xs text-white/85">{e.label}</span></span>
          </a>
        ))}
      </div>

      <Chips
        value={kind}
        onChange={setKind}
        options={[
          { value: 'tous', label: 'Tous' },
          ...(Object.keys(HEALTH_KIND) as HealthPlace['kind'][]).map((k) => ({ value: k as Kind, label: `${HEALTH_KIND[k].emoji} ${HEALTH_KIND[k].plural}` })),
        ]}
      />

      <MapView markers={markers} className="mt-3 h-64 sm:h-80" />

      <div className="mt-4 space-y-3">
        {places.map((p) => (
          <div key={p.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl" style={{ background: `${HEALTH_KIND[p.kind].color}18` }}>{HEALTH_KIND[p.kind].emoji}</div>
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-tight">{p.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500"><MapPin size={13} className="shrink-0" />{p.commune}, {p.city} · {formatDistance(p.km)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="slate">{HEALTH_KIND[p.kind].label}</Badge>
                  {p.open24h && <Badge tone="green"><Clock size={12} />24h/24</Badge>}
                  {p.services.map((s) => <Badge key={s} tone="blue">{s}</Badge>)}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={`tel:${p.phone.replace(/\s/g, '')}`} className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-50 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"><Phone size={15} />Appeler</a>
              <a href={directionsUrl(p.position)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"><Navigation size={15} />Itinéraire</a>
            </div>
          </div>
        ))}
      </div>

      <Notice tone="orange" className="mt-5">
        Lieux <b>fictifs de démonstration</b> (noms, téléphones et positions d'exemple). En production, cet annuaire sera alimenté par des données vérifiées. En cas d'urgence vitale, composez le <b>185</b>.
      </Notice>
    </div>
  )
}
