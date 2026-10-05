import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crosshair, Layers, Map as MapIcon } from 'lucide-react'
import { usePharmacies, useLocate } from '../../lib/usePharmacies'
import { formatDistance } from '../../lib/geo'
import { HEALTH_PLACES } from '../../data/health'
import { VEHICLE_LABEL } from '../../data/agents'
import { MISSION_LABEL, useStore } from '../../store/useStore'
import MapView, { type MapMarker } from '../../components/MapView'
import { Notice, OpenBadge, PageHeader, cx } from '../../components/ui'
import type { LatLng } from '../../types'

type LayerKey = 'pharmacies' | 'garde' | 'centres' | 'labos' | 'agents' | 'missions'

const LAYERS: { k: LayerKey; emoji: string; label: string; color: string }[] = [
  { k: 'pharmacies', emoji: '🟢', label: 'Pharmacies', color: '#009e60' },
  { k: 'garde', emoji: '🔴', label: 'Pharmacies de garde', color: '#dc2626' },
  { k: 'centres', emoji: '🏥', label: 'Centres de santé', color: '#7c3aed' },
  { k: 'labos', emoji: '🧪', label: 'Laboratoires', color: '#0284c7' },
  { k: 'agents', emoji: '🚚', label: 'Agents disponibles', color: '#f77f00' },
  { k: 'missions', emoji: '📍', label: 'Missions en cours', color: '#0f1f1a' },
]

export default function PharmaMap() {
  const pharmacies = usePharmacies()
  const agents = useStore((s) => s.agents)
  const missions = useStore((s) => s.missions)
  const position = useStore((s) => s.user.position)
  const { locate, loading } = useLocate()
  const [on, setOn] = useState<Record<LayerKey, boolean>>({ pharmacies: true, garde: true, centres: true, labos: true, agents: true, missions: true })
  const [center, setCenter] = useState<LatLng | undefined>()

  const data = useMemo(() => {
    const garde = pharmacies.filter((p) => p.onGarde)
    const regular = pharmacies.filter((p) => !p.onGarde)
    const centres = HEALTH_PLACES.filter((h) => h.kind !== 'laboratoire')
    const labos = HEALTH_PLACES.filter((h) => h.kind === 'laboratoire')
    const avail = agents.filter((a) => a.available)
    const active = missions.filter((m) => m.status !== 'livree' && m.status !== 'annulee')
    return { garde, regular, centres, labos, avail, active }
  }, [pharmacies, agents, missions])

  const counts: Record<LayerKey, number> = {
    pharmacies: data.regular.length,
    garde: data.garde.length,
    centres: data.centres.length,
    labos: data.labos.length,
    agents: data.avail.length,
    missions: data.active.length,
  }

  const markers = useMemo(() => {
    const list: MapMarker[] = [{ id: 'me', position, color: '#0f1f1a', glyph: '🧍', size: 30, pulse: true, popup: <b>Vous êtes ici</b> }]
    const pharmacyPopup = (p: (typeof pharmacies)[number]) => (
      <div className="min-w-40">
        <p className="font-bold">{p.name}</p>
        <p className="text-xs text-slate-500">{p.commune} · {formatDistance(p.km)}</p>
        <div className="my-1"><OpenBadge state={p.open.state} label={p.open.label} /></div>
        <Link to={`/pharmacies/${p.id}`} className="text-sm font-semibold text-brand-600">Voir la fiche →</Link>
      </div>
    )
    if (on.pharmacies) data.regular.forEach((p) => list.push({ id: p.id, position: p.position, color: '#009e60', glyph: '✚', size: 22, popup: pharmacyPopup(p) }))
    if (on.garde) data.garde.forEach((p) => list.push({ id: p.id, position: p.position, color: '#dc2626', glyph: '🚨', size: 32, popup: pharmacyPopup(p) }))
    const place = (h: (typeof HEALTH_PLACES)[number], color: string, glyph: string) =>
      list.push({
        id: h.id, position: h.position, color, glyph, size: 26,
        popup: (
          <div className="min-w-40">
            <p className="font-bold">{h.name}</p>
            <p className="text-xs text-slate-500">{h.commune} · {h.open24h ? 'Ouvert 24h/24' : 'Horaires variables'}</p>
            <a href={`tel:${h.phone.replace(/\s/g, '')}`} className="text-sm font-semibold text-brand-600">📞 {h.phone}</a>
          </div>
        ),
      })
    if (on.centres) data.centres.forEach((h) => place(h, '#7c3aed', '🏥'))
    if (on.labos) data.labos.forEach((h) => place(h, '#0284c7', '🧪'))
    if (on.agents)
      data.avail.forEach((a) =>
        list.push({
          id: `ag-${a.id}`, position: a.position, color: '#f77f00', glyph: '🛵', size: 30,
          popup: <div><p className="font-bold">Agent {a.name.split(' ')[0]}</p><p className="text-xs text-slate-500">{VEHICLE_LABEL[a.vehicle]} · zone {a.zone} · {a.activeMissions} mission(s)</p></div>,
        }),
      )
    if (on.missions)
      data.active.forEach((m) => {
        list.push({
          id: `mi-${m.id}`, position: m.deliveryPosition, color: '#0f1f1a', glyph: '📍', size: 30, pulse: m.status === 'en_route',
          popup: <div><p className="font-bold">{m.id}</p><p className="text-xs text-slate-500">{MISSION_LABEL[m.status]}</p><Link to={`/missions/${m.id}`} className="text-sm font-semibold text-brand-600">Suivre →</Link></div>,
        })
        if (m.agentPosition && m.status !== 'payee')
          list.push({ id: `mia-${m.id}`, position: m.agentPosition, color: '#f77f00', glyph: '🛵', size: 30, pulse: true, popup: <b>Agent en mission {m.id}</b> })
      })
    return list
  }, [data, on, position])

  return (
    <div>
      <PageHeader title="PHARMA MAP" subtitle="Pharmacies, gardes, santé et missions sur une seule carte" icon={<MapIcon />} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-400"><Layers size={14} />Couches</span>
        {LAYERS.map((l) => (
          <button
            key={l.k}
            onClick={() => setOn((s) => ({ ...s, [l.k]: !s[l.k] }))}
            aria-pressed={on[l.k]}
            className={cx('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition', on[l.k] ? 'bg-white text-ink shadow-sm ring-2' : 'bg-slate-100 text-slate-400 line-through ring-0')}
            style={on[l.k] ? { ['--tw-ring-color' as string]: l.color } : undefined}
          >
            <span aria-hidden>{l.emoji}</span>{l.label}
            <span className={cx('rounded-full px-1.5 text-xs tabular-nums', on[l.k] ? 'bg-slate-100 text-slate-600' : 'bg-slate-200')}>{counts[l.k]}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <MapView markers={markers} center={center} zoom={14} className="h-[calc(100dvh-19rem)] min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 shadow-sm" />
        <button
          onClick={() => { locate(); setCenter({ ...position }) }}
          className="absolute right-3 bottom-3 z-[500] flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-lg ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <Crosshair size={16} className="text-brand-600" />{loading ? 'Localisation…' : 'Centrer sur moi'}
        </button>
        <div className="absolute top-3 right-3 z-[500] hidden rounded-2xl bg-white/95 p-3 text-xs shadow-lg ring-1 ring-slate-200 sm:block">
          <p className="mb-1.5 font-bold">Légende</p>
          {LAYERS.map((l) => (
            <p key={l.k} className={cx('flex items-center gap-2 py-0.5', !on[l.k] && 'opacity-40')}>
              <span className="h-3 w-3 rounded-full ring-2 ring-white" style={{ background: l.color }} />{l.label}
            </p>
          ))}
        </div>
      </div>

      <Notice tone="blue" className="mt-4">
        Données de démonstration. Seules vos propres missions apparaissent sur la carte ; les agents sont affichés sans information personnelle.
      </Notice>
    </div>
  )
}
