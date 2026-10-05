import { useMemo, useState } from 'react'
import { Bike, Gauge, Star } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { VEHICLE_LABEL } from '../../data/agents'
import { COMMUNES } from '../../data/communes'
import { rankAgents } from '../../lib/assign'
import { distanceKm, formatDistance, travelMinutes } from '../../lib/geo'
import { fcfa } from '../../lib/format'
import { Badge, Card, Notice, PageHeader, Select, Stat, cx } from '../../components/ui'
import { DataTable, Panel, Td } from './adminKit'

const VEHICLE_EMOJI = { moto: '🏍️', voiture: '🚗', velo: '🚲', a_pied: '🚶🏾' } as const

const CRITERIA = [
  { k: 'Localisation', d: 'Position GPS actuelle de l\'agent.' },
  { k: 'Distance', d: 'Distance jusqu\'au lieu de livraison ; au-delà de 25 km, fortement pénalisée.' },
  { k: 'Disponibilité', d: 'Seuls les agents « disponibles » sont éligibles.' },
  { k: 'Charge', d: '+12 points par mission en cours ; 3 missions maximum.' },
  { k: 'Moyen de déplacement', d: 'Vitesse moyenne en ville : moto 22 km/h, voiture 18, vélo 12, à pied 4,5.' },
  { k: 'Zone', d: 'Un agent hors de sa zone reste éligible mais généralement plus lointain.' },
  { k: 'Temps estimé', d: 'Base du score (minutes), corrigée par la note qualité.' },
]

export default function AdminAgents() {
  const agents = useStore((s) => s.agents)
  const setAvailability = useStore((s) => s.setAgentAvailability)
  const [communeName, setCommuneName] = useState(COMMUNES[0]!.name)
  const commune = COMMUNES.find((c) => c.name === communeName) ?? COMMUNES[0]!

  const ranking = useMemo(() => rankAgents(agents, commune.center), [agents, commune])
  const excluded = useMemo(() => agents.filter((a) => !ranking.some((r) => r.agent.id === a.id)), [agents, ranking])

  const available = agents.filter((a) => a.available).length
  const active = agents.reduce((s, a) => s + a.activeMissions, 0)
  const rated = agents.filter((a) => a.rating > 0)
  const avgRating = rated.length ? rated.reduce((s, a) => s + a.rating, 0) / rated.length : undefined

  return (
    <div>
      <PageHeader title="Agents PHARMA CI" subtitle="Disponibilités, performances et affectation automatique" icon={<Bike />} />

      <Notice tone="orange" className="mb-5">
        <b>Comptes agents de test</b> — aucun agent réel n'est encore enregistré. Ces comptes servent uniquement à essayer le parcours de mission ;
        leurs statistiques ne reflètent que les missions effectuées dans cette application.
      </Notice>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Disponibles" value={<>{available}<span className="text-base text-slate-400">/{agents.length}</span></>} icon={<Bike size={20} />} />
        <Stat label="Missions en cours" value={active} icon={<Gauge size={20} />} tone="accent" />
        <Stat label="Note moyenne" value={avgRating === undefined ? '—' : avgRating.toFixed(2).replace('.', ',')} hint={avgRating === undefined ? 'aucune évaluation' : `${rated.length} agent(s) évalué(s)`} icon={<Star size={20} />} tone="slate" />
        <Stat label="Missions réalisées" value={agents.reduce((s, a) => s + a.completed, 0)} tone="slate" />
      </div>

      <DataTable head={['Agent', 'Zone', 'Moyen', 'Missions actives', 'Note', 'Réalisées', 'Gains', 'Disponibilité']} className="mb-6">
        {agents.map((a) => (
          <tr key={a.id} className="hover:bg-slate-50">
            <Td>
              <div className="flex items-center gap-2">
                <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white', a.available ? 'bg-brand-500' : 'bg-slate-400')}>{a.photo}</span>
                <div><p className="flex items-center gap-1.5 font-semibold whitespace-nowrap">{a.name} <Badge tone="orange">Test</Badge></p><p className="text-xs text-slate-400">{a.phone || 'Téléphone non renseigné'}</p></div>
              </div>
            </Td>
            <Td>{a.zone}</Td>
            <Td className="whitespace-nowrap">{VEHICLE_EMOJI[a.vehicle]} {VEHICLE_LABEL[a.vehicle]}</Td>
            <Td className="tabular-nums">{a.activeMissions}/3</Td>
            <Td className="tabular-nums">{a.rating > 0 ? `⭐ ${a.rating.toFixed(1)}` : '—'}</Td>
            <Td className="tabular-nums">{a.completed}</Td>
            <Td className="tabular-nums whitespace-nowrap">{fcfa(a.earnings)}</Td>
            <Td>
              <button
                onClick={() => setAvailability(a.id, !a.available)}
                role="switch"
                aria-checked={a.available}
                className={cx('flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs font-semibold transition', a.available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}
              >
                <span className={cx('relative h-5 w-9 rounded-full transition', a.available ? 'bg-brand-500' : 'bg-slate-300')}>
                  <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', a.available ? 'left-[18px]' : 'left-0.5')} />
                </span>
                {a.available ? 'Disponible' : 'Indisponible'}
              </button>
            </Td>
          </tr>
        ))}
      </DataTable>

      <Panel title="🧮 Simulateur d'affectation automatique">
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div>
            <Select label="Lieu de livraison (centre de la commune)" value={communeName} onChange={(e) => setCommuneName(e.target.value)} className="mb-4 max-w-xs">
              {COMMUNES.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.city})</option>)}
            </Select>
            {ranking.length === 0 ? (
              <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Aucun agent éligible : la mission resterait en attente et une nouvelle tentative serait programmée.</p>
            ) : (
              <ol className="space-y-2">
                {ranking.map((r, i) => (
                  <li key={r.agent.id} className={cx('flex flex-wrap items-center gap-3 rounded-xl p-3 ring-1', i === 0 ? 'bg-brand-50 ring-brand-200' : 'bg-white ring-slate-200')}>
                    <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold', i === 0 ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600')}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{r.agent.name} {i === 0 && <Badge tone="green">Affecté(e)</Badge>} {r.km > 25 && <Badge tone="red">hors zone (&gt; 25 km)</Badge>}</p>
                      <p className="text-xs text-slate-500">
                        {VEHICLE_EMOJI[r.agent.vehicle]} {VEHICLE_LABEL[r.agent.vehicle]} · zone {r.agent.zone} · {r.agent.activeMissions} mission(s){r.agent.rating > 0 ? ` · ⭐ ${r.agent.rating.toFixed(1)}` : ' · non évalué'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-right text-xs">
                      <div><p className="text-slate-400">Distance</p><p className="font-bold tabular-nums">{formatDistance(r.km)}</p></div>
                      <div><p className="text-slate-400">Temps</p><p className="font-bold tabular-nums">~{r.minutes} min</p></div>
                      <div><p className="text-slate-400">Score</p><p className="font-bold tabular-nums">{r.score.toFixed(1).replace('.', ',')}</p></div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {excluded.length > 0 && (
              <div className="mt-3 text-xs text-slate-500">
                <p className="mb-1 font-semibold">Non éligibles :</p>
                <ul className="space-y-0.5">
                  {excluded.map((a) => {
                    const km = distanceKm(a.position, commune.center)
                    return (
                      <li key={a.id}>{a.name} — {!a.available ? 'indisponible' : 'charge maximale (3 missions)'} · {formatDistance(km)} · ~{travelMinutes(km, a.vehicle)} min</li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
          <Card className="h-fit bg-slate-50 shadow-none">
            <p className="mb-2 text-sm font-bold">Critères (score le plus bas = meilleur)</p>
            <ul className="space-y-2 text-sm">
              {CRITERIA.map((c) => <li key={c.k}><span className="font-semibold">{c.k}</span><span className="block text-xs text-slate-500">{c.d}</span></li>)}
            </ul>
            <p className="mt-3 rounded-lg bg-white p-2 font-mono text-[11px] text-slate-600 ring-1 ring-slate-200">score = minutes + 12 × missions − 10 × (note − 4,5) + 500 si &gt; 25 km</p>
          </Card>
        </div>
      </Panel>
    </div>
  )
}
