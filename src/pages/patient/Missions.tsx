import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Clock, Plus, Truck } from 'lucide-react'
import type { Mission } from '../../types'
import { MISSION_LABEL, useStore } from '../../store/useStore'
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Section, cx } from '../../components/ui'
import { dateTimeFr, fcfa, initials } from '../../lib/format'
import { MISSION_TONE, isMissionActive, missionProgress, missionAgent } from '../../data/statusUi'

export default function Missions() {
  const missions = useStore((s) => s.missions)
  const agents = useStore((s) => s.agents)
  const active = useMemo(() => missions.filter(isMissionActive), [missions])
  const past = useMemo(() => missions.filter((m) => !isMissionActive(m)), [missions])

  const row = (m: Mission) => {
    const agent = missionAgent(m, agents)
    const live = isMissionActive(m)
    return (
      <Link key={m.id} to={`/missions/${m.id}`} className="block">
        <Card className={cx('transition hover:shadow-md', live ? 'border-brand-200' : 'opacity-90')}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-sm font-bold">{m.id}</p>
              <p className="text-xs text-slate-500">{m.patientName} · {dateTimeFr(m.createdAt)}</p>
            </div>
            <Badge tone={MISSION_TONE[m.status]}>{MISSION_LABEL[m.status]}</Badge>
          </div>
          {live && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all" style={{ width: `${missionProgress(m.status)}%` }} />
            </div>
          )}
          <div className="mt-3 flex items-center gap-3 text-sm">
            {agent ? (
              <span className="flex min-w-0 items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-500 text-[11px] font-bold text-white">{initials(agent.name)}</span>
                <span className="truncate font-semibold">{agent.name}</span>
              </span>
            ) : (
              <span className="text-slate-500">{m.status === 'annulee' ? 'Aucun agent' : 'Recherche d\'un agent…'}</span>
            )}
            {live && m.eta != null && m.eta > 0 && (
              <span className="ml-auto flex shrink-0 items-center gap-1 font-semibold text-accent-600"><Clock size={14} /> ~{m.eta} min</span>
            )}
            {!live && <span className="ml-auto shrink-0 font-semibold tabular-nums text-slate-600">{fcfa(m.invoice?.amount ?? m.estimate.total)}</span>}
            <ChevronRight size={16} className="shrink-0 text-slate-300" />
          </div>
        </Card>
      </Link>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Suivre ma commande" subtitle="Vos missions PHARMA CI en temps réel." icon={<Truck size={22} />} />

      {missions.length === 0 ? (
        <EmptyState
          icon={<Truck size={26} />}
          title="Aucune mission pour le moment"
          text="Envoyez votre ordonnance : un agent achète vos médicaments en pharmacie et vous les livre avec la facture originale."
          action={<ButtonLink to="/ordonnance" variant="accent"><Plus size={16} /> Envoyer une ordonnance</ButtonLink>}
        />
      ) : (
        <>
          <Section title={`En cours (${active.length})`}>
            {active.length ? <div className="space-y-3">{active.map(row)}</div> : <p className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">Aucune mission en cours.</p>}
          </Section>
          {past.length > 0 && (
            <Section title={`Terminées & annulées (${past.length})`}>
              <div className="space-y-3">{past.map(row)}</div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}
