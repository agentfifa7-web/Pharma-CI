import { useMemo, useState } from 'react'
import { Crosshair, ExternalLink, Hospital, MapPin, Navigation, Phone, Search } from 'lucide-react'
import type { HealthPlace } from '../../types'
import { EMERGENCY_NUMBERS, HEALTH_KIND, HEALTH_PLACES } from '../../data/health'
import { useStore } from '../../store/useStore'
import { useLocate } from '../../lib/usePharmacies'
import { distanceKm, formatDistance, pharmacyDirectionsUrl } from '../../lib/geo'
import { normalize } from '../../lib/format'
import MapView, { type MapMarker } from '../../components/MapView'
import { Badge, Button, Chips, EmptyState, Input, Notice, PageHeader } from '../../components/ui'

type Kind = HealthPlace['kind'] | 'tous'

const PAGE = 30
const MAP_LIMIT = 200
const KINDS = Object.keys(HEALTH_KIND) as HealthPlace['kind'][]

export default function HealthServices() {
  const [kind, setKind] = useState<Kind>('tous')
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)
  const position = useStore((s) => s.user.position)
  const { locate, loading } = useLocate()

  /** Index de recherche (calculé une fois) : nom, commune, ville, catégorie. */
  const indexed = useMemo(
    () => HEALTH_PLACES.map((p) => ({ p, text: normalize(`${p.name} ${p.commune} ${p.city} ${p.category ?? ''} ${p.address ?? ''}`) })),
    [],
  )

  const counts = useMemo(() => {
    const c = {} as Record<HealthPlace['kind'], number>
    for (const k of KINDS) c[k] = 0
    for (const p of HEALTH_PLACES) c[p.kind]++
    return c
  }, [])

  const places = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean)
    return indexed
      .filter(({ p, text }) => (kind === 'tous' || p.kind === kind) && terms.every((t) => text.includes(t)))
      .map(({ p }) => ({ ...p, km: distanceKm(position, p.position) }))
      .sort((a, b) => a.km - b.km)
  }, [indexed, kind, query, position])

  const markers: MapMarker[] = useMemo(
    () => [
      { id: 'me', position, color: '#0f1f1a', glyph: '📍', size: 26, pulse: true, popup: 'Vous êtes ici' },
      ...places.slice(0, MAP_LIMIT).map((p) => ({
        id: p.id, position: p.position, color: HEALTH_KIND[p.kind].color, glyph: HEALTH_KIND[p.kind].emoji, size: 26,
        popup: (
          <div>
            <b>{p.name}</b><br />
            {p.category ?? HEALTH_KIND[p.kind].label}<br />
            {p.commune} · {formatDistance(p.km)}
            {p.positionApprox && <><br /><i>Position approximative</i></>}
          </div>
        ),
      })),
    ],
    [places, position],
  )

  const changeKind = (k: Kind) => {
    setKind(k)
    setShown(PAGE)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Autres services de santé"
        subtitle="Laboratoires, cliniques, centres de santé, médecins et spécialistes"
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

      {HEALTH_PLACES.length === 0 ? (
        <EmptyState
          icon={<Hospital size={26} />}
          title="Annuaire bientôt disponible"
          text="L'annuaire des établissements sera disponible après la prochaine synchronisation."
        />
      ) : (
        <>
          <div className="relative mb-3">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              aria-label="Rechercher un établissement"
              placeholder="Nom, commune, spécialité…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShown(PAGE) }}
              className="[&_input]:pl-10"
            />
          </div>

          <Chips
            value={kind}
            onChange={changeKind}
            options={[
              { value: 'tous', label: `Tous (${HEALTH_PLACES.length})` },
              ...KINDS.filter((k) => counts[k] > 0).map((k) => ({ value: k as Kind, label: `${HEALTH_KIND[k].emoji} ${HEALTH_KIND[k].plural} (${counts[k]})` })),
            ]}
          />

          <MapView markers={markers} className="mt-3 h-64 sm:h-80" />
          <p className="mt-1 text-xs text-slate-500">
            {places.length} établissement{places.length > 1 ? 's' : ''}
            {places.length > MAP_LIMIT ? ` — carte limitée aux ${MAP_LIMIT} plus proches` : ''}.
          </p>

          {places.length === 0 ? (
            <EmptyState icon={<Search size={24} />} title="Aucun établissement trouvé" text="Modifiez la recherche ou la catégorie." />
          ) : (
            <div className="mt-4 space-y-3">
              {places.slice(0, shown).map((p) => {
                const tel = p.phone.replace(/[^\d+]/g, '')
                return (
                  <div key={p.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl" style={{ background: `${HEALTH_KIND[p.kind].color}18` }}>{HEALTH_KIND[p.kind].emoji}</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold leading-tight">{p.name}</p>
                        {p.category && <p className="mt-0.5 text-sm font-medium text-slate-600">{p.category}</p>}
                        <p className="mt-0.5 flex items-start gap-1 text-sm text-slate-500">
                          <MapPin size={13} className="mt-0.5 shrink-0" />
                          <span>{p.address ? `${p.address} · ` : ''}{p.commune}{p.city && p.city !== p.commune ? `, ${p.city}` : ''} · {formatDistance(p.km)}</span>
                        </p>
                        {p.phone && <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500"><Phone size={13} className="shrink-0" />{p.phone}</p>}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge tone="slate">{HEALTH_KIND[p.kind].label}</Badge>
                          {p.positionApprox && <Badge tone="orange">Position approximative</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className={`mt-3 grid gap-2 ${tel ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {tel && (
                        <a href={`tel:${tel}`} className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-50 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"><Phone size={15} />Appeler</a>
                      )}
                      <a href={pharmacyDirectionsUrl(p)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                        <Navigation size={15} />{p.positionApprox ? 'Rechercher l\'itinéraire' : 'Itinéraire'}
                      </a>
                    </div>
                    {p.sourceUrl && (
                      <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
                        <ExternalLink size={12} /> {p.source ? `Source : ${p.source}` : 'Voir la fiche source'}
                      </a>
                    )}
                  </div>
                )
              })}
              {shown < places.length && (
                <Button variant="outline" className="w-full" onClick={() => setShown((n) => n + PAGE)}>
                  Afficher plus ({places.length - shown} restant{places.length - shown > 1 ? 's' : ''})
                </Button>
              )}
            </div>
          )}
        </>
      )}

      <Notice tone="blue" className="mt-5">
        Annuaire issu des données publiques de <a href="https://www.pharmacies-de-garde.ci" target="_blank" rel="noreferrer" className="font-semibold underline">pharmacies-de-garde.ci</a>.
        Les positions marquées « approximatives » sont celles du centre de la commune. Vérifiez par téléphone avant de vous déplacer.
        En cas d'urgence vitale, composez le <b>185</b>.
      </Notice>
    </div>
  )
}
