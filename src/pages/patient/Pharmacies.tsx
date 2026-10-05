import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Crosshair, Info, List, Map as MapIcon, MapPin, Search, X } from 'lucide-react'
import { usePharmacies, useLocate, type PharmacyView } from '../../lib/usePharmacies'
import { normalize } from '../../lib/format'
import { formatDistance } from '../../lib/geo'
import { COMMUNES, CITIES } from '../../data/communes'
import { PHARMACY_SOURCE } from '../../services/pharmacyProvider'
import PharmacyCard from '../../components/PharmacyCard'
import MapView, { type MapMarker } from '../../components/MapView'
import { Button, EmptyState, Notice, OpenBadge, PageHeader, Select, cx } from '../../components/ui'
import { useStore } from '../../store/useStore'

type Flag = 'near' | 'open' | 'garde' | 'cmu' | 'delivery'

const FLAGS: { k: Flag; label: string }[] = [
  { k: 'near', label: '📍 Près de moi' },
  { k: 'open', label: '🟢 Ouverte maintenant' },
  { k: 'garde', label: '🚨 De garde' },
  { k: 'cmu', label: '🛡️ CMU vérifiée' },
  { k: 'delivery', label: '🚚 Livraison PHARMA CI' },
]

const OPEN_COLOR = { open: '#009e60', soon: '#f59e0b', closed: '#dc2626' } as const

const PLACES = [
  ...COMMUNES.map((c) => ({ key: normalize(c.name), commune: c.name, city: c.city })),
  ...CITIES.map((c) => ({ key: normalize(c), commune: '', city: c })),
].sort((a, b) => b.key.length - a.key.length)

const STOP = /\b(pharmacies?|pharmacie|a|au|aux|de|du|des|la|le|les|dans|sur|en|pres|moi|proche|maintenant|ouvertes?|ouvert|garde|cmu|livraison|qui|est|sont)\b/g

/** Analyse une requête en langage naturel : « pharmacie de garde à Cocody », « ouverte maintenant »… */
function parseQuery(raw: string) {
  let text = normalize(raw).replace(/[-']/g, ' ')
  let commune = ''
  let city = ''
  for (const p of PLACES) {
    const key = p.key.replace(/[-']/g, ' ')
    const re = new RegExp(`\\b${key}\\b`)
    if (re.test(text)) {
      if (p.commune) commune = p.commune
      else city = p.city
      text = text.replace(re, ' ')
      break
    }
  }
  const garde = /\bgarde\b/.test(text)
  const open = /\bouvert/.test(text)
  const near = /pres de moi|proche/.test(text)
  const cmu = /\bcmu\b/.test(text)
  const delivery = /livraison/.test(text)
  const rest = text.replace(STOP, ' ').replace(/\s+/g, ' ').trim()
  return { commune, city, garde, open, near, cmu, delivery, rest }
}

const PAGE = 20

export default function Pharmacies() {
  const all = usePharmacies()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [flags, setFlags] = useState<Set<Flag>>(new Set())
  const [commune, setCommune] = useState('')
  const [city, setCity] = useState('')
  const [view, setView] = useState<'liste' | 'carte'>('liste')
  const [limit, setLimit] = useState(PAGE)
  const { locate, loading } = useLocate()
  const position = useStore((s) => s.user.position)
  const granted = useStore((s) => s.locationGranted)

  const parsed = useMemo(() => parseQuery(q), [q])

  const toggle = (k: Flag) => {
    if (k === 'near' && !flags.has('near')) locate()
    setFlags((f) => { const n = new Set(f); if (n.has(k)) n.delete(k); else n.add(k); return n })
    setLimit(PAGE)
  }

  const results = useMemo(() => {
    const c = commune || parsed.commune
    const ci = city || parsed.city
    const words = parsed.rest ? parsed.rest.split(' ') : []
    let list: PharmacyView[] = all.filter((p) => {
      if (c && p.commune !== c) return false
      if (ci && p.city !== ci) return false
      if ((flags.has('open') || parsed.open) && p.open.state !== 'open') return false
      if ((flags.has('garde') || parsed.garde) && !p.onGarde) return false
      if ((flags.has('cmu') || parsed.cmu) && !p.cmuVerified) return false
      if ((flags.has('delivery') || parsed.delivery) && !p.deliveryAvailable) return false
      if (words.length) {
        const hay = normalize(`${p.name} ${p.commune} ${p.city} ${p.address}`).replace(/[-']/g, ' ')
        if (!words.every((w) => hay.includes(w))) return false
      }
      return true
    })
    if (flags.has('near') || parsed.near) list = list.filter((p) => p.km <= 5)
    return list
  }, [all, parsed, commune, city, flags])

  const detected = [
    parsed.commune && `Commune : ${parsed.commune}`,
    parsed.city && `Ville : ${parsed.city}`,
    parsed.garde && 'De garde',
    parsed.open && 'Ouverte maintenant',
    parsed.near && 'Près de moi',
  ].filter(Boolean) as string[]

  const markers: MapMarker[] = useMemo(
    () => [
      { id: 'me', position, color: '#0f1f1a', glyph: '🧍', size: 30, pulse: true, popup: <b>Vous êtes ici</b> },
      ...results.slice(0, 300).map((p) => ({
        id: p.id,
        position: p.position,
        color: OPEN_COLOR[p.open.state],
        glyph: p.onGarde ? '🚨' : '✚',
        size: 28,
        popup: (
          <div className="min-w-40">
            <p className="font-bold">{p.name}</p>
            <p className="text-xs text-slate-500">{p.address} · {formatDistance(p.km)}</p>
            <div className="my-1"><OpenBadge state={p.open.state} label={p.open.label} /></div>
            <Link to={`/pharmacies/${p.id}`} className="text-sm font-semibold text-brand-600">Voir la fiche →</Link>
          </div>
        ),
      })),
    ],
    [results, position],
  )

  const communeOptions = COMMUNES.filter((c) => !city || c.city === city)

  return (
    <div>
      <PageHeader title="Annuaire national des pharmacies" subtitle="Toutes les pharmacies de Côte d'Ivoire, au même endroit" icon={<MapPin />} />

      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10">
        <Search size={18} className="shrink-0 text-slate-400" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }}
          placeholder="Nom, commune, adresse… ou « pharmacie de garde à Cocody »"
          className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
          aria-label="Rechercher une pharmacie"
        />
        {q && <button onClick={() => setQ('')} className="rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="Effacer"><X size={16} /></button>}
      </div>

      {detected.length > 0 && (
        <p className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          Compris :{detected.map((d) => <span key={d} className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">{d}</span>)}
        </p>
      )}

      <div className="scrollbar-none -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {FLAGS.map((f) => (
          <button
            key={f.k}
            onClick={() => toggle(f.k)}
            className={cx('shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition', flags.has(f.k) ? 'bg-ink text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50')}
          >
            {f.k === 'near' && loading ? '📍 Localisation…' : f.label}
          </button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:items-end">
        <Select value={city} onChange={(e) => { setCity(e.target.value); setCommune(''); setLimit(PAGE) }} className="sm:w-48" aria-label="Ville">
          <option value="">Toutes les villes</option>
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select value={commune} onChange={(e) => { setCommune(e.target.value); setLimit(PAGE) }} className="sm:w-48" aria-label="Commune">
          <option value="">Toutes les communes</option>
          {communeOptions.map((c) => <option key={c.name}>{c.name}</option>)}
        </Select>
        <div className="col-span-2 flex rounded-xl bg-slate-100 p-1 sm:ml-auto">
          {(['liste', 'carte'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cx('flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold', view === v ? 'bg-white text-ink shadow-sm' : 'text-slate-500')}>
              {v === 'liste' ? <List size={15} /> : <MapIcon size={15} />}{v === 'liste' ? 'Liste' : 'Carte'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p><strong className="tabular-nums">{results.length}</strong> pharmacie{results.length > 1 ? 's' : ''} trouvée{results.length > 1 ? 's' : ''}
          <span className="text-slate-500"> · triées par distance{granted ? '' : ' (position approximative)'}</span>
        </p>
        {!granted && <button onClick={locate} className="flex items-center gap-1 text-sm font-semibold text-brand-600"><Crosshair size={14} />{loading ? 'Localisation…' : 'Utiliser ma position'}</button>}
      </div>

      {results.length === 0 ? (
        <EmptyState icon={<Search />} title="Aucune pharmacie ne correspond" text="Essayez une autre commune ou retirez un filtre." action={<Button variant="outline" onClick={() => { setQ(''); setFlags(new Set()); setCommune(''); setCity('') }}>Réinitialiser</Button>} />
      ) : view === 'carte' ? (
        <div>
          <MapView markers={markers} className="h-[60vh] min-h-80 overflow-hidden rounded-2xl border border-slate-200" />
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ background: OPEN_COLOR.open }} />Ouverte</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ background: OPEN_COLOR.soon }} />Ouvre bientôt</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ background: OPEN_COLOR.closed }} />Fermée</span>
            <span>🚨 De garde</span>
            {results.length > 300 && <span>· 300 premières affichées</span>}
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {results.slice(0, limit).map((p) => <PharmacyCard key={p.id} p={p} />)}
          </div>
          {limit < results.length && (
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>Afficher plus ({results.length - limit} restantes)</Button>
            </div>
          )}
        </>
      )}

      <Notice tone="blue" icon={<Info size={16} />} className="mt-6">
        Source : <strong>{PHARMACY_SOURCE}</strong>. Les horaires et tours de garde doivent être confirmés auprès des sources officielles.
        Pharmacien ? Revendiquez votre fiche depuis sa page pour la mettre à jour.
      </Notice>
    </div>
  )
}
