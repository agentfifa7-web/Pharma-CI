import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bike, CheckCircle2, ChevronRight, ClipboardList, Hourglass, Info, MapPin, Star, Wallet } from 'lucide-react'
import { MISSION_LABEL, useStore } from '../../store/useStore'
import { Badge, ButtonLink, Card, EmptyState, Notice, PageHeader, Section, Select, Stat, cx } from '../../components/ui'
import { VEHICLE_LABEL } from '../../data/agents'
import { dateTimeFr, fcfa, initials } from '../../lib/format'
import { MISSION_TONE, isMissionActive } from '../../data/statusUi'

export default function AgentDashboard() {
  const agents = useStore((s) => s.agents)
  const missions = useStore((s) => s.missions)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const setCurrentAgent = useStore((s) => s.setCurrentAgent)
  const setAgentAvailability = useStore((s) => s.setAgentAvailability)

  const agent = agents.find((a) => a.id === currentAgentId) ?? agents[0]!
  const mine = useMemo(() => missions.filter((m) => m.agentId === agent.id), [missions, agent.id])
  const current = mine.filter(isMissionActive)
  const nouvelles = mine.filter((m) => m.status === 'agent_affecte').length
  const enCours = current.length - nouvelles
  const pending = missions.filter((m) => m.status === 'payee').length

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="PHARMA CI AGENT" subtitle="Tableau de bord de l'agent" icon={<Bike size={22} />} />

      <Card className="mb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent-500 text-lg font-extrabold text-white">{initials(agent.name)}</span>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">{agent.name}</p>
              <p className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
                <Badge tone="orange">Compte de test</Badge>
                <span className="flex items-center gap-1"><Star size={13} className="fill-accent-400 text-accent-400" /> {agent.rating > 0 ? agent.rating.toFixed(1) : 'Non évalué'}</span>
                <span>· {VEHICLE_LABEL[agent.vehicle]}</span>
                <span className="flex items-center gap-0.5">· <MapPin size={12} /> {agent.zone}</span>
              </p>
            </div>
          </div>
          <Select label="Compte de test utilisé" value={agent.id} onChange={(e) => setCurrentAgent(e.target.value)} className="sm:w-60">
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.zone})</option>)}
          </Select>
        </div>

        <button
          onClick={() => setAgentAvailability(agent.id, !agent.available)}
          className={cx(
            'mt-4 flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left text-white shadow-lg transition active:scale-[.99]',
            agent.available ? 'bg-brand-500 shadow-brand-500/25' : 'bg-slate-500 shadow-slate-500/20',
          )}
          aria-pressed={agent.available}
        >
          <span>
            <span className="block text-lg font-extrabold">{agent.available ? 'Disponible 🟢' : 'Indisponible 🔴'}</span>
            <span className="block text-sm text-white/80">{agent.available ? 'Vous pouvez recevoir de nouvelles missions' : 'Aucune nouvelle mission ne vous sera affectée'}</span>
          </span>
          <span className={cx('relative h-8 w-14 shrink-0 rounded-full', agent.available ? 'bg-white/30' : 'bg-white/20')}>
            <span className={cx('absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform', agent.available && 'translate-x-6')} />
          </span>
        </button>
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Nouvelles missions" value={nouvelles} icon={<ClipboardList size={18} />} tone="accent" />
        <Stat label="En cours" value={enCours} icon={<Hourglass size={18} />} />
        <Stat label="Terminées" value={agent.completed} icon={<CheckCircle2 size={18} />} tone="slate" />
        <Stat label="Revenus" value={<span className="text-lg">{fcfa(agent.earnings)}</span>} icon={<Wallet size={18} />} />
      </div>

      <Notice tone="blue" icon={<Info size={16} />} className="mb-5">
        <b>{pending} mission{pending > 1 ? 's' : ''} en attente d'affectation.</b> L'affectation est automatique (agent disponible le plus proche, charge et note prises en compte). Les agents actuels sont des comptes de test.
      </Notice>

      <Section title="Mes missions en cours" action={<Link to="/agent/missions" className="text-sm font-semibold text-brand-600 hover:underline">Tout voir</Link>}>
        {current.length === 0 ? (
          <EmptyState
            icon={<Bike size={26} />}
            title="Aucune mission en cours"
            text={agent.available ? 'Les nouvelles missions apparaîtront ici automatiquement. Lancez une mission depuis l\'app patient pour tester.' : 'Passez en « Disponible » pour recevoir des missions.'}
            action={<ButtonLink to="/ordonnance" variant="outline">Ouvrir l'app patient</ButtonLink>}
          />
        ) : (
          <div className="space-y-3">
            {current.map((m) => (
              <Link key={m.id} to={`/agent/missions/${m.id}`} className="block">
                <Card className={cx('flex items-center gap-3 transition hover:shadow-md', m.status === 'agent_affecte' && 'border-accent-300')}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold">{m.id}</span>
                      <Badge tone={MISSION_TONE[m.status]}>{MISSION_LABEL[m.status]}</Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-600">{m.patientName.split(' ')[0]} · {m.deliveryAddress}</p>
                    <p className="text-xs text-slate-400">{dateTimeFr(m.createdAt)}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white">Ouvrir <ChevronRight size={14} /></span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
