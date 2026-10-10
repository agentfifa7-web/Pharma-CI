import { Bike, Gauge, Star, Trash2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { VEHICLE_LABEL } from '../../data/agents'
import { dateTimeFr, fcfa } from '../../lib/format'
import ServiceAccess from '../../components/ServiceAccess'
import { EmptyState, PageHeader, Stat, cx } from '../../components/ui'
import { DataTable, Td } from './adminKit'

const VEHICLE_EMOJI = { moto: '🏍️', voiture: '🚗', velo: '🚲', a_pied: '🚶🏾' } as const

export default function AdminAgents() {
  const agents = useStore((s) => s.agents)
  const setAvailability = useStore((s) => s.setAgentAvailability)
  const removeAgent = useStore((s) => s.removeAgent)

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Retirer ${name} de la liste ? S'il ouvre encore l'application avec le code agent, il réapparaîtra. Pour bloquer tous les anciens accès, changez le code agent chez Cloudflare.`)) return
    if (!(await removeAgent(id))) window.alert("Le service n'a pas pu retirer cet agent. Vérifiez la connexion puis réessayez.")
  }

  const available = agents.filter((a) => a.available).length
  const active = agents.reduce((s, a) => s + a.activeMissions, 0)
  const rated = agents.filter((a) => a.rating > 0)
  const avgRating = rated.length ? rated.reduce((s, a) => s + a.rating, 0) / rated.length : undefined

  return (
    <div>
      <PageHeader title="Agents PHARMA CI" subtitle="Agents enregistrés, disponibilités et dernières connexions" icon={<Bike />} />

      <ServiceAccess />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Disponibles" value={<>{available}<span className="text-base text-slate-400">/{agents.length}</span></>} icon={<Bike size={20} />} />
        <Stat label="Missions en cours" value={active} icon={<Gauge size={20} />} tone="accent" />
        <Stat label="Note moyenne" value={avgRating === undefined ? '—' : avgRating.toFixed(2).replace('.', ',')} hint={avgRating === undefined ? 'aucune évaluation' : `${rated.length} agent(s) évalué(s)`} icon={<Star size={20} />} tone="slate" />
        <Stat label="Missions réalisées" value={agents.reduce((s, a) => s + a.completed, 0)} tone="slate" />
      </div>

      {agents.length === 0 ? (
        <EmptyState icon={<Bike size={26} />} title="Aucun agent enregistré" text="Chaque agent ouvre www.pharma-ci.org/agent sur son téléphone, saisit le code agent puis son nom et son téléphone : il apparaît ici." />
      ) : (
      <DataTable head={['Agent', 'Zone', 'Moyen', 'Missions actives', 'Note', 'Réalisées', 'Gains', 'Dernière connexion', 'Disponibilité', '']} className="mb-6">
        {agents.map((a) => (
          <tr key={a.id} className="hover:bg-slate-50">
            <Td>
              <div className="flex items-center gap-2">
                <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white', a.available ? 'bg-brand-500' : 'bg-slate-400')}>{a.photo || a.name.slice(0, 2).toUpperCase()}</span>
                <div><p className="flex items-center gap-1.5 font-semibold whitespace-nowrap">{a.name}</p><p className="text-xs text-slate-400">{a.phone || 'Téléphone non renseigné'}</p></div>
              </div>
            </Td>
            <Td>{a.zone}</Td>
            <Td className="whitespace-nowrap">{VEHICLE_EMOJI[a.vehicle]} {VEHICLE_LABEL[a.vehicle]}</Td>
            <Td className="tabular-nums">{a.activeMissions}/3</Td>
            <Td className="tabular-nums">{a.rating > 0 ? `⭐ ${a.rating.toFixed(1)}` : '—'}</Td>
            <Td className="tabular-nums">{a.completed}</Td>
            <Td className="tabular-nums whitespace-nowrap">{fcfa(a.earnings)}</Td>
            <Td className="text-xs whitespace-nowrap text-slate-500">{a.lastSeen ? dateTimeFr(a.lastSeen) : 'pas encore connecté'}</Td>
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
            <Td>
              <button onClick={() => void remove(a.id, a.name)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Retirer cet agent" aria-label={`Retirer ${a.name}`}><Trash2 size={16} /></button>
            </Td>
          </tr>
        ))}
      </DataTable>
      )}

    </div>
  )
}
