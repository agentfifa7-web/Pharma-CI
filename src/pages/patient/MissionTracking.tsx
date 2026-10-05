import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle, Check, CheckCircle2, Clock, Download, ExternalLink, FileText, KeyRound, Phone, Receipt, Star, Truck, XCircle,
} from 'lucide-react'
import type { LatLng, Mission } from '../../types'
import { MISSION_LABEL, useStore } from '../../store/useStore'
import { Badge, Button, ButtonLink, Card, EmptyState, Modal, Notice, PageHeader, Section, Select, Stars, Textarea, cx } from '../../components/ui'
import MapView, { type MapMarker } from '../../components/MapView'
import { pharmacyById } from '../../services/pharmacyProvider'
import { VEHICLE_LABEL } from '../../data/agents'
import { dateTimeFr, fcfa, initials, timeFr } from '../../lib/format'
import { MISSION_STEPS, MISSION_TONE, downloadText, missionStepIndex } from '../../data/statusUi'

const CANCEL_REASONS = [
  'Je n\'ai plus besoin des médicaments',
  'Je me suis trompé(e) d\'ordonnance',
  'Délai trop long',
  'Je vais me rendre moi-même en pharmacie',
  'Autre raison',
]

export default function MissionTracking() {
  const { id = '' } = useParams()
  const missions = useStore((s) => s.missions)
  const agents = useStore((s) => s.agents)
  const prescriptions = useStore((s) => s.prescriptions)
  const decidePrice = useStore((s) => s.decidePrice)
  const cancelMission = useStore((s) => s.cancelMission)
  const rateMission = useStore((s) => s.rateMission)

  const m = missions.find((x) => x.id === id)
  const agent = agents.find((a) => a.id === m?.agentId)
  const pharmacy = pharmacyById(m?.pharmacyId)
  const prescription = prescriptions.find((p) => p.id === m?.prescriptionId)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState(CANCEL_REASONS[0]!)
  const [reasonText, setReasonText] = useState('')

  const markers = useMemo<MapMarker[]>(() => {
    if (!m) return []
    const list: MapMarker[] = [{ id: 'home', position: m.deliveryPosition, color: '#0f1f1a', glyph: '🏠', size: 34, popup: <b>Adresse de livraison</b> }]
    if (pharmacy) list.push({ id: 'ph', position: pharmacy.position, color: '#009e60', glyph: '💊', popup: <b>{pharmacy.name}</b> })
    if (m.agentPosition && m.status !== 'livree' && m.status !== 'annulee')
      list.push({ id: 'agent', position: m.agentPosition, color: '#f77f00', glyph: '🛵', size: 38, pulse: true, popup: <b>{agent?.name ?? 'Agent'}</b> })
    return list
  }, [m, pharmacy, agent])

  const route = useMemo<LatLng[] | undefined>(() => {
    if (!m || !m.agentPosition || m.status === 'livree' || m.status === 'annulee') return undefined
    if (m.status === 'en_route' || m.status === 'achat_effectue') return [m.agentPosition, m.deliveryPosition]
    if (pharmacy) return m.status === 'agent_affecte' ? [m.agentPosition, pharmacy.position, m.deliveryPosition] : [pharmacy.position, m.deliveryPosition]
    return [m.agentPosition, m.deliveryPosition]
  }, [m, pharmacy])

  if (!m) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Mission introuvable" back="/missions" icon={<Truck size={22} />} />
        <EmptyState icon={<Truck size={26} />} title="Cette mission n'existe pas" action={<ButtonLink to="/missions">Mes missions</ButtonLink>} />
      </div>
    )
  }

  const stepIdx = missionStepIndex(m.status)
  const cancellable = m.status === 'payee' || m.status === 'agent_affecte' || m.status === 'en_pharmacie'
  const showOtp = m.status === 'en_route' || m.status === 'achat_effectue'
  const done = m.status === 'livree'
  const gap = m.invoice ? m.invoice.amount - m.estimate.medications : 0

  const doCancel = () => {
    const r = reason === 'Autre raison' ? reasonText.trim() || 'Autre raison' : reason
    cancelMission(m.id, r)
    setCancelOpen(false)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Suivi de mission"
        subtitle={`${m.id} · ${m.patientName}`}
        icon={<Truck size={22} />}
        back="/missions"
        action={<Badge tone={MISSION_TONE[m.status]} className="hidden sm:inline-flex">{MISSION_LABEL[m.status]}</Badge>}
      />

      {/* Stepper */}
      {m.status === 'annulee' ? (
        <Notice tone="red" icon={<XCircle size={16} />} className="mb-4">
          <p className="font-bold">Mission annulée</p>
          <p>{m.timeline.filter((t) => t.status === 'annulee').at(-1)?.label}</p>
          {prescription && <Link to={`/ordonnances/${prescription.id}`} className="mt-1 inline-block font-semibold underline">L'ordonnance {prescription.id} est déverrouillée</Link>}
        </Notice>
      ) : (
        <Card className="mb-4">
          <div className="flex items-center justify-between gap-2 sm:hidden">
            <Badge tone={MISSION_TONE[m.status]}>{MISSION_LABEL[m.status]}</Badge>
            {m.eta != null && m.eta > 0 && !done && <span className="flex items-center gap-1 text-sm font-bold text-accent-600"><Clock size={14} /> ~{m.eta} min</span>}
          </div>
          <ol className="mt-3 grid grid-cols-6 gap-1 sm:mt-0">
            {MISSION_STEPS.map((s, i) => {
              const state = i < stepIdx || done ? 'done' : i === stepIdx ? 'current' : 'todo'
              return (
                <li key={s.key} className="flex flex-col items-center text-center">
                  <div className="flex w-full items-center">
                    <div className={cx('h-1 flex-1 rounded', i === 0 ? 'invisible' : i <= stepIdx ? 'bg-brand-500' : 'bg-slate-200')} />
                    <span
                      className={cx(
                        'grid h-9 w-9 shrink-0 place-items-center rounded-full text-base transition',
                        state === 'done' && 'bg-brand-500 text-white',
                        state === 'current' && 'bg-accent-500 text-white ring-4 ring-accent-500/20',
                        state === 'todo' && 'bg-slate-100 text-slate-400 grayscale',
                      )}
                    >
                      {state === 'done' ? <Check size={16} /> : s.emoji}
                    </span>
                    <div className={cx('h-1 flex-1 rounded', i === MISSION_STEPS.length - 1 ? 'invisible' : i < stepIdx ? 'bg-brand-500' : 'bg-slate-200')} />
                  </div>
                  <span className={cx('mt-1.5 text-[10px] leading-tight font-semibold sm:text-xs', state === 'current' ? 'text-accent-600' : state === 'done' ? 'text-ink' : 'text-slate-400')}>{s.label}</span>
                </li>
              )
            })}
          </ol>
        </Card>
      )}

      {/* Écart de prix */}
      {m.status === 'ecart_prix' && m.invoice && (
        <div className="mb-4 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 shadow-sm">
          <p className="flex items-start gap-2 text-base font-extrabold text-amber-900"><AlertTriangle className="mt-0.5 shrink-0" size={20} /> ⚠️ Le montant réel de la pharmacie est supérieur à l'estimation</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">Estimation</p><p className="text-lg font-extrabold tabular-nums">{fcfa(m.estimate.medications)}</p></div>
            <div className="rounded-xl bg-white p-3 ring-2 ring-amber-400"><p className="text-xs text-slate-500">Facture pharmacie</p><p className="text-lg font-extrabold tabular-nums text-amber-700">{fcfa(m.invoice.amount)}</p></div>
          </div>
          <p className="mt-2 text-sm text-amber-900">Différence : <b>+{fcfa(gap)}</b>. Les médicaments sont facturés par la pharmacie ; acceptez-vous ce montant ?</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" className="border-red-200 text-red-700" onClick={() => decidePrice(m.id, 'refuse')}><XCircle size={16} /> Refuser</Button>
            <Button onClick={() => decidePrice(m.id, 'accepte')}><Check size={16} /> Accepter</Button>
          </div>
          <p className="mt-2 text-xs text-amber-800">En cas de refus, la mission est annulée et l'ordonnance déverrouillée.</p>
        </div>
      )}

      {/* OTP */}
      {showOtp && (
        <div className="mb-4 rounded-2xl bg-gradient-to-br from-ink to-brand-900 p-5 text-center text-white shadow-lg">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-white/80"><KeyRound size={16} /> Votre code de livraison</p>
          <p className="mt-2 font-mono text-5xl font-extrabold tracking-[0.35em] tabular-nums">{m.otp}</p>
          <p className="mt-2 text-sm text-white/80">Communiquez ce code à l'agent à son arrivée.</p>
          <p className="mt-1 text-xs text-white/50">Ne le partagez jamais avant d'avoir reçu vos médicaments et la facture originale.</p>
        </div>
      )}

      {/* Terminée */}
      {done && (
        <Card className="mb-4 border-brand-300 bg-gradient-to-br from-brand-50 to-white">
          <p className="flex items-center gap-2 text-xl font-extrabold text-brand-800"><CheckCircle2 size={24} /> MISSION TERMINÉE ✅</p>
          <p className="mt-1 text-sm text-slate-600">Vous avez reçu :</p>
          <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
            <li className="rounded-xl bg-white p-3 ring-1 ring-brand-100">💊 <b>Vos médicaments</b>{m.partial && <span className="block text-xs text-amber-700">Exécution partielle</span>}</li>
            <li className="rounded-xl bg-white p-3 ring-1 ring-brand-100">🧾 <b>La facture originale</b><span className="block text-xs text-slate-500">émise par la pharmacie</span></li>
            <li className="rounded-xl bg-white p-3 ring-1 ring-brand-100">📄 <b>Le justificatif PHARMA CI</b><span className="block text-xs text-slate-500">service & livraison</span></li>
          </ul>
          <Button variant="outline" className="mt-3 w-full sm:w-auto" onClick={() => downloadReceipt(m, agent?.name, pharmacy?.name)}><Download size={16} /> Télécharger le justificatif</Button>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          {m.status !== 'annulee' && (
            <Card className="mb-4 overflow-hidden p-0">
              <div className="relative">
                <MapView markers={markers} route={route} className="h-72 sm:h-96" />
                {m.eta != null && m.eta > 0 && !done && (
                  <div className="pointer-events-none absolute top-3 left-3 z-[500] rounded-xl bg-white/95 px-3 py-2 shadow-md">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Arrivée estimée</p>
                    <p className="text-lg font-extrabold text-accent-600">~{m.eta} min</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2.5 text-xs text-slate-500">
                <span>🛵 Agent</span><span>💊 Pharmacie</span><span>🏠 {m.deliveryAddress}</span>
              </div>
            </Card>
          )}

          {/* Estimation vs facture */}
          <Section title="Montants">
            <Card>
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-2 text-sm">
                <span className="text-xs font-semibold uppercase text-slate-400" />
                <span className="text-right text-xs font-semibold uppercase text-slate-400">Estimé</span>
                <span className="text-right text-xs font-semibold uppercase text-slate-400">Réel</span>
                <span className="text-slate-600">💊 Médicaments</span>
                <span className="text-right tabular-nums">{fcfa(m.estimate.medications)}</span>
                <span className={cx('text-right font-semibold tabular-nums', gap > 0 && 'text-amber-700')}>{m.invoice ? fcfa(m.invoice.amount) : '—'}</span>
                <span className="text-slate-600">🧑🏾‍💼 Service PHARMA CI</span>
                <span className="text-right tabular-nums">{fcfa(m.estimate.service)}</span>
                <span className="text-right font-semibold tabular-nums">{fcfa(m.estimate.service)}</span>
                <span className="text-slate-600">🚚 Livraison</span>
                <span className="text-right tabular-nums">{fcfa(m.estimate.delivery)}</span>
                <span className="text-right font-semibold tabular-nums">{fcfa(m.estimate.delivery)}</span>
              </div>
              <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500">
                Service et livraison payés via {m.paymentMethod}. Le montant définitif des médicaments correspond à la facture émise par la pharmacie.
              </p>
            </Card>
          </Section>

          {/* Facture */}
          {m.invoice && (
            <Section title="Facture de la pharmacie">
              <Card>
                <div className="flex flex-col gap-3 sm:flex-row">
                  {m.invoice.photo && (
                    <a href={m.invoice.photo} target="_blank" rel="noreferrer" className="block h-40 shrink-0 overflow-hidden rounded-xl border border-slate-200 sm:w-32">
                      <img src={m.invoice.photo} alt="Facture" className="h-full w-full object-cover" />
                    </a>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{m.invoice.pharmacyName}</p>
                    <p className="text-xs text-slate-500">{dateTimeFr(m.invoice.date)}</p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {m.invoice.lines.map((l, i) => (
                        <li key={i} className="flex items-start justify-between gap-2">
                          <span className={cx('min-w-0', !l.obtained && 'text-slate-400 line-through')}>
                            {l.obtained ? '✅' : '❌'} {l.label} <span className="text-xs text-slate-400">×{l.quantity}</span>
                          </span>
                          <span className="shrink-0 tabular-nums">{l.obtained ? fcfa(l.amount) : 'non obtenu'}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 flex justify-between border-t border-slate-100 pt-2 font-bold"><span>Total pharmacie</span><span className="tabular-nums">{fcfa(m.invoice.amount)}</span></p>
                  </div>
                </div>
                {m.partial && (
                  <Notice tone="orange" className="mt-3">
                    <b>Exécution partielle :</b> certains produits prescrits n'ont pas pu être obtenus. Aucun remplacement n'a été effectué sans l'avis du prescripteur ou du pharmacien.
                  </Notice>
                )}
              </Card>
            </Section>
          )}

          {m.unavailableNote && !m.invoice && (
            <Notice tone="orange" className="mb-6"><b>Information de l'agent :</b> {m.unavailableNote}</Notice>
          )}

          {/* Notation */}
          {done && <RatingBlock mission={m} onRate={(r) => rateMission(m.id, r)} />}
        </div>

        <aside className="min-w-0">
          {/* Agent */}
          <Section title="Votre agent">
            {agent ? (
              <Card>
                <div className="flex items-center gap-3">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent-500 text-lg font-extrabold text-white">{initials(agent.name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{agent.name}</p>
                    <p className="flex items-center gap-1 text-sm text-slate-500"><Star size={14} className="fill-accent-400 text-accent-400" /> {agent.rating.toFixed(1)} · {VEHICLE_LABEL[agent.vehicle]}</p>
                    <p className="text-xs text-slate-400">{agent.completed} missions réalisées</p>
                  </div>
                </div>
                {!done && (
                  <a href={`tel:${agent.phone.replace(/\s/g, '')}`} className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
                    <Phone size={16} /> Appeler l'agent
                  </a>
                )}
                {pharmacy && <p className="mt-3 text-sm text-slate-600">💊 Pharmacie : <Link to={`/pharmacies/${pharmacy.id}`} className="font-semibold text-brand-600 hover:underline">{pharmacy.name}</Link></p>}
              </Card>
            ) : m.status === 'payee' ? (
              <Card className="flex items-center gap-3">
                <span className="relative grid h-12 w-12 place-items-center text-accent-500"><span className="pulse-ring absolute inset-0 rounded-full" /><span className="relative text-2xl">🛵</span></span>
                <div><p className="font-bold">Recherche de l'agent le plus proche…</p><p className="text-sm text-slate-500">Affectation automatique en cours</p></div>
              </Card>
            ) : (
              <Card><p className="text-sm text-slate-500">Aucun agent affecté.</p></Card>
            )}
          </Section>

          {/* Timeline */}
          <Section title="Chronologie">
            <Card>
              <ol className="relative space-y-4 border-l-2 border-slate-100 pl-5">
                {[...m.timeline].reverse().map((t, i) => (
                  <li key={i} className="relative">
                    <span className={cx('absolute top-1 -left-[27px] h-3 w-3 rounded-full ring-4 ring-white', i === 0 ? 'bg-accent-500' : t.status === 'annulee' ? 'bg-red-400' : 'bg-brand-400')} />
                    <p className="text-sm leading-snug font-medium">{t.label}</p>
                    <p className="text-xs text-slate-400">{timeFr(t.at)}</p>
                  </li>
                ))}
              </ol>
            </Card>
          </Section>

          {prescription && (
            <Link to={`/ordonnances/${prescription.id}`} className="mb-3 flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold ring-1 ring-slate-200 hover:bg-slate-50">
              <FileText size={16} className="text-brand-600" /> Ordonnance {prescription.id}
            </Link>
          )}

          {cancellable && (
            <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50" onClick={() => setCancelOpen(true)}>
              <XCircle size={16} /> Annuler la mission
            </Button>
          )}

          <Link to={`/agent/missions/${m.id}`} target="_blank" className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-ink">
            <ExternalLink size={12} /> Ouvrir l'app Agent (démo)
          </Link>
        </aside>
      </div>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Annuler la mission">
        <p className="mb-3 text-sm text-slate-600">L'annulation est possible tant que les médicaments n'ont pas été achetés. Votre ordonnance sera déverrouillée.</p>
        <Select label="Motif" value={reason} onChange={(e) => setReason(e.target.value)}>
          {CANCEL_REASONS.map((r) => <option key={r}>{r}</option>)}
        </Select>
        {reason === 'Autre raison' && <Textarea className="mt-3" label="Précisez" value={reasonText} onChange={(e) => setReasonText(e.target.value)} />}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setCancelOpen(false)}>Retour</Button>
          <Button variant="danger" onClick={doCancel}>Confirmer l'annulation</Button>
        </div>
      </Modal>
    </div>
  )
}

function RatingBlock({ mission, onRate }: { mission: Mission; onRate: (r: NonNullable<Mission['rating']>) => void }) {
  const [agent, setAgent] = useState({ ponctualite: 0, courtoisie: 0, respect: 0 })
  const [service, setService] = useState({ rapidite: 0, qualite: 0 })
  const [comment, setComment] = useState('')

  if (mission.rating) {
    const r = mission.rating
    return (
      <Section title="Votre évaluation">
        <Card className="bg-brand-50/50">
          <p className="mb-2 font-semibold text-brand-800">Merci pour votre avis ! 🙏</p>
          <RateRow label="Ponctualité" value={r.agent.ponctualite} />
          <RateRow label="Courtoisie" value={r.agent.courtoisie} />
          <RateRow label="Respect de la mission" value={r.agent.respect} />
          <RateRow label="Rapidité du service" value={r.service.rapidite} />
          <RateRow label="Qualité du service" value={r.service.qualite} />
          {r.comment && <p className="mt-2 rounded-xl bg-white p-3 text-sm italic text-slate-600">« {r.comment} »</p>}
        </Card>
      </Section>
    )
  }

  const complete = Object.values(agent).every((v) => v > 0) && Object.values(service).every((v) => v > 0)
  return (
    <Section title="Notez votre expérience">
      <Card>
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">L'agent</p>
        <RateRow label="Ponctualité" value={agent.ponctualite} onChange={(v) => setAgent({ ...agent, ponctualite: v })} />
        <RateRow label="Courtoisie" value={agent.courtoisie} onChange={(v) => setAgent({ ...agent, courtoisie: v })} />
        <RateRow label="Respect de la mission" value={agent.respect} onChange={(v) => setAgent({ ...agent, respect: v })} />
        <p className="mt-3 mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Le service PHARMA CI</p>
        <RateRow label="Rapidité" value={service.rapidite} onChange={(v) => setService({ ...service, rapidite: v })} />
        <RateRow label="Qualité" value={service.qualite} onChange={(v) => setService({ ...service, qualite: v })} />
        <Textarea className="mt-3" label="Commentaire (facultatif)" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Votre avis nous aide à améliorer le service" />
        <Button className="mt-3 w-full" disabled={!complete} onClick={() => onRate({ agent, service, comment: comment.trim() || undefined })}>
          <Receipt size={16} /> Envoyer mon évaluation
        </Button>
      </Card>
    </Section>
  )
}

function RateRow({ label, value, onChange }: { label: string; value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm">{label}</span>
      <Stars value={value} onChange={onChange} size={onChange ? 24 : 18} />
    </div>
  )
}

function downloadReceipt(m: Mission, agentName?: string, pharmacyName?: string) {
  const sep = '----------------------------------------'
  const lines = [
    'PHARMA CI — JUSTIFICATIF DE SERVICE',
    sep,
    `Mission : ${m.id}`,
    `Ordonnance : ${m.prescriptionId}`,
    `Patient : ${m.patientName}`,
    `Adresse de livraison : ${m.deliveryAddress}`,
    `Date de la mission : ${dateTimeFr(m.createdAt)}`,
    `Livraison confirmée : ${dateTimeFr(m.timeline.find((t) => t.status === 'livree')?.at ?? new Date().toISOString())}`,
    `Agent : ${agentName ?? '—'}`,
    `Pharmacie : ${pharmacyName ?? m.invoice?.pharmacyName ?? '—'}`,
    sep,
    'SERVICE PHARMA CI (facturé par PHARMA CI)',
    `  Service : ${fcfa(m.estimate.service)}`,
    `  Livraison : ${fcfa(m.estimate.delivery)}`,
    `  Total payé (${m.paymentMethod}) : ${fcfa(m.estimate.service + m.estimate.delivery)}`,
    sep,
    'MÉDICAMENTS (facturés par la pharmacie — voir facture originale)',
    ...(m.invoice?.lines.map((l) => `  ${l.obtained ? '[x]' : '[ ]'} ${l.label} x${l.quantity} : ${l.obtained ? fcfa(l.amount) : 'non obtenu'}`) ?? ['  —']),
    `  Montant facture pharmacie : ${m.invoice ? fcfa(m.invoice.amount) : '—'}`,
    m.partial ? '  Exécution partielle : certains produits prescrits n\'ont pas été obtenus.' : '',
    sep,
    'PHARMA CI ne vend pas de médicaments. La facture originale émise par la pharmacie fait foi',
    'pour le montant des médicaments. Document généré en version de démonstration.',
  ]
  downloadText(`justificatif-${m.id}.txt`, lines.filter((l) => l !== '').join('\n'))
}
