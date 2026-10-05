import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ClipboardList } from 'lucide-react'
import { MISSION_LABEL, useStore } from '../../store/useStore'
import { Badge, Card, Chips, EmptyState, PageHeader } from '../../components/ui'
import { dateTimeFr, fcfa } from '../../lib/format'
import { MISSION_TONE, agentEarning } from '../../data/statusUi'

type Tab = 'nouvelles' | 'en_cours' | 'terminees'

export default function AgentMissions() {
  const missions = useStore((s) => s.missions)
  const agents = useStore((s) => s.agents)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const agent = agents.find((a) => a.id === currentAgentId)
  const [tab, setTab] = useState<Tab>('nouvelles')

  const mine = useMemo(() => missions.filter((m) => m.agentId === currentAgentId), [missions, currentAgentId])
  const groups = useMemo(
    () => ({
      nouvelles: mine.filter((m) => m.status === 'agent_affecte'),
      en_cours: mine.filter((m) => ['en_pharmacie', 'ecart_prix', 'achat_effectue', 'en_route'].includes(m.status)),
      terminees: mine.filter((m) => m.status === 'livree' || m.status === 'annulee'),
    }),
    [mine],
  )
  const list = groups[tab]

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Missions" subtitle={agent ? `Agent : ${agent.name}` : undefined} icon={<ClipboardList size={22} />} />
      <Chips
        value={tab}
        onChange={setTab}
        options={[
          { value: 'nouvelles', label: `Nouvelles (${groups.nouvelles.length})` },
          { value: 'en_cours', label: `En cours (${groups.en_cours.length})` },
          { value: 'terminees', label: `Terminées (${groups.terminees.length})` },
        ]}
      />
      <div className="mt-4 space-y-3">
        {list.length === 0 ? (
          <EmptyState icon={<ClipboardList size={26} />} title="Aucune mission ici" text={tab === 'nouvelles' ? 'Les missions vous sont affectées automatiquement lorsque vous êtes disponible.' : undefined} />
        ) : (
          list.map((m) => (
            <Link key={m.id} to={`/agent/missions/${m.id}`} className="block">
              <Card className="flex items-center gap-3 transition hover:shadow-md">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold">{m.id}</span>
                    <Badge tone={MISSION_TONE[m.status]}>{MISSION_LABEL[m.status]}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-600">{m.patientName.split(' ')[0]} · {m.deliveryAddress}</p>
                  <p className="text-xs text-slate-400">{dateTimeFr(m.createdAt)} · budget estimatif {fcfa(m.estimate.medications)}</p>
                </div>
                {m.status === 'livree' ? (
                  <span className="shrink-0 font-bold text-brand-700 tabular-nums">+{fcfa(agentEarning(m))}</span>
                ) : (
                  <ChevronRight size={18} className="shrink-0 text-slate-300" />
                )}
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
