import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Info, List, Map as MapIcon, ShoppingBag, Siren } from 'lucide-react'
import { usePharmacies, type PharmacyView } from '../../lib/usePharmacies'
import { gardePeriod, isOnGarde } from '../../lib/hours'
import { PHARMACY_META } from '../../data/pharmacyMeta'
import { dateFr } from '../../lib/format'
import { formatDistance } from '../../lib/geo'
import { COMMUNES, CITIES } from '../../data/communes'
import PharmacyCard from '../../components/PharmacyCard'
import MapView, { type MapMarker } from '../../components/MapView'
import { EmptyState, Notice, OpenBadge, PageHeader, Select, cx } from '../../components/ui'
import type { OpenState } from '../../types'
import { useStore } from '../../store/useStore'

const GROUPS: { state: OpenState; emoji: string; title: string; color: string; ring: string }[] = [
  { state: 'open', emoji: '🟢', title: 'Actuellement ouvertes', color: '#009e60', ring: 'ring-emerald-200 bg-emerald-50 text-emerald-800' },
  { state: 'soon', emoji: '🟠', title: 'Ouvrant prochainement', color: '#f59e0b', ring: 'ring-amber-200 bg-amber-50 text-amber-800' },
  { state: 'closed', emoji: '🔴', title: 'Fermées', color: '#dc2626', ring: 'ring-red-200 bg-red-50 text-red-800' },
]

const LIMIT = 12

function GardeItem({ p }: { p: PharmacyView }) {
  return (
    <div className="flex flex-col gap-2">
      <PharmacyCard p={p} compact />
      <Link to="/ordonnance" className="-mt-1 flex items-center justify-center gap-1.5 rounded-xl bg-accent-50 py-2 text-sm font-semibold text-accent-600 hover:bg-accent-100">
        <ShoppingBag size={15} />Demander une mission d'achat
      </Link>
    </div>
  )
}

export default function Garde() {
  const all = usePharmacies()
  const position = useStore((s) => s.user.position)
  const [city, setCity] = useState('')
  const [commune, setCommune] = useState('')
  const [view, setView] = useState<'liste' | 'carte'>('liste')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  // Tour de garde officiel du mois : semaines à venir consultables à l'avance.
  const [week, setWeek] = useState('')
  const [now] = useState(() => new Date())
  const weeks = useMemo(() => (PHARMACY_META.gardes ?? []).filter((w) => new Date(w.end) > now), [now])
  const future = useMemo(() => weeks.find((w) => w.start === week && new Date(w.start) > now), [weeks, week, now])
  const { start, end } = future ? { start: new Date(future.start), end: new Date(future.end) } : gardePeriod(now)

  const filtered = useMemo(
    () => all.filter((p) => (!city || p.city === city) && (!commune || p.commune === commune)),
    [all, city, commune],
  )
  // Toutes les villes du tour de garde (le document officiel couvre une trentaine de villes).
  const cities = useMemo(
    () => [...new Set([...CITIES, ...all.filter((p) => p.gardes?.length || p.garde).map((p) => p.city)])].sort((a, b) => a.localeCompare(b, 'fr')),
    [all],
  )
  const planned = useMemo(() => {
    if (!future) return []
    const at = new Date(new Date(future.start).getTime() + 3600000)
    const detail = `Garde du ${dateFr(future.start, { weekday: 'long', day: 'numeric', month: 'long' })} au ${dateFr(future.end, { weekday: 'long', day: 'numeric', month: 'long' })}`
    return filtered.filter((p) => isOnGarde(p, at)).map((p) => ({ ...p, onGarde: true, open: { state: 'open' as const, label: 'De garde', detail } }))
  }, [filtered, future])
  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        items: filtered
          .filter((p) => p.open.state === g.state)
          .sort((a, b) => Number(b.onGarde) - Number(a.onGarde) || a.km - b.km),
      })),
    [filtered],
  )
  const gardeCount = future ? planned.length : filtered.filter((p) => p.onGarde).length

  const markers: MapMarker[] = useMemo(
    () => [
      { id: 'me', position, color: '#0f1f1a', glyph: '🧍', size: 28, pulse: true, popup: <b>Vous</b> },
      ...(future ? planned : filtered).map((p) => ({
        id: p.id,
        position: p.position,
        color: GROUPS.find((g) => g.state === p.open.state)!.color,
        glyph: p.onGarde ? '🚨' : '',
        size: p.onGarde ? 32 : 18,
        popup: (
          <div className="min-w-40">
            <p className="font-bold">{p.name}</p>
            <p className="text-xs text-slate-500">{p.commune} · {formatDistance(p.km)}</p>
            <div className="my-1"><OpenBadge state={p.open.state} label={p.open.label} /></div>
            <Link to={`/pharmacies/${p.id}`} className="text-sm font-semibold text-brand-600">Voir la fiche →</Link>
          </div>
        ),
      })),
    ],
    [filtered, planned, future, position],
  )

  return (
    <div>
      <PageHeader title="PHARMA GARDE" subtitle="Pharmacies de garde et ouvertes près de vous" icon={<Siren />} />

      <div className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 to-red-700 p-5 text-white shadow-lg shadow-red-600/20">
        <p className="flex items-center gap-2 text-sm font-semibold text-white/80"><CalendarDays size={16} />{future ? 'Tour de garde à venir' : 'Tour de garde en cours'}</p>
        <p className="mt-1 text-lg font-extrabold sm:text-2xl">
          Du samedi {dateFr(start.toISOString(), { day: 'numeric', month: 'long' })} au samedi {dateFr(end.toISOString(), { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <p className="mt-2 text-sm text-white/85"><strong className="text-white">{gardeCount}</strong> pharmacie{gardeCount > 1 ? 's' : ''} de garde{commune ? ` à ${commune}` : city ? ` à ${city}` : ''} · ouvertes 24h/24 pendant la semaine</p>
        {weeks.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Semaine de garde">
            {weeks.map((w, i) => {
              const active = future ? future.start === w.start : i === 0
              return (
                <button key={w.start} role="tab" aria-selected={active} onClick={() => { setWeek(i === 0 ? '' : w.start); setExpanded({}) }} className={cx('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold', active ? 'bg-white text-red-700' : 'bg-white/15 text-white hover:bg-white/25')}>
                  {i === 0 ? 'Cette semaine' : `Sam. ${dateFr(w.start, { day: 'numeric', month: 'short' })}`}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:items-end">
        <Select value={city} onChange={(e) => { setCity(e.target.value); setCommune('') }} className="sm:w-48" aria-label="Ville">
          <option value="">Toutes les villes</option>
          {cities.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select value={commune} onChange={(e) => setCommune(e.target.value)} className="sm:w-48" aria-label="Commune">
          <option value="">Toutes les communes</option>
          {COMMUNES.filter((c) => !city || c.city === city).map((c) => <option key={c.name}>{c.name}</option>)}
        </Select>
        <div className="col-span-2 flex rounded-xl bg-slate-100 p-1 sm:ml-auto">
          {(['liste', 'carte'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cx('flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold', view === v ? 'bg-white text-ink shadow-sm' : 'text-slate-500')}>
              {v === 'liste' ? <List size={15} /> : <MapIcon size={15} />}{v === 'liste' ? 'Liste' : 'Carte'}
            </button>
          ))}
        </div>
      </div>

      {!future && (
        <div className="mb-5 grid grid-cols-3 gap-2">
          {groups.map((g) => (
            <a key={g.state} href={`#groupe-${g.state}`} onClick={() => setView('liste')} className={cx('rounded-2xl px-3 py-3 text-center ring-1', g.ring)}>
              <p className="text-2xl font-extrabold tabular-nums">{g.items.length}</p>
              <p className="text-xs font-semibold leading-tight">{g.emoji} {g.title}</p>
            </a>
          ))}
        </div>
      )}

      {view === 'carte' ? null : future && (
        <section className="mb-7">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
            🚨 De garde cette semaine-là
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600">{planned.length}</span>
          </h2>
          {planned.length === 0 ? (
            <EmptyState icon={<Siren />} title="Aucune pharmacie de garde prévue ici cette semaine-là" />
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(expanded.planned ? planned : planned.slice(0, LIMIT)).map((p) => <GardeItem key={p.id} p={p} />)}
              </div>
              {planned.length > LIMIT && (
                <button onClick={() => setExpanded((e) => ({ ...e, planned: !e.planned }))} className="mt-3 w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                  {expanded.planned ? 'Réduire' : `Afficher les ${planned.length - LIMIT} autres`}
                </button>
              )}
            </>
          )}
        </section>
      )}

      {future && view === 'liste' ? null : view === 'carte' ? (
        <div className="mb-5">
          <MapView markers={markers} className="h-[60vh] min-h-80 overflow-hidden rounded-2xl border border-slate-200" />
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
            {GROUPS.map((g) => <span key={g.state} className="flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ background: g.color }} />{g.title}</span>)}
            <span>🚨 De garde</span>
          </div>
        </div>
      ) : (
        groups.map((g) => {
          const open = expanded[g.state]
          return (
            <section key={g.state} id={`groupe-${g.state}`} className="mb-7 scroll-mt-24">
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
                {g.emoji} {g.title}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600">{g.items.length}</span>
              </h2>
              {g.items.length === 0 ? (
                <EmptyState icon={<Siren />} title="Aucune pharmacie dans cette catégorie" />
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {(open ? g.items : g.items.slice(0, LIMIT)).map((p) => <GardeItem key={p.id} p={p} />)}
                  </div>
                  {g.items.length > LIMIT && (
                    <button onClick={() => setExpanded((e) => ({ ...e, [g.state]: !open }))} className="mt-3 w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                      {open ? 'Réduire' : `Afficher les ${g.items.length - LIMIT} autres`}
                    </button>
                  )}
                </>
              )}
            </section>
          )
        })
      )}

      <Notice tone="orange" icon={<Info size={16} />}>
        <p>Le tour de garde change <strong>chaque semaine, du samedi au samedi</strong>. Les pharmacies de garde restent ouvertes jour et nuit pendant leur semaine.</p>
        {weeks.length > 1 && <p className="mt-1">Le programme officiel du mois est chargé : choisissez une semaine en haut de la page pour voir les pharmacies de garde à venir.</p>}
        <p className="mt-1">Ces informations doivent être confirmées auprès des sources officielles (appel à la pharmacie, Ordre des pharmaciens). Elles sont synchronisées automatiquement depuis des sources publiques.</p>
      </Notice>
    </div>
  )
}
