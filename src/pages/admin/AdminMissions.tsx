import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, RefreshCw, Truck, XCircle } from 'lucide-react'
import { MISSION_LABEL, useStore } from '../../store/useStore'
import { MISSION_TONE } from '../../data/statusUi'
import { FRAUD_PRICE_GAP } from '../../lib/pricing'
import { dateTimeFr, fcfa } from '../../lib/format'
import { Badge, Button, Chips, Notice, PageHeader, Stat, cx } from '../../components/ui'
import type { Mission, MissionStatus } from '../../types'
import { DataTable, Panel, Td } from './adminKit'

type Filter = 'toutes' | 'actives' | MissionStatus

const gapOf = (m: Mission) =>
  m.invoice && m.estimate.medications > 0 ? (m.invoice.amount - m.estimate.medications) / m.estimate.medications : undefined

export default function AdminMissions() {
  const missions = useStore((s) => s.missions)
  const agents = useStore((s) => s.agents)
  const cancelMission = useStore((s) => s.cancelMission)
  const assignAgent = useStore((s) => s.assignAgent)
  const [filter, setFilter] = useState<Filter>('toutes')
  const [open, setOpen] = useState<string | null>(null)

  const list = useMemo(
    () =>
      missions.filter((m) =>
        filter === 'toutes' ? true : filter === 'actives' ? m.status !== 'livree' && m.status !== 'annulee' : m.status === filter,
      ),
    [missions, filter],
  )

  const pay = useMemo(() => {
    const paid = missions.reduce((s, m) => s + m.estimate.service + m.estimate.delivery, 0)
    const earned = missions.filter((m) => m.status === 'livree').reduce((s, m) => s + m.estimate.service + m.estimate.delivery, 0)
    const refunds = missions.filter((m) => m.status === 'annulee')
    const refundTotal = refunds.reduce((s, m) => s + m.estimate.service + m.estimate.delivery, 0)
    const invoices = missions.reduce((s, m) => s + (m.invoice?.amount ?? 0), 0)
    return { paid, earned, refunds, refundTotal, invoices }
  }, [missions])

  const cancel = (m: Mission) => {
    const reason = window.prompt(`Motif d'annulation de ${m.id} :`, 'Annulée par l\'administration')
    if (reason) cancelMission(m.id, reason)
  }

  const statuses = Object.keys(MISSION_LABEL) as MissionStatus[]

  return (
    <div>
      <PageHeader title="Missions" subtitle={`${missions.length} mission(s) au total`} icon={<Truck />} />

      <div className="mb-4">
        <Chips<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'toutes', label: `Toutes (${missions.length})` },
            { value: 'actives', label: 'Actives' },
            ...statuses.map((s) => ({ value: s as Filter, label: `${MISSION_LABEL[s].split(' —')[0]} (${missions.filter((m) => m.status === s).length})` })),
          ]}
        />
      </div>

      {list.length === 0 ? (
        <p className="mb-6 rounded-2xl border border-dashed border-slate-300 bg-white/60 py-10 text-center text-sm text-slate-500">Aucune mission dans cette catégorie.</p>
      ) : (
        <DataTable head={['', 'ID', 'Patient', 'Agent', 'Statut', 'Estimation', 'Facture', 'Écart', 'Créée', 'Actions']} className="mb-6">
          {list.map((m) => {
            const gap = gapOf(m)
            const isOpen = open === m.id
            const done = m.status === 'livree' || m.status === 'annulee'
            return (
              <Fragment key={m.id}>
                <tr className={cx('hover:bg-slate-50', isOpen && 'bg-slate-50')}>
                  <Td>
                    <button onClick={() => setOpen(isOpen ? null : m.id)} aria-label="Détails" className="rounded p-1 text-slate-400 hover:bg-slate-200">
                      <ChevronDown size={16} className={cx('transition', isOpen && 'rotate-180')} />
                    </button>
                  </Td>
                  <Td className="font-mono text-xs font-semibold">{m.id}</Td>
                  <Td>{m.patientName}</Td>
                  <Td>{agents.find((a) => a.id === m.agentId)?.name ?? <span className="text-slate-400">—</span>}</Td>
                  <Td><Badge tone={MISSION_TONE[m.status]}>{MISSION_LABEL[m.status].split(' —')[0]}</Badge></Td>
                  <Td className="tabular-nums">{fcfa(m.estimate.total)}</Td>
                  <Td className="tabular-nums">{m.invoice ? fcfa(m.invoice.amount) : <span className="text-slate-400">—</span>}</Td>
                  <Td className={cx('tabular-nums font-semibold', gap !== undefined && gap > FRAUD_PRICE_GAP ? 'text-red-600' : gap !== undefined && gap > 0 ? 'text-amber-600' : 'text-slate-600')}>
                    {gap === undefined ? <span className="font-normal text-slate-400">—</span> : `${gap > 0 ? '+' : ''}${Math.round(gap * 100)} %`}
                  </Td>
                  <Td className="whitespace-nowrap text-slate-500">{dateTimeFr(m.createdAt)}</Td>
                  <Td>
                    <div className="flex gap-1.5">
                      {m.status === 'payee' && <Button size="sm" variant="soft" onClick={() => assignAgent(m.id)}><RefreshCw size={13} />Réaffecter</Button>}
                      {!done && <Button size="sm" variant="outline" onClick={() => cancel(m)} className="text-red-600"><XCircle size={13} />Annuler</Button>}
                    </div>
                  </Td>
                </tr>
                {isOpen && (
                  <tr className="bg-slate-50">
                    <Td colSpan={10}>
                      <div className="grid gap-4 py-2 md:grid-cols-[1fr_260px]">
                        <ol className="relative space-y-3 border-l-2 border-slate-200 pl-4">
                          {m.timeline.map((t, i) => (
                            <li key={i} className="relative">
                              <span className={cx('absolute top-1.5 -left-[22px] h-2.5 w-2.5 rounded-full ring-4 ring-slate-50', t.status === 'annulee' ? 'bg-red-500' : t.status === 'info' ? 'bg-slate-400' : 'bg-brand-500')} />
                              <p className="text-sm">{t.label}</p>
                              <p className="text-xs text-slate-400">{dateTimeFr(t.at)}</p>
                            </li>
                          ))}
                        </ol>
                        <dl className="space-y-1 rounded-xl bg-white p-3 text-xs ring-1 ring-slate-200">
                          <div className="flex justify-between"><dt className="text-slate-500">Ordonnance</dt><dd className="font-mono">{m.prescriptionId}</dd></div>
                          <div className="flex justify-between"><dt className="text-slate-500">Médicaments (est.)</dt><dd>{fcfa(m.estimate.medications)}</dd></div>
                          <div className="flex justify-between"><dt className="text-slate-500">Service</dt><dd>{fcfa(m.estimate.service)}</dd></div>
                          <div className="flex justify-between"><dt className="text-slate-500">Livraison</dt><dd>{fcfa(m.estimate.delivery)}</dd></div>
                          <div className="flex justify-between"><dt className="text-slate-500">Paiement</dt><dd>{m.paymentMethod}</dd></div>
                          {m.invoice && <div className="flex justify-between"><dt className="text-slate-500">Pharmacie</dt><dd>{m.invoice.pharmacyName}</dd></div>}
                          {m.partial && <p className="pt-1 font-semibold text-amber-700">Mission partielle</p>}
                          <Link to={`/missions/${m.id}`} className="block pt-2 font-semibold text-brand-600">Vue patient →</Link>
                        </dl>
                      </div>
                    </Td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </DataTable>
      )}

      <section id="paiements" className="scroll-mt-28">
        <h2 className="mb-3 text-base font-bold">Paiements & remboursements</h2>
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Encaissé (service + livraison)" value={<span className="text-xl">{fcfa(pay.paid)}</span>} />
          <Stat label="Acquis (missions livrées)" value={<span className="text-xl">{fcfa(pay.earned)}</span>} />
          <Stat label="Factures pharmacies" value={<span className="text-xl">{fcfa(pay.invoices)}</span>} tone="slate" />
          <Stat label="Remboursements à traiter" value={<span className="text-xl">{fcfa(pay.refundTotal)}</span>} hint={`${pay.refunds.length} mission(s) annulée(s)`} tone={pay.refunds.length ? 'red' : 'slate'} />
        </div>
        <Panel title="Remboursements">
          {pay.refunds.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">Aucun remboursement en attente.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pay.refunds.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span><span className="font-mono text-xs font-semibold">{m.id}</span> · {m.patientName} · {m.paymentMethod}</span>
                  <span className="flex items-center gap-2"><span className="font-semibold tabular-nums">{fcfa(m.estimate.service + m.estimate.delivery)}</span><Badge tone="orange">remboursement à traiter</Badge></span>
                </li>
              ))}
            </ul>
          )}
          <Notice tone="blue" className="mt-3">Démonstration : en production, les remboursements sont exécutés via l'opérateur de paiement (Mobile Money, carte) et journalisés.</Notice>
        </Panel>
      </section>
    </div>
  )
}
