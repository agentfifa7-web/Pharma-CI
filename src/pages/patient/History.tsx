import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, FileText, Pill, Receipt, ShoppingBag, Truck } from 'lucide-react'
import { MISSION_LABEL, PRESCRIPTION_LABEL, useStore } from '../../store/useStore'
import { Badge, Card, Chips, EmptyState, PageHeader, Stat } from '../../components/ui'
import { dateTimeFr, fcfa, normalize } from '../../lib/format'
import { MISSION_TONE, PRESCRIPTION_TONE } from '../../data/statusUi'

type Tab = 'ordonnances' | 'achats' | 'missions' | 'factures' | 'livraisons' | 'medicaments'

export default function History() {
  const prescriptions = useStore((s) => s.prescriptions)
  const missions = useStore((s) => s.missions)
  const treatments = useStore((s) => s.treatments)
  const profiles = useStore((s) => s.profiles)
  const [tab, setTab] = useState<Tab>('ordonnances')

  const invoiced = useMemo(() => missions.filter((m) => m.invoice), [missions])
  const delivered = useMemo(() => missions.filter((m) => m.status === 'livree'), [missions])
  const purchases = useMemo(
    () => invoiced.flatMap((m) => m.invoice!.lines.map((l, i) => ({ key: `${m.id}-${i}`, mission: m, line: l }))),
    [invoiced],
  )
  const meds = useMemo(() => {
    const map = new Map<string, { name: string; sources: Set<string>; last: string }>()
    const add = (name: string, source: string, at: string) => {
      const k = normalize(name)
      if (!k) return
      const e = map.get(k) ?? { name, sources: new Set<string>(), last: at }
      e.sources.add(source)
      if (at > e.last) e.last = at
      map.set(k, e)
    }
    invoiced.forEach((m) => m.invoice!.lines.filter((l) => l.obtained).forEach((l) => add(l.label.split(' — ')[0]!, 'Achat', m.invoice!.date)))
    treatments.forEach((t) => add(t.medication, 'Traitement', t.startDate))
    return [...map.values()].sort((a, b) => b.last.localeCompare(a.last))
  }, [invoiced, treatments])

  const totalPharmacy = invoiced.reduce((s, m) => s + (m.status === 'annulee' ? 0 : m.invoice!.amount), 0)
  const totalService = missions.filter((m) => m.status !== 'annulee').reduce((s, m) => s + m.estimate.service + m.estimate.delivery, 0)
  const profileName = (id: string) => profiles.find((p) => p.id === id)?.name ?? '—'

  const empty = (icon: ReactNode, title: string) => <EmptyState icon={icon} title={title} />

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Historique" subtitle="Ordonnances, achats, missions, factures et livraisons." icon={<ClipboardList size={22} />} />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Ordonnances" value={prescriptions.length} icon={<FileText size={18} />} />
        <Stat label="Missions" value={missions.length} icon={<Truck size={18} />} tone="accent" />
        <Stat label="Pharmacies" value={<span className="text-lg">{fcfa(totalPharmacy)}</span>} hint="facturé (médicaments)" icon={<Receipt size={18} />} tone="slate" />
        <Stat label="PHARMA CI" value={<span className="text-lg">{fcfa(totalService)}</span>} hint="service + livraison" icon={<ShoppingBag size={18} />} />
      </div>

      <Chips
        value={tab}
        onChange={setTab}
        options={[
          { value: 'ordonnances', label: 'Mes ordonnances' },
          { value: 'achats', label: 'Mes achats' },
          { value: 'missions', label: 'Mes missions' },
          { value: 'factures', label: 'Mes factures' },
          { value: 'livraisons', label: 'Mes livraisons' },
          { value: 'medicaments', label: 'Mes médicaments' },
        ]}
      />

      <div className="mt-4 space-y-2">
        {tab === 'ordonnances' && (prescriptions.length === 0 ? empty(<FileText size={26} />, 'Aucune ordonnance') : prescriptions.map((p) => (
          <RowLink key={p.id} to={`/ordonnances/${p.id}`} title={<span className="font-mono">{p.id}</span>} sub={`${profileName(p.profileId)} · ${dateTimeFr(p.createdAt)} · ${p.lines.length} ligne(s)`}
            right={<Badge tone={PRESCRIPTION_TONE[p.status]}>{p.locked && '🔒 '}{PRESCRIPTION_LABEL[p.status]}</Badge>} />
        )))}

        {tab === 'achats' && (purchases.length === 0 ? empty(<ShoppingBag size={26} />, 'Aucun achat enregistré') : (
          <>
            {purchases.map(({ key, mission, line }) => (
              <RowLink key={key} to={`/missions/${mission.id}`} title={line.label} sub={`${mission.invoice!.pharmacyName} · ${dateTimeFr(mission.invoice!.date)} · ×${line.quantity}`}
                right={line.obtained ? <span className="font-semibold tabular-nums">{fcfa(line.amount)}</span> : <Badge tone="red">Non obtenu</Badge>} />
            ))}
            <TotalRow label="Total des achats obtenus" value={purchases.filter((p) => p.line.obtained).reduce((s, p) => s + p.line.amount, 0)} />
          </>
        ))}

        {tab === 'missions' && (missions.length === 0 ? empty(<Truck size={26} />, 'Aucune mission') : (
          <>
            {missions.map((m) => (
              <RowLink key={m.id} to={`/missions/${m.id}`} title={<span className="font-mono">{m.id}</span>} sub={`${m.patientName} · ${dateTimeFr(m.createdAt)} · ${m.paymentMethod}`}
                right={<Badge tone={MISSION_TONE[m.status]}>{MISSION_LABEL[m.status]}</Badge>} />
            ))}
            <TotalRow label="Total service PHARMA CI" value={totalService} />
          </>
        ))}

        {tab === 'factures' && (invoiced.length === 0 ? empty(<Receipt size={26} />, 'Aucune facture') : (
          <>
            {invoiced.map((m) => (
              <Link key={m.id} to={`/missions/${m.id}`} className="block">
                <Card className="flex items-center gap-3 hover:shadow-md">
                  <div className="h-14 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {m.invoice!.photo ? <img src={m.invoice!.photo} alt="Facture" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-slate-400"><Receipt size={18} /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{m.invoice!.pharmacyName}</p>
                    <p className="text-xs text-slate-500">{dateTimeFr(m.invoice!.date)} · {m.id}</p>
                  </div>
                  <span className="shrink-0 font-bold tabular-nums">{fcfa(m.invoice!.amount)}</span>
                </Card>
              </Link>
            ))}
            <TotalRow label="Total facturé par les pharmacies" value={totalPharmacy} />
          </>
        ))}

        {tab === 'livraisons' && (delivered.length === 0 ? empty(<Truck size={26} />, 'Aucune livraison') : delivered.map((m) => (
          <RowLink key={m.id} to={`/missions/${m.id}`} title={m.deliveryAddress} sub={`${dateTimeFr(m.timeline.find((t) => t.status === 'livree')?.at ?? m.createdAt)} · ${m.id}${m.partial ? ' · partielle' : ''}`}
            right={<span className="font-semibold tabular-nums">{fcfa(m.estimate.delivery)}</span>} />
        )))}

        {tab === 'medicaments' && (meds.length === 0 ? empty(<Pill size={26} />, 'Aucun médicament enregistré') : meds.map((x) => (
          <Card key={x.name} className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Pill size={18} /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{x.name}</p>
              <p className="text-xs text-slate-500">Dernière fois : {new Date(x.last).toLocaleDateString('fr-FR')}</p>
            </div>
            <div className="flex shrink-0 gap-1">{[...x.sources].map((s) => <Badge key={s} tone={s === 'Achat' ? 'blue' : 'violet'}>{s}</Badge>)}</div>
          </Card>
        )))}
      </div>
    </div>
  )
}

function RowLink({ to, title, sub, right }: { to: string; title: ReactNode; sub: string; right: ReactNode }) {
  return (
    <Link to={to} className="block">
      <Card className="flex items-center gap-3 hover:shadow-md">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-xs text-slate-500">{sub}</p>
        </div>
        <div className="shrink-0">{right}</div>
      </Card>
    </Link>
  )
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-white">
      <span className="text-sm font-semibold">{label}</span>
      <span className="font-extrabold tabular-nums">{fcfa(value)}</span>
    </div>
  )
}
