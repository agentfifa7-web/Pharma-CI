import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, CheckCircle2, Star, Wallet } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Card, EmptyState, PageHeader, Section, Stat } from '../../components/ui'
import { dateTimeFr, fcfa } from '../../lib/format'
import { agentEarning } from '../../data/statusUi'

const pad = (n: number) => String(n).padStart(2, '0')
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export default function AgentEarnings() {
  const agents = useStore((s) => s.agents)
  const missions = useStore((s) => s.missions)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const agent = agents.find((a) => a.id === currentAgentId)

  const finished = useMemo(
    () =>
      missions
        .filter((m) => !!agent && m.agentId === agent.id && m.status === 'livree')
        .map((m) => ({ m, earned: agentEarning(m), at: m.timeline.find((t) => t.status === 'livree')?.at ?? m.createdAt }))
        .sort((a, b) => b.at.localeCompare(a.at)),
    [missions, agent],
  )
  const appTotal = finished.reduce((s, x) => s + x.earned, 0)

  const days = useMemo(() => {
    const out: { key: string; label: string; total: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      out.push({ key: dayKey(d), label: d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''), total: 0 })
    }
    for (const x of finished) {
      const k = dayKey(new Date(x.at))
      const day = out.find((d) => d.key === k)
      if (day) day.total += x.earned
    }
    return out
  }, [finished])
  const max = Math.max(1, ...days.map((d) => d.total))

  if (!agent) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Revenus" icon={<Wallet size={22} />} />
        <EmptyState icon={<Wallet size={26} />} title="Aucun profil d'agent sur ce téléphone" text="Saisissez le code agent puis votre nom et votre téléphone dans le tableau de bord." action={<Link to="/agent" className="font-semibold text-brand-600 underline">Tableau de bord</Link>} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Revenus" subtitle={agent.name} icon={<Wallet size={22} />} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenus cumulés" value={<span className="text-lg">{fcfa(agent.earnings)}</span>} icon={<Wallet size={18} />} />
        <Stat label="Cette session" value={<span className="text-lg">{fcfa(appTotal)}</span>} hint={`${finished.length} mission(s) livrée(s)`} icon={<BarChart3 size={18} />} tone="accent" />
        <Stat label="Missions terminées" value={agent.completed} icon={<CheckCircle2 size={18} />} tone="slate" />
        <Stat label="Note moyenne" value={agent.rating > 0 ? <span className="flex items-center gap-1">{agent.rating.toFixed(2).replace('.', ',')} <Star size={18} className="fill-accent-400 text-accent-400" /></span> : '—'}
          hint={agent.rating > 0 ? undefined : 'aucune évaluation'} icon={<Star size={18} />} tone="accent" />
      </div>

      <Section title="7 derniers jours">
        <Card>
          <div className="flex h-44 items-end gap-2">
            {days.map((d) => (
              <div key={d.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] font-semibold text-slate-500 tabular-nums">{d.total ? Math.round(d.total / 100) / 10 + 'k' : ''}</span>
                <div className="w-full max-w-10 rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all" style={{ height: `${Math.max(d.total ? 6 : 2, (d.total / max) * 100)}%`, opacity: d.total ? 1 : 0.25 }} title={fcfa(d.total)} />
                <span className="text-[11px] font-semibold capitalize text-slate-500">{d.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Rémunération par mission : 80 % des frais de livraison + 30 % du service PHARMA CI.</p>
        </Card>
      </Section>

      <Section title="Missions rémunérées">
        {finished.length === 0 ? (
          <EmptyState icon={<Wallet size={26} />} title="Aucune mission livrée pour le moment" text="Vos gains apparaîtront ici après chaque livraison confirmée par code." />
        ) : (
          <Card className="divide-y divide-slate-100 p-0">
            {finished.map(({ m, earned, at }) => (
              <Link key={m.id} to={`/agent/missions/${m.id}`} className="flex items-center gap-3 p-4 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-bold">{m.id}</p>
                  <p className="truncate text-xs text-slate-500">{dateTimeFr(at)} · {m.deliveryAddress}</p>
                </div>
                <span className="shrink-0 font-bold text-brand-700 tabular-nums">+{fcfa(earned)}</span>
              </Link>
            ))}
          </Card>
        )}
      </Section>
    </div>
  )
}
