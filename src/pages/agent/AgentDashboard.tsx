import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bike, CheckCircle2, ChevronRight, ClipboardList, Hourglass, Info, MapPin, Star, UserRound, Wallet } from 'lucide-react'
import { MISSION_LABEL, useStore } from '../../store/useStore'
import { Badge, Button, Card, EmptyState, Input, Notice, PageHeader, Section, Select, Stat, cx } from '../../components/ui'
import { VEHICLE_LABEL } from '../../data/agents'
import type { Agent } from '../../types'
import { dateTimeFr, fcfa, initials } from '../../lib/format'
import AccessCard from '../../components/AccessCard'
import { MISSION_TONE, isMissionActive } from '../../data/statusUi'

export default function AgentDashboard() {
  const agents = useStore((s) => s.agents)
  const missions = useStore((s) => s.missions)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const setAgentAvailability = useStore((s) => s.setAgentAvailability)

  const agent = agents.find((a) => a.id === currentAgentId)
  const mine = useMemo(() => missions.filter((m) => agent && m.agentId === agent.id), [missions, agent])
  const current = mine.filter(isMissionActive)
  const nouvelles = mine.filter((m) => m.status === 'agent_affecte').length
  const enCours = current.length - nouvelles
  const pending = missions.filter((m) => m.status === 'payee').length
  const available = missions.filter((m) => m.remote && m.status === 'payee')
  const agentCode = useStore((s) => s.agentCode)
  const syncError = useStore((s) => s.agentSyncError)
  const [editing, setEditing] = useState(false)

  // Tant que le code et le profil ne sont pas renseignés, ce téléphone ne peut pas recevoir de mission.
  if (!agentCode || syncError || !agent) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="PHARMA CI AGENT" subtitle="Tableau de bord de l'agent" icon={<Bike size={22} />} />
        <Notice tone="blue" icon={<Info size={16} />} className="mb-4">
          Deux étapes pour recevoir les missions des patients sur ce téléphone : <b>1.</b> le code agent remis par PHARMA CI, <b>2.</b> votre nom et votre téléphone.
        </Notice>
        <AccessCard code={agentCode} error={syncError} />
        {agentCode && !syncError && <ProfileCard agent={agent} />}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="PHARMA CI AGENT" subtitle="Tableau de bord de l'agent" icon={<Bike size={22} />} />

      <AccessCard code={agentCode} error={syncError} />
      <SyncStatus />

      {available.length > 0 && (
        <Section title={`Missions à prendre (${available.length})`}>
          <div className="space-y-3">
            {available.map((m) => (
              <Link key={m.id} to={`/agent/missions/${m.id}`} className="block">
                <Card className="flex items-center gap-3 border-accent-300 transition hover:shadow-md">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-sm font-bold">{m.id}</span>
                    <p className="mt-1 truncate text-sm text-slate-600">{m.deliveryAddress}</p>
                    <p className="text-xs text-slate-400">{dateTimeFr(m.createdAt)} · budget {fcfa(m.estimate.medications)}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-xl bg-accent-500 px-3 py-2 text-sm font-semibold text-white">Voir <ChevronRight size={14} /></span>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Card className="mb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent-500 text-lg font-extrabold text-white">{initials(agent.name)}</span>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">{agent.name}</p>
              <p className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
                <span>{agent.phone}</span>
                <span className="flex items-center gap-1"><Star size={13} className="fill-accent-400 text-accent-400" /> {agent.rating > 0 ? agent.rating.toFixed(1) : 'Non évalué'}</span>
                <span>· {VEHICLE_LABEL[agent.vehicle]}</span>
                <span className="flex items-center gap-0.5">· <MapPin size={12} /> {agent.zone}</span>
              </p>
            </div>
          </div>
          <button onClick={() => setEditing(!editing)} className="text-sm font-semibold text-brand-600 hover:underline">{editing ? 'Fermer' : 'Modifier mon profil'}</button>
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
      {editing && <ProfileCard agent={agent} onSaved={() => setEditing(false)} />}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Nouvelles missions" value={nouvelles} icon={<ClipboardList size={18} />} tone="accent" />
        <Stat label="En cours" value={enCours} icon={<Hourglass size={18} />} />
        <Stat label="Terminées" value={agent.completed} icon={<CheckCircle2 size={18} />} tone="slate" />
        <Stat label="Revenus" value={<span className="text-lg">{fcfa(agent.earnings)}</span>} icon={<Wallet size={18} />} />
      </div>

      <Notice tone="blue" icon={<Info size={16} />} className="mb-5">
        <b>{pending} mission{pending > 1 ? 's' : ''} en attente d'un agent.</b> Les missions des patients arrivent ici automatiquement (actualisation toutes les 8 secondes) : ouvrez-en une et acceptez-la.
      </Notice>

      <Section title="Mes missions en cours" action={<Link to="/agent/missions" className="text-sm font-semibold text-brand-600 hover:underline">Tout voir</Link>}>
        {current.length === 0 ? (
          <EmptyState
            icon={<Bike size={26} />}
            title="Aucune mission en cours"
            text={agent.available ? 'Acceptez une mission dans « Missions à prendre » : elle apparaîtra ici.' : 'Passez en « Disponible » pour recevoir des missions.'}
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

/** Nom et téléphone de l'agent : le patient les voit et peut l'appeler. */
function ProfileCard({ agent, onSaved }: { agent?: Agent; onSaved?: () => void }) {
  const saveAgentProfile = useStore((s) => s.saveAgentProfile)
  const [form, setForm] = useState({ name: agent?.name ?? '', phone: agent?.phone ?? '', zone: agent?.zone ?? '', vehicle: agent?.vehicle ?? ('moto' as Agent['vehicle']) })
  const ok = form.name.trim() && form.phone.trim()
  return (
    <Card className="mb-4">
      <p className="flex items-center gap-2 font-bold"><UserRound size={18} className="text-brand-600" /> Mon profil d'agent</p>
      <p className="mt-1 text-sm text-slate-600">Le patient voit votre nom et peut vous appeler pendant la mission.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Input label="Nom et prénom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Téléphone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input label="Zone (commune)" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
        <Select label="Moyen de transport" value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value as Agent['vehicle'] })}>
          {Object.entries(VEHICLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>
      <Button className="mt-3 w-full sm:w-auto" disabled={!ok} onClick={() => { saveAgentProfile({ name: form.name.trim(), phone: form.phone.trim(), zone: form.zone.trim(), vehicle: form.vehicle }); onSaved?.() }}>Enregistrer mon profil</Button>
    </Card>
  )
}

/** État de la liaison avec le service : l'agent voit tout de suite si les missions peuvent lui parvenir. */
function SyncStatus() {
  const lastSync = useStore((s) => s.lastSync)
  const agent = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const fresh = lastSync && Date.now() - new Date(lastSync).getTime() < 60_000
  return (
    <p className={cx('mb-4 flex items-center gap-2 text-sm', fresh ? 'text-emerald-700' : 'text-amber-700')}>
      <span className={cx('h-2.5 w-2.5 rounded-full', fresh ? 'bg-emerald-500' : 'bg-amber-500')} />
      {fresh ? `Connecté au service PHARMA CI · actualisé à ${new Date(lastSync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Connexion au service en cours… vérifiez internet si ce message reste affiché.'}
      {agent && !agent.lastSeen && <span className="text-amber-700">· profil en cours d'envoi</span>}
    </p>
  )
}
