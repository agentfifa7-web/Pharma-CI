import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Ban, Bike, CheckCircle2, Copy, FileText, LayoutDashboard, MapPin, ShieldAlert, Wallet } from 'lucide-react'
import { MISSION_LABEL, useStore } from '../../store/useStore'
import { PHARMACIES } from '../../data/pharmacies'
import { MISSION_TONE, missionAgent } from '../../data/statusUi'
import { fcfa, relativeFr } from '../../lib/format'
import MapView, { type MapMarker } from '../../components/MapView'
import { Badge, PageHeader, Stat, cx } from '../../components/ui'
import ServiceAccess from '../../components/ServiceAccess'
import { DataTable, Panel, Td } from './adminKit'

const SEVERITY_TONE = { faible: 'slate', moyenne: 'orange', elevee: 'red' } as const

const MODULES: { emoji: string; label: string; to?: string }[] = [
  { emoji: '🚚', label: 'Missions', to: '/admin/missions' },
  { emoji: '👥', label: 'Patients' },
  { emoji: '🛵', label: 'Agents', to: '/admin/agents' },
  { emoji: '🏥', label: 'Pharmacies référencées', to: '/admin/pharmacies' },
  { emoji: '📄', label: 'Ordonnances', to: '/admin/ordonnances' },
  { emoji: '💳', label: 'Paiements', to: '/admin/missions#paiements' },
  { emoji: '📦', label: 'Livraisons', to: '/admin/missions' },
  { emoji: '⚠️', label: 'Incidents', to: '/admin/fraude' },
  { emoji: '↩️', label: 'Remboursements', to: '/admin/missions#paiements' },
  { emoji: '🚨', label: 'Alertes', to: '/admin/contenus?tab=alertes' },
  { emoji: '💊', label: 'Médicaments', to: '/admin/contenus?tab=medicaments' },
  { emoji: '🛡️', label: 'CMU', to: '/admin/contenus?tab=cmu' },
  { emoji: '🏦', label: 'Assurances', to: '/admin/contenus?tab=assurances' },
  { emoji: '📰', label: 'Actualités', to: '/admin/contenus?tab=actualites' },
  { emoji: '⚖️', label: 'Réglementation', to: '/admin/contenus?tab=reglementation' },
]

export default function AdminDashboard() {
  const missions = useStore((s) => s.missions)
  const prescriptions = useStore((s) => s.prescriptions)
  const agents = useStore((s) => s.agents)
  const fraud = useStore((s) => s.fraud)
  const duplicateAttempts = useStore((s) => s.duplicateAttempts)

  const k = useMemo(() => {
    const active = missions.filter((m) => m.status !== 'livree' && m.status !== 'annulee')
    const delivered = missions.filter((m) => m.status === 'livree')
    return {
      active,
      delivered: delivered.length,
      revenue: delivered.reduce((s, m) => s + m.estimate.service + m.estimate.delivery, 0),
      available: agents.filter((a) => a.available).length,
      openFraud: fraud.filter((f) => !f.resolved).length,
    }
  }, [missions, agents, fraud])

  const markers: MapMarker[] = useMemo(
    () => [
      ...agents.map((a) => ({
        id: a.id, position: a.position, color: a.available ? '#f77f00' : '#94a3b8', glyph: '🛵', size: 28,
        popup: <div><p className="font-bold">{a.name}</p><p className="text-xs">{a.zone} · {a.available ? 'disponible' : 'indisponible'} · {a.activeMissions} mission(s)</p></div>,
      })),
      ...k.active.map((m) => ({
        id: `m-${m.id}`, position: m.agentPosition ?? m.deliveryPosition, color: '#0f1f1a', glyph: '📍', size: 30, pulse: true,
        popup: <div><p className="font-bold">{m.id}</p><p className="text-xs">{MISSION_LABEL[m.status]}</p></div>,
      })),
    ],
    [agents, k.active],
  )

  return (
    <div>
      <PageHeader title="Command Center" subtitle="Vue d'ensemble en temps réel de l'activité PHARMA CI" icon={<LayoutDashboard />} />
      <ServiceAccess />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Missions actives" value={k.active.length} icon={<Activity size={20} />} tone="accent" />
        <Stat label="Missions livrées" value={k.delivered} icon={<CheckCircle2 size={20} />} />
        <Stat label="Ordonnances" value={prescriptions.length} icon={<FileText size={20} />} tone="slate" />
        <Stat label="Agents disponibles" value={<>{k.available}<span className="text-base text-slate-400">/{agents.length}</span></>} icon={<Bike size={20} />} />
        <Stat label="Pharmacies référencées" value={PHARMACIES.length} icon={<MapPin size={20} />} tone="slate" />
        <Stat label="Alertes fraude" value={k.openFraud} hint="non résolues" icon={<ShieldAlert size={20} />} tone={k.openFraud ? 'red' : 'slate'} />
        <Stat label="CA service" value={<span className="text-xl">{fcfa(k.revenue)}</span>} hint="service + livraison (livrées)" icon={<Wallet size={20} />} />
        <Stat label="Doublons bloqués" value={duplicateAttempts} hint="ordonnances déjà enregistrées" icon={<Copy size={20} />} tone={duplicateAttempts ? 'red' : 'slate'} />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Carte live — agents & missions" action={<span className="flex gap-3 text-xs text-slate-500"><span>🛵 Agents</span><span>📍 Missions</span></span>}>
          <MapView markers={markers} zoom={12} className="h-80 overflow-hidden rounded-xl" />
        </Panel>
        <Panel title="Alertes fraude récentes" action={<Link to="/admin/fraude" className="text-xs font-semibold text-brand-600">Tout voir →</Link>}>
          {fraud.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">✅ Aucune alerte. Les contrôles automatiques sont actifs.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {fraud.slice(0, 6).map((f) => (
                <li key={f.id} className={cx('py-2.5 text-sm', f.resolved && 'opacity-50')}>
                  <div className="flex items-center gap-2">
                    <Badge tone={SEVERITY_TONE[f.severity]}>{f.severity}</Badge>
                    <span className="text-xs text-slate-400">{relativeFr(f.at)}</span>
                    {f.resolved && <Badge tone="green">résolue</Badge>}
                  </div>
                  <p className="mt-1 text-slate-700">{f.description}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Missions récentes" className="mb-5" action={<Link to="/admin/missions" className="text-xs font-semibold text-brand-600">Toutes les missions →</Link>}>
        {missions.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Aucune mission pour le moment. Lancez-en une depuis l'app Patient (Envoyer une ordonnance).</p>
        ) : (
          <DataTable head={['Mission', 'Patient', 'Agent', 'Statut', 'Montant', 'Créée']} className="border-0 shadow-none">
            {missions.slice(0, 8).map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <Td className="font-mono text-xs font-semibold">{m.id}</Td>
                <Td>{m.patientName}</Td>
                <Td>{missionAgent(m, agents)?.name ?? <span className="text-slate-400">—</span>}</Td>
                <Td><Badge tone={MISSION_TONE[m.status]}>{MISSION_LABEL[m.status]}</Badge></Td>
                <Td className="tabular-nums">{fcfa(m.estimate.total)}</Td>
                <Td className="text-slate-500">{relativeFr(m.createdAt)}</Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>

      <h2 className="mb-3 text-base font-bold">Modules</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {MODULES.map((m) =>
          m.to ? (
            <Link key={m.label} to={m.to} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 text-sm font-semibold shadow-sm transition hover:border-brand-200 hover:shadow-md">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-xl">{m.emoji}</span>{m.label}
            </Link>
          ) : (
            <div key={m.label} className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-3 text-sm font-semibold text-slate-500" title="Nécessite le backend (données personnelles)">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-xl grayscale">{m.emoji}</span>
              <span>{m.label}<span className="block text-[11px] font-medium text-slate-400"><Ban size={10} className="inline" /> backend requis</span></span>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
