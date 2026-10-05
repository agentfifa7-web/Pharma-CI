import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle, Ban, Camera, Check, CheckCircle2, ClipboardCheck, Clock, Hourglass, KeyRound, MapPin, Navigation, Pill, Receipt, Search, Store, Truck, Wallet, XCircle,
} from 'lucide-react'
import type { LatLng, Mission, Pharmacy, Prescription } from '../../types'
import { MISSION_LABEL, useStore } from '../../store/useStore'
import { Badge, Button, ButtonLink, Card, EmptyState, Input, Notice, OpenBadge, PageHeader, Section, Textarea, cx } from '../../components/ui'
import MapView, { type MapMarker } from '../../components/MapView'
import { PHARMACIES } from '../../data/pharmacies'
import { medById } from '../../data/medications'
import { pharmacyById } from '../../services/pharmacyProvider'
import { distanceKm, directionsUrl, formatDistance } from '../../lib/geo'
import { openInfo } from '../../lib/hours'
import { imagePreview } from '../../lib/crypto'
import { dateTimeFr, fcfa, normalize, timeFr } from '../../lib/format'
import { MISSION_TONE, agentEarning } from '../../data/statusUi'

export default function AgentMission() {
  const { id = '' } = useParams()
  const missions = useStore((s) => s.missions)
  const prescriptions = useStore((s) => s.prescriptions)
  const agents = useStore((s) => s.agents)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const setCurrentAgent = useStore((s) => s.setCurrentAgent)
  const agentArrive = useStore((s) => s.agentArrive)
  const startDelivery = useStore((s) => s.startDelivery)

  const m = missions.find((x) => x.id === id)
  const prescription = prescriptions.find((p) => p.id === m?.prescriptionId)
  const assigned = agents.find((a) => a.id === m?.agentId)
  const pharmacy = pharmacyById(m?.pharmacyId)
  const [repick, setRepick] = useState(false)

  const markers = useMemo<MapMarker[]>(() => {
    if (!m) return []
    const list: MapMarker[] = [{ id: 'home', position: m.deliveryPosition, color: '#0f1f1a', glyph: '🏠', size: 34, popup: <b>{m.deliveryAddress}</b> }]
    if (pharmacy) list.push({ id: 'ph', position: pharmacy.position, color: '#009e60', glyph: '💊', popup: <b>{pharmacy.name}</b> })
    if (m.agentPosition && m.status !== 'livree') list.push({ id: 'me', position: m.agentPosition, color: '#f77f00', glyph: '🛵', size: 38, pulse: m.status === 'en_route' })
    return list
  }, [m, pharmacy])

  if (!m) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Mission introuvable" back="/agent/missions" icon={<Truck size={22} />} />
        <EmptyState icon={<Truck size={26} />} title="Cette mission n'existe pas" action={<ButtonLink to="/agent/missions">Mes missions</ButtonLink>} />
      </div>
    )
  }

  const isMine = m.agentId === currentAgentId
  const route: LatLng[] | undefined = m.status === 'en_route' && m.agentPosition ? [m.agentPosition, m.deliveryPosition] : undefined

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`Mission ${m.id}`}
        subtitle={`Créée ${dateTimeFr(m.createdAt)}`}
        icon={<Truck size={22} />}
        back="/agent/missions"
        action={<Badge tone={MISSION_TONE[m.status]} className="hidden sm:inline-flex">{MISSION_LABEL[m.status]}</Badge>}
      />
      <Badge tone={MISSION_TONE[m.status]} className="mb-3 sm:hidden">{MISSION_LABEL[m.status]}</Badge>

      {m.agentId && !isMine && (
        <Notice tone="orange" className="mb-4">
          Cette mission est affectée à <b>{assigned?.name}</b>.{' '}
          <button onClick={() => setCurrentAgent(m.agentId!)} className="font-bold underline">Basculer sur cet agent (démo)</button>
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
        {/* Colonne action */}
        <div className="order-2 min-w-0 lg:order-1">
          {m.status === 'payee' && (
            <Card className="mb-4 flex items-center gap-3"><Hourglass className="text-accent-500" /><div><p className="font-bold">En attente d'affectation</p><p className="text-sm text-slate-500">L'affectation automatique est en cours.</p></div></Card>
          )}

          {isMine && m.status === 'agent_affecte' && (
            <ActionCard step="Étape 1" title="Choisissez une pharmacie proche du patient" icon={<Store size={18} />}>
              <PharmacyPicker from={m.deliveryPosition} onArrive={(pid) => agentArrive(m.id, pid)} />
            </ActionCard>
          )}

          {isMine && m.status === 'en_pharmacie' && (
            repick ? (
              <ActionCard step="Autre pharmacie" title="Choisissez une autre pharmacie" icon={<Store size={18} />}>
                <PharmacyPicker from={m.deliveryPosition} exclude={m.pharmacyId} onArrive={(pid) => { agentArrive(m.id, pid); setRepick(false) }} />
                <Button variant="ghost" className="mt-2 w-full" onClick={() => setRepick(false)}>Retour</Button>
              </ActionCard>
            ) : (
              <>
                <ActionCard step="Étape 2" title="Facture de la pharmacie" icon={<Receipt size={18} />}>
                  {prescription && <InvoiceForm mission={m} prescription={prescription} pharmacy={pharmacy} />}
                </ActionCard>
                <UnavailablePanel mission={m} onRepick={() => setRepick(true)} />
              </>
            )
          )}

          {m.status === 'ecart_prix' && (
            <Card className="mb-4 border-amber-300 bg-amber-50">
              <p className="flex items-center gap-2 font-bold text-amber-900"><Hourglass size={18} /> En attente de la décision du patient</p>
              <p className="mt-1 text-sm text-amber-900/80">
                Le montant de la facture ({fcfa(m.invoice?.amount ?? 0)}) dépasse l'estimation ({fcfa(m.estimate.medications)}). Le patient doit accepter ou refuser avant la suite.
              </p>
            </Card>
          )}

          {isMine && m.status === 'achat_effectue' && (
            <ActionCard step="Étape 3" title="Achat effectué — prêt pour la livraison" icon={<Truck size={18} />}>
              <p className="text-sm text-slate-600">Vérifiez que vous avez : les médicaments achetés, la <b>facture originale</b> de la pharmacie et le justificatif PHARMA CI.</p>
              <Button size="lg" variant="accent" className="mt-3 w-full" onClick={() => startDelivery(m.id)}><Navigation size={18} /> Démarrer la livraison</Button>
            </ActionCard>
          )}

          {isMine && m.status === 'en_route' && <DeliveryPanel mission={m} />}

          {m.status === 'livree' && (
            <Card className="mb-4 border-brand-300 bg-gradient-to-br from-brand-50 to-white">
              <p className="flex items-center gap-2 text-lg font-extrabold text-brand-800"><CheckCircle2 size={22} /> Mission terminée</p>
              <p className="mt-1 text-sm text-slate-600">Livraison confirmée par code OTP.</p>
              <p className="mt-3 flex items-center gap-2 text-2xl font-extrabold text-brand-700"><Wallet size={22} /> +{fcfa(agentEarning(m))}</p>
              <p className="text-xs text-slate-500">80 % de la livraison + 30 % du service</p>
              {m.rating && <p className="mt-2 text-sm">Note du patient : {((m.rating.agent.ponctualite + m.rating.agent.courtoisie + m.rating.agent.respect) / 3).toFixed(1)} ★</p>}
              <ButtonLink to="/agent" className="mt-3">Retour au tableau de bord</ButtonLink>
            </Card>
          )}

          {m.status === 'annulee' && (
            <Notice tone="red" icon={<XCircle size={16} />} className="mb-4">
              <b>Mission annulée.</b> {m.timeline.filter((t) => t.status === 'annulee').at(-1)?.label}
            </Notice>
          )}

          {/* Ordonnance */}
          <Section title="Ordonnance">
            <Card>
              {prescription ? (
                <>
                  <p className="font-mono text-sm font-bold">{prescription.id}</p>
                  {prescription.previews.length > 0 && (
                    <div className="scrollbar-none -mx-1 mt-2 flex gap-2 overflow-x-auto px-1">
                      {prescription.previews.map((src, i) => (
                        <a key={i} href={src} target="_blank" rel="noreferrer" className="h-32 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200">
                          <img src={src} alt={`Page ${i + 1}`} className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  <ul className="mt-3 divide-y divide-slate-100">
                    {prescription.lines.map((l) => (
                      <li key={l.id} className="flex items-start gap-2 py-2 text-sm">
                        <Pill size={16} className="mt-0.5 shrink-0 text-brand-600" />
                        <span className="min-w-0 flex-1 font-medium">{l.label}</span>
                        <span className="shrink-0 font-bold">×{l.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-slate-500">Ordonnance non disponible.</p>
              )}
            </Card>
          </Section>

          <Section title="Instructions">
            <Card className="bg-ink text-white">
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-brand-300" /> Présenter l'ordonnance au pharmacien.</li>
                <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-brand-300" /> Acheter <b>uniquement</b> les produits prescrits.</li>
                <li className="flex gap-2"><Ban size={16} className="mt-0.5 shrink-0 text-red-300" /> Ne <b>jamais substituer</b> un médicament prescrit.</li>
                <li className="flex gap-2"><Receipt size={16} className="mt-0.5 shrink-0 text-brand-300" /> Récupérer la <b>facture originale</b> et la photographier.</li>
              </ul>
            </Card>
          </Section>

          <Section title="Chronologie">
            <Card>
              <ol className="space-y-2">
                {[...m.timeline].reverse().map((t, i) => (
                  <li key={i} className="flex gap-3 text-sm"><span className="w-12 shrink-0 font-mono text-xs text-slate-400">{timeFr(t.at)}</span><span>{t.label}</span></li>
                ))}
              </ol>
            </Card>
          </Section>
        </div>

        {/* Colonne patient */}
        <aside className="order-1 min-w-0 lg:order-2">
          <Card className="mb-4 overflow-hidden p-0">
            <MapView markers={markers} route={route} className="h-56 lg:h-72" />
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</p>
              <p className="text-lg font-bold">{m.patientName.split(' ')[0]}</p>
              <p className="flex items-start gap-1.5 text-sm text-slate-600"><MapPin size={14} className="mt-0.5 shrink-0" /> {m.deliveryAddress}</p>
              <a href={directionsUrl(m.status === 'agent_affecte' || !pharmacy || m.status === 'en_route' || m.status === 'achat_effectue' ? m.deliveryPosition : pharmacy.position)} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                <Navigation size={14} /> Itinéraire
              </a>
            </div>
          </Card>
          <Card className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Budget estimatif médicaments</p>
            <p className="text-2xl font-extrabold tabular-nums">{fcfa(m.estimate.medications)}</p>
            <p className="mt-1 text-xs text-slate-500">Montant indicatif. Le montant réel est celui de la facture de la pharmacie. Tout dépassement est soumis à l'accord du patient.</p>
            {pharmacy && <p className="mt-3 border-t border-slate-100 pt-2 text-sm">💊 <b>{pharmacy.name}</b><span className="block text-xs text-slate-500">{pharmacy.address}</span></p>}
          </Card>
        </aside>
      </div>
    </div>
  )
}

function ActionCard({ step, title, icon, children }: { step: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="mb-4 border-accent-300 shadow-md shadow-accent-500/5">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-500 text-white">{icon}</span>
        <div><p className="text-xs font-bold uppercase tracking-wide text-accent-600">{step}</p><p className="font-bold leading-tight">{title}</p></div>
      </div>
      {children}
    </Card>
  )
}

function PharmacyPicker({ from, exclude, onArrive }: { from: LatLng; exclude?: string; onArrive: (pharmacyId: string) => void }) {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<string>()
  const list = useMemo(() => {
    const now = new Date()
    const n = normalize(q)
    return PHARMACIES.filter((p) => p.id !== exclude && (!n || normalize(`${p.name} ${p.commune}`).includes(n)))
      .map((p) => ({ p, km: distanceKm(from, p.position), open: openInfo(p, now) }))
      .sort((a, b) => (a.open.state === 'closed' ? 1 : 0) - (b.open.state === 'closed' ? 1 : 0) || a.km - b.km)
      .slice(0, 8)
  }, [from, exclude, q])

  return (
    <div>
      <div className="relative mb-2">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une pharmacie…" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-sm outline-none focus:border-brand-400" />
      </div>
      <ul className="space-y-1.5">
        {list.map(({ p, km, open }) => (
          <li key={p.id}>
            <button
              onClick={() => setSelected(p.id)}
              className={cx('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition', selected === p.id ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/15' : 'border-slate-200 hover:bg-slate-50')}
            >
              <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', selected === p.id ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300')}>{selected === p.id && <Check size={12} />}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{p.name}</span>
                <span className="block truncate text-xs text-slate-500">{p.commune} · {formatDistance(km)}{!p.claimed && ' · non partenaire'}</span>
              </span>
              <OpenBadge state={open.state} label={open.label} />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500">Toutes les pharmacies sont autorisées, partenaires ou non.</p>
      <Button size="lg" className="mt-3 w-full" disabled={!selected} onClick={() => selected && onArrive(selected)}>
        <MapPin size={18} /> Je suis arrivé(e) à la pharmacie
      </Button>
    </div>
  )
}

type DraftLine = { label: string; quantity: number; amount: number; obtained: boolean }

function InvoiceForm({ mission, prescription, pharmacy }: { mission: Mission; prescription: Prescription; pharmacy?: Pharmacy }) {
  const submitInvoice = useStore((s) => s.submitInvoice)
  const fileRef = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<string>()
  const [name, setName] = useState(pharmacy?.name ?? '')
  const [date, setDate] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  })
  const [lines, setLines] = useState<DraftLine[]>(() =>
    prescription.lines.map((l) => {
      const med = medById(l.medicationId)
      return { label: l.label, quantity: l.quantity, amount: med?.price ? med.price.amount * Math.max(1, l.quantity) : 0, obtained: true }
    }),
  )
  const total = lines.reduce((s, l) => s + (l.obtained ? l.amount || 0 : 0), 0)
  const patch = (i: number, p: Partial<DraftLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)))

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) setPhoto(await imagePreview(f, 1000))
  }

  const submit = () => {
    if (!photo || !name.trim() || !lines.some((l) => l.obtained)) return
    submitInvoice(mission.id, {
      pharmacyName: name.trim(), pharmacyId: pharmacy?.id, amount: total, date: new Date(date).toISOString(), photo,
      lines: lines.map((l) => ({ ...l, amount: l.obtained ? l.amount || 0 : 0 })),
    })
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
      {photo ? (
        <div className="relative mb-3 overflow-hidden rounded-xl border border-slate-200">
          <img src={photo} alt="Facture" className="max-h-64 w-full object-contain bg-slate-50" />
          <button onClick={() => fileRef.current?.click()} className="absolute right-2 bottom-2 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold shadow">Reprendre</button>
        </div>
      ) : (
        <div className="mb-3">
          <Button size="lg" variant="outline" className="w-full border-dashed" onClick={() => fileRef.current?.click()}><Camera size={18} /> 📸 Photographier la facture originale</Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Pharmacie" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Date de la facture" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <p className="mt-4 mb-2 text-sm font-semibold text-slate-700">Produits prescrits</p>
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className={cx('rounded-xl border p-3', l.obtained ? 'border-slate-200' : 'border-red-200 bg-red-50/50')}>
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={l.obtained} onChange={(e) => patch(i, { obtained: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-500" />
              <span className="min-w-0 text-sm font-medium">{l.label}<span className={cx('block text-xs', l.obtained ? 'text-brand-700' : 'text-red-600')}>{l.obtained ? 'Obtenu' : 'Non obtenu'}</span></span>
            </label>
            {l.obtained && (
              <div className="mt-2 grid grid-cols-[5rem_1fr] gap-2">
                <Input label="Qté" type="number" min={1} inputMode="numeric" value={l.quantity} onChange={(e) => patch(i, { quantity: Number(e.target.value) })} />
                <Input label="Montant (FCFA)" type="number" min={0} inputMode="numeric" value={l.amount} onChange={(e) => patch(i, { amount: Number(e.target.value) })} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-ink px-4 py-3 text-white">
        <span className="text-sm font-semibold">Total facture</span>
        <span className="text-lg font-extrabold tabular-nums">{fcfa(total)}</span>
      </div>
      {total > mission.estimate.medications && <p className="mt-2 text-xs font-semibold text-amber-700">Montant supérieur au budget estimatif : le patient devra l'accepter.</p>}
      {lines.some((l) => !l.obtained) && <p className="mt-1 text-xs font-semibold text-amber-700">Exécution partielle : le patient en sera informé.</p>}

      <Button size="lg" className="mt-3 w-full" onClick={submit} disabled={!photo || !name.trim() || !lines.some((l) => l.obtained)}>
        <Receipt size={18} /> Envoyer la facture
      </Button>
      {!photo && <p className="mt-1 text-center text-xs text-slate-500">La photo de la facture originale est obligatoire.</p>}
    </div>
  )
}

const UNAVAILABLE_OPTIONS = [
  { id: 'autre_pharmacie', label: 'Chercher une autre pharmacie', icon: '🔎' },
  { id: 'informer', label: 'Informer le patient', icon: '📣' },
  { id: 'partielle', label: 'Exécution partielle', icon: '🧩' },
  { id: 'annuler', label: 'Annuler la mission', icon: '⛔' },
] as const

function UnavailablePanel({ mission, onRepick }: { mission: Mission; onRepick: () => void }) {
  const reportUnavailable = useStore((s) => s.reportUnavailable)
  const [open, setOpen] = useState(false)
  const [option, setOption] = useState<(typeof UNAVAILABLE_OPTIONS)[number]['id']>('autre_pharmacie')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState('')

  const send = () => {
    if (option === 'annuler' && !window.confirm('Annuler la mission ? L\'ordonnance du patient sera déverrouillée.')) return
    reportUnavailable(mission.id, option, note.trim())
    setSent(UNAVAILABLE_OPTIONS.find((o) => o.id === option)!.label)
    setNote('')
    if (option === 'autre_pharmacie') onRepick()
    setOpen(false)
  }

  return (
    <Card className="mb-4 border-red-200">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600"><AlertTriangle size={18} /></span>
        <span className="min-w-0 flex-1"><span className="block font-bold">Médicament indisponible ?</span><span className="block text-xs text-slate-500">Choisissez la conduite à tenir</span></span>
        <span className="text-sm font-semibold text-red-600">{open ? 'Fermer' : 'Signaler'}</span>
      </button>
      <Notice tone="red" icon={<Ban size={16} />} className="mt-3">
        <b>Remplacement d'un médicament prescrit interdit</b> sans avis du prescripteur ou du pharmacien.
      </Notice>
      {sent && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-700"><ClipboardCheck size={14} /> Signalement envoyé : {sent}</p>}
      {open && (
        <div className="mt-3">
          <div className="grid grid-cols-2 gap-2">
            {UNAVAILABLE_OPTIONS.map((o) => (
              <button key={o.id} onClick={() => setOption(o.id)} className={cx('rounded-xl border p-3 text-left text-sm font-semibold transition', option === o.id ? 'border-red-400 bg-red-50 ring-2 ring-red-500/10' : 'border-slate-200 hover:bg-slate-50')}>
                <span className="mb-1 block text-xl">{o.icon}</span>{o.label}
              </button>
            ))}
          </div>
          <Textarea className="mt-3" label="Précisions (produit concerné…)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button variant={option === 'annuler' ? 'danger' : 'primary'} className="mt-3 w-full" onClick={send}>Valider</Button>
        </div>
      )}
    </Card>
  )
}

function DeliveryPanel({ mission }: { mission: Mission }) {
  const confirmDelivery = useStore((s) => s.confirmDelivery)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [checks, setChecks] = useState([false, false, false])
  const items = ['Médicaments remis', 'Facture originale de la pharmacie remise', 'Justificatif PHARMA CI remis']
  const ready = checks.every(Boolean) && code.trim().length === 4

  const submit = () => {
    if (!confirmDelivery(mission.id, code)) setError('Code incorrect. Demandez au patient le code affiché dans son application.')
  }

  return (
    <ActionCard step="Étape 4" title="Livraison en cours" icon={<Truck size={18} />}>
      <div className="mb-3 flex items-center gap-3 rounded-xl bg-accent-50 p-3">
        <Clock className="text-accent-600" size={20} />
        <div><p className="text-xs font-semibold uppercase text-accent-700">Arrivée estimée</p><p className="text-lg font-extrabold">{mission.eta ? `~${mission.eta} min` : 'Vous êtes arrivé(e)'}</p></div>
      </div>
      <p className="mb-2 text-sm font-semibold">À la remise :</p>
      <div className="space-y-1.5">
        {items.map((label, i) => (
          <label key={label} className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-sm">
            <input type="checkbox" checked={checks[i]} onChange={(e) => setChecks((c) => c.map((x, j) => (j === i ? e.target.checked : x)))} className="h-5 w-5 accent-brand-500" />
            {label}
          </label>
        ))}
      </div>
      <label className="mt-4 block">
        <span className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><KeyRound size={14} /> Code communiqué par le patient</span>
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="• • • •"
          className={cx('w-full rounded-xl border bg-white px-4 py-3 text-center font-mono text-3xl font-extrabold tracking-[0.5em] outline-none focus:ring-4', error ? 'border-red-400 focus:ring-red-500/10' : 'border-slate-200 focus:border-brand-400 focus:ring-brand-500/10')}
        />
      </label>
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      <Button size="lg" className="mt-3 w-full" disabled={!ready} onClick={submit}><CheckCircle2 size={18} /> Confirmer la livraison</Button>
      <p className="mt-2 text-center text-xs text-slate-500">Le code n'est visible que par le patient.</p>
      <Link to="/agent" className="mt-2 block text-center text-xs text-slate-400 hover:text-ink">Tableau de bord</Link>
    </ActionCard>
  )
}
