import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Info, MapPin, Search, ShieldCheck, Siren } from 'lucide-react'
import { PHARMACIES } from '../../data/pharmacies'
import { CITIES } from '../../data/communes'
import { PHARMACY_SOURCE } from '../../services/pharmacyProvider'
import { isOnGarde, openInfo } from '../../lib/hours'
import { normalize } from '../../lib/format'
import { Badge, Notice, OpenBadge, PageHeader, Select, Stat } from '../../components/ui'
import { BarList, DataTable, Panel, Td } from './adminKit'

export default function AdminPharmacies() {
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [limit, setLimit] = useState(30)

  const stats = useMemo(() => {
    const now = new Date()
    const byCity = CITIES.map((c) => ({ label: c, value: PHARMACIES.filter((p) => p.city === c).length })).sort((a, b) => b.value - a.value)
    const communes = [...new Set(PHARMACIES.filter((p) => p.city === 'Abidjan').map((p) => p.commune))]
    const byCommune = communes.map((c) => ({ label: c, value: PHARMACIES.filter((p) => p.commune === c).length })).sort((a, b) => b.value - a.value)
    return {
      byCity, byCommune,
      claimed: PHARMACIES.filter((p) => p.claimed).length,
      cmu: PHARMACIES.filter((p) => p.cmuVerified).length,
      garde: PHARMACIES.filter((p) => isOnGarde(p, now)).length,
      delivery: PHARMACIES.filter((p) => p.deliveryAvailable).length,
    }
  }, [])

  const list = useMemo(() => {
    const n = normalize(q)
    const now = new Date()
    return PHARMACIES.filter((p) => (!city || p.city === city) && (!n || normalize(`${p.name} ${p.commune} ${p.city} ${p.address} ${p.id}`).includes(n)))
      .map((p) => ({ ...p, open: openInfo(p, now), garde: isOnGarde(p, now) }))
  }, [q, city])

  const total = PHARMACIES.length
  const pct = (n: number) => `${Math.round((n / total) * 100)} %`

  return (
    <div>
      <PageHeader title="Pharmacies référencées" subtitle="Annuaire national — couverture et qualité des fiches" icon={<MapPin />} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Référencées" value={total} hint={`${CITIES.length} villes`} icon={<MapPin size={20} />} />
        <Stat label="Fiches revendiquées" value={stats.claimed} hint={`${pct(stats.claimed)} · ${total - stats.claimed} publiques`} icon={<BadgeCheck size={20} />} tone="slate" />
        <Stat label="CMU vérifiée" value={pct(stats.cmu)} hint={`${stats.cmu} pharmacies`} icon={<ShieldCheck size={20} />} tone="slate" />
        <Stat label="De garde cette semaine" value={stats.garde} icon={<Siren size={20} />} tone="red" />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Pharmacies par ville"><BarList data={stats.byCity} /></Panel>
        <Panel title="Pharmacies par commune — Abidjan"><BarList data={stats.byCommune} /></Panel>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
          <Search size={16} className="text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, commune, ID…)" className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none" />
        </div>
        <Select value={city} onChange={(e) => setCity(e.target.value)} className="sm:w-48" aria-label="Ville">
          <option value="">Toutes les villes</option>
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </div>
      <p className="mb-2 text-sm text-slate-500">{list.length} résultat(s)</p>

      <DataTable head={['ID', 'Pharmacie', 'Commune', 'Ville', 'Statut', 'CMU', 'Livraison', 'Fiche']}>
        {list.slice(0, limit).map((p) => (
          <tr key={p.id} className="hover:bg-slate-50">
            <Td className="font-mono text-xs">{p.id}</Td>
            <Td><Link to={`/pharmacies/${p.id}`} className="font-semibold hover:text-brand-600">{p.name}</Link></Td>
            <Td>{p.commune}</Td>
            <Td>{p.city}</Td>
            <Td><OpenBadge state={p.open.state} label={p.open.label} /></Td>
            <Td>{p.cmuVerified ? <Badge tone="green">vérifiée</Badge> : <Badge tone="orange">non vérifiée</Badge>}</Td>
            <Td>{p.deliveryAvailable ? '✅' : '—'}</Td>
            <Td>{p.claimed ? <Badge tone="green">revendiquée</Badge> : <Badge>publique</Badge>}</Td>
          </tr>
        ))}
      </DataTable>
      {limit < list.length && (
        <button onClick={() => setLimit((l) => l + 30)} className="mt-3 w-full rounded-xl bg-white py-2.5 text-sm font-semibold ring-1 ring-slate-200 hover:bg-slate-50">Afficher plus ({list.length - limit})</button>
      )}

      <Notice tone="blue" icon={<Info size={16} />} className="mt-5">
        <p>Source actuelle : <strong>{PHARMACY_SOURCE}</strong>.</p>
        <p className="mt-1">
          En production, l'annuaire est synchronisé par un service backend qui agrège les données publiques (ex. <strong>pharmacies-de-garde.ci</strong> : liste des pharmacies et tours de garde par commune),
          les normalise et les met en cache. Le frontend s'y connecte via <code className="rounded bg-white/70 px-1">VITE_PHARMACY_API_URL</code> (voir <code className="rounded bg-white/70 px-1">src/services/pharmacyProvider.ts</code>).
          Les fiches revendiquées par les pharmaciens priment sur les données publiques.
        </p>
      </Notice>
    </div>
  )
}
