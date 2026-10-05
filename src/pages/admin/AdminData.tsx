import { useMemo } from 'react'
import { BarChart3, Clock, Lock, Map as MapIcon, Pill, Truck } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { COMMUNES } from '../../data/communes'
import { PHARMACIES } from '../../data/pharmacies'
import { medById } from '../../data/medications'
import { distanceKm } from '../../lib/geo'
import MapView, { type MapMarker } from '../../components/MapView'
import { Notice, PageHeader, Stat, cx } from '../../components/ui'
import type { LatLng } from '../../types'
import { BarList, DataTable, Panel, Td } from './adminKit'

/** Seuils de couverture (pharmacies pour 100 000 habitants) — paramètres de pilotage PHARMA CI. */
const LOW = 0.8
const GOOD = 2

const LEVEL = {
  faible: { label: 'Faible', icon: '🟥', color: '#dc2626', text: 'text-red-700', bg: 'bg-red-50' },
  moyenne: { label: 'Moyenne', icon: '🟧', color: '#f59e0b', text: 'text-amber-700', bg: 'bg-amber-50' },
  bonne: { label: 'Bonne', icon: '🟩', color: '#009e60', text: 'text-emerald-700', bg: 'bg-emerald-50' },
} as const
type Level = keyof typeof LEVEL

const levelOf = (v: number): Level => (v < LOW ? 'faible' : v < GOOD ? 'moyenne' : 'bonne')

const nearestCommune = (p: LatLng) =>
  COMMUNES.reduce((best, c) => (distanceKm(c.center, p) < distanceKm(best.center, p) ? c : best), COMMUNES[0]!).name

const MIN_GROUP = 1 // en production : k-anonymat (ex. ne publier que les groupes ≥ 10)

export default function AdminData() {
  const missions = useStore((s) => s.missions)
  const prescriptions = useStore((s) => s.prescriptions)

  const agg = useMemo(() => {
    const count = (keys: string[]) => {
      const m = new Map<string, number>()
      keys.forEach((k) => m.set(k, (m.get(k) ?? 0) + 1))
      return [...m.entries()].filter(([, v]) => v >= MIN_GROUP).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
    }
    const byCommune = count(missions.map((m) => nearestCommune(m.deliveryPosition)))

    const medMap = new Map<string, number>()
    prescriptions.forEach((p) => p.lines.forEach((l) => {
      const k = medById(l.medicationId)?.brand ?? l.label.trim()
      if (k) medMap.set(k, (medMap.get(k) ?? 0) + Math.max(1, l.quantity))
    }))
    const meds = [...medMap.entries()].map(([label, value]) => ({ label, value, display: `${value} boîte(s)` })).sort((a, b) => b.value - a.value).slice(0, 10)

    const durations = missions
      .filter((m) => m.status === 'livree')
      .map((m) => {
        const a = m.timeline.find((t) => t.status === 'payee')?.at ?? m.createdAt
        const b = m.timeline.find((t) => t.status === 'livree')?.at
        return b ? (new Date(b).getTime() - new Date(a).getTime()) / 60000 : undefined
      })
      .filter((x): x is number => x !== undefined)
    const avgDelivery = durations.length ? durations.reduce((s, x) => s + x, 0) / durations.length : undefined

    const pharmacies = count(missions.filter((m) => m.pharmacyId).map((m) => PHARMACIES.find((p) => p.id === m.pharmacyId)?.name ?? m.invoice?.pharmacyName ?? '—')).slice(0, 8)

    return { byCommune, meds, avgDelivery, nDelivered: durations.length, pharmacies }
  }, [missions, prescriptions])

  const coverage = useMemo(
    () =>
      COMMUNES.filter((c) => c.population > 0).map((c) => {
        const n = PHARMACIES.filter((p) => p.commune === c.name).length
        const per100k = (n / c.population) * 100000
        return { ...c, n, per100k, level: levelOf(per100k) }
      }).sort((a, b) => a.per100k - b.per100k),
    [],
  )
  const hasPopulation = coverage.length > 0
  const maxCov = Math.max(0.01, ...coverage.map((c) => Math.min(c.per100k, 5)))
  /** Pharmacies référencées par commune (données réelles, sans population). */
  const pharmaciesByCommune = useMemo(() => {
    const m = new Map<string, number>()
    PHARMACIES.forEach((p) => m.set(p.commune || '—', (m.get(p.commune || '—') ?? 0) + 1))
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [])
  const levelCounts = (['faible', 'moyenne', 'bonne'] as Level[]).map((l) => ({ l, n: coverage.filter((c) => c.level === l).length }))

  const markers: MapMarker[] = coverage.map((c) => ({
    id: c.name,
    position: c.center,
    color: LEVEL[c.level].color,
    size: Math.round(18 + Math.min(26, Math.sqrt(c.population / 10000) * 2.6)),
    glyph: '',
    popup: (
      <div>
        <p className="font-bold">{c.name}</p>
        <p className="text-xs">{c.n} pharmacie(s) · {c.population.toLocaleString('fr-FR')} hab.</p>
        <p className="text-xs font-semibold">{LEVEL[c.level].icon} {c.per100k.toFixed(2).replace('.', ',')} / 100 000 hab. — couverture {LEVEL[c.level].label.toLowerCase()}</p>
      </div>
    ),
  }))

  return (
    <div>
      <PageHeader title="PHARMA DATA" subtitle="Statistiques anonymisées et agrégées — pilotage & santé publique" icon={<BarChart3 />} />

      <Notice tone="red" icon={<Lock size={16} />} className="mb-5">
        <strong>Jamais de commercialisation des données personnelles ou médicales individuelles.</strong> Seules des statistiques agrégées et anonymisées sont produites ici ; aucune donnée ne permet d'identifier un patient.
      </Notice>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Missions" value={missions.length} icon={<Truck size={20} />} />
        <Stat label="Ordonnances" value={prescriptions.length} icon={<Pill size={20} />} tone="slate" />
        <Stat
          label="Temps moyen de livraison"
          value={agg.avgDelivery === undefined ? '—' : agg.avgDelivery < 90 ? `${Math.round(agg.avgDelivery)} min` : `${(agg.avgDelivery / 60).toFixed(1).replace('.', ',')} h`}
          hint={agg.nDelivered ? `paiement → livraison · ${agg.nDelivered} mission(s)` : 'aucune mission livrée'}
          icon={<Clock size={20} />}
          tone="accent"
        />
        <Stat
          label="Zones sous-desservies"
          value={hasPopulation ? levelCounts[0]!.n : '—'}
          hint={hasPopulation ? `sur ${coverage.length} communes` : 'populations officielles à importer'}
          icon={<MapIcon size={20} />}
          tone="red"
        />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Panel title="Missions par commune"><BarList data={agg.byCommune} empty="Aucune mission pour le moment." /></Panel>
        <Panel title="Médicaments les plus demandés"><BarList data={agg.meds} empty="Aucune ordonnance analysée." /></Panel>
        <Panel title="Pharmacies les plus utilisées"><BarList data={agg.pharmacies} empty="Aucun achat en pharmacie pour le moment." /></Panel>
      </div>

      <h2 className="mb-1 text-base font-bold">Cartographie des zones sous-desservies</h2>
      {!hasPopulation ? (
        <div className="mb-5 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <Notice tone="blue" icon={<MapIcon size={16} />}>
            <p className="font-bold">Populations officielles (RGPH/INS) à importer pour calculer la couverture</p>
            <p className="mt-1">
              La couverture (pharmacies pour 100 000 habitants) exige la population de chaque commune. Aucune population n'est encore importée :
              aucun indicateur n'est calculé pour éviter des chiffres inexacts. Renseignez les populations issues du dernier recensement (RGPH, Institut national de la statistique)
              dans <code className="rounded bg-white/60 px-1">src/data/communes.ts</code>.
            </p>
          </Notice>
          <Panel title={`Pharmacies référencées par commune (${PHARMACIES.length})`}>
            <BarList data={pharmaciesByCommune.slice(0, 15)} empty="Annuaire des pharmacies non chargé." />
          </Panel>
        </div>
      ) : (
        <>
      <p className="mb-3 text-sm text-slate-500">
        Pharmacies pour 100 000 habitants : {LEVEL.faible.icon} faible (&lt; {String(LOW).replace('.', ',')}) · {LEVEL.moyenne.icon} moyenne ({String(LOW).replace('.', ',')}–{GOOD}) · {LEVEL.bonne.icon} bonne (≥ {GOOD}).
      </p>

      <div className="mb-3 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <Panel title="Couverture par commune (de la plus faible à la meilleure)">
          <ul className="space-y-2">
            {coverage.map((c) => {
              const L = LEVEL[c.level]
              return (
                <li key={c.name} title={`${c.name} : ${c.n} pharmacie(s) pour ${c.population.toLocaleString('fr-FR')} habitants`}>
                  <div className="mb-0.5 flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">{c.name} <span className="text-xs text-slate-400">· {c.city}</span></span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-semibold tabular-nums">{c.per100k.toFixed(2).replace('.', ',')}</span>
                      <span className={cx('rounded-full px-1.5 text-[11px] font-semibold', L.bg, L.text)}>{L.icon} {L.label}</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full" style={{ width: `${Math.max(2, (Math.min(c.per100k, 5) / maxCov) * 100)}%`, background: L.color }} />
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-slate-400">Échelle plafonnée à 5 / 100 000 pour la lisibilité (Plateau : forte densité, faible population résidente).</p>
        </Panel>
        <Panel title="Carte de couverture" action={<span className="flex gap-2 text-xs">{levelCounts.map(({ l, n }) => <span key={l}>{LEVEL[l].icon} {n}</span>)}</span>}>
          <MapView markers={markers} zoom={7} className="h-[420px] overflow-hidden rounded-xl" />
          <p className="mt-2 text-xs text-slate-500">Taille du cercle ∝ population · couleur = niveau de couverture.</p>
        </Panel>
      </div>

      <details className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <summary className="cursor-pointer font-semibold">Voir les données en tableau</summary>
        <DataTable head={['Commune', 'Ville', 'Pharmacies', 'Population (officielle)', 'Pour 100 000 hab.', 'Couverture']} className="mt-3 border-0 shadow-none">
          {coverage.map((c) => (
            <tr key={c.name}>
              <Td>{c.name}</Td><Td>{c.city}</Td><Td className="tabular-nums">{c.n}</Td>
              <Td className="tabular-nums">{c.population.toLocaleString('fr-FR')}</Td>
              <Td className="tabular-nums">{c.per100k.toFixed(2).replace('.', ',')}</Td>
              <Td>{LEVEL[c.level].icon} {LEVEL[c.level].label}</Td>
            </tr>
          ))}
        </DataTable>
      </details>

        </>
      )}

      <Notice tone="orange">
        Statistiques calculées à partir des données réelles de cette application (missions, ordonnances) et de l'annuaire public des pharmacies.
        En production, les statistiques sont calculées côté serveur avec seuils d'anonymisation (k-anonymat) avant toute diffusion à des partenaires institutionnels.
      </Notice>
    </div>
  )
}
