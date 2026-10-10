import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Check, ChevronRight, CreditCard, FileText, History, Loader2, Lock, MapPin, Pill, Receipt, RefreshCw, Rocket, ShieldCheck, Trash2, Truck,
} from 'lucide-react'
import { MISSION_LABEL, PRESCRIPTION_LABEL, useStore } from '../../store/useStore'
import { Badge, Button, ButtonLink, Card, EmptyState, Input, Modal, Notice, PageHeader, PriceLevelBadge, Section, cx } from '../../components/ui'
import { buildEstimate } from '../../lib/pricing'
import { usePharmacies } from '../../lib/usePharmacies'
import { dateTimeFr, fcfa } from '../../lib/format'
import { medById } from '../../data/medications'
import { sharedMissionsAvailable } from '../../lib/sync'
import { MISSION_TONE, PAYMENT_METHODS, PRESCRIPTION_TONE, RELATION_LABEL, missionAgent } from '../../data/statusUi'

export default function PrescriptionDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const prescriptions = useStore((s) => s.prescriptions)
  const missions = useStore((s) => s.missions)
  const agents = useStore((s) => s.agents)
  const profiles = useStore((s) => s.profiles)
  const user = useStore((s) => s.user)
  const locationGranted = useStore((s) => s.locationGranted)
  const logAccess = useStore((s) => s.logAccess)
  const confirmPrescription = useStore((s) => s.confirmPrescription)
  const requestRenewal = useStore((s) => s.requestRenewal)
  const deletePrescription = useStore((s) => s.deletePrescription)
  const launchMission = useStore((s) => s.launchMission)
  const pharmacies = usePharmacies()

  const p = prescriptions.find((x) => x.id === id)
  const mission = p?.missionId ? missions.find((m) => m.id === p.missionId) : undefined
  const agent = missionAgent(mission, agents)
  const profile = profiles.find((x) => x.id === p?.profileId)

  const [address, setAddress] = useState(user.address ?? '')
  const [phone, setPhone] = useState(user.phone ?? '')
  const setUser = useStore((s) => s.setUser)
  const [method, setMethod] = useState(PAYMENT_METHODS[0]!.id)
  const [paying, setPaying] = useState(false)
  const [zoom, setZoom] = useState<string | null>(null)
  const [renewOpen, setRenewOpen] = useState(false)

  useEffect(() => {
    if (id) logAccess('Patient', 'Consultation ordonnance', id)
  }, [id, logAccess])

  const nearest = pharmacies[0]
  const estimate = useMemo(
    () => (p && nearest ? buildEstimate(p.lines, nearest.position, user.position) : undefined),
    [p, nearest, user.position],
  )

  if (!p) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Ordonnance introuvable" back="/ordonnances" icon={<FileText size={22} />} />
        <EmptyState icon={<FileText size={26} />} title="Cette ordonnance n'existe pas ou a été supprimée" action={<ButtonLink to="/ordonnances">Mes ordonnances</ButtonLink>} />
      </div>
    )
  }

  const canPay = p.confirmed && !p.locked && ['nouvelle', 'en_attente', 'annulee', 'renouvellement'].includes(p.status)
  const canRenew = (p.status === 'livree' || p.status === 'partiellement_executee') && (!mission || mission.status === 'livree')

  const pay = async () => {
    if (!estimate || !address.trim() || !phone.trim()) return
    setPaying(true)
    if (phone.trim() !== user.phone) setUser({ phone: phone.trim() })
    // Mission partagée avec les agents si la base du service est activée (sinon : démonstration sur cet appareil).
    const remote = await sharedMissionsAvailable()
    const m = launchMission({
      prescriptionId: p.id,
      estimate: { medications: estimate.medications, service: estimate.service, delivery: estimate.delivery, total: estimate.total },
      address: address.trim(),
      position: user.position,
      paymentMethod: method,
      remote,
      patientPhone: phone.trim(),
    })
    navigate(`/missions/${m.id}`)
  }

  const remove = () => {
    if (!window.confirm(`Supprimer définitivement l'ordonnance ${p.id} ?`)) return
    deletePrescription(p.id)
    navigate('/ordonnances')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Détail de l'ordonnance" subtitle={`Pour ${profile?.name ?? '—'}${profile ? ` · ${RELATION_LABEL[profile.relation]}` : ''}`} icon={<FileText size={22} />} back="/ordonnances" />

      {/* Identité */}
      <Card className="mb-4 bg-gradient-to-br from-brand-50 to-white">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Identifiant unique</p>
            <p className="font-mono text-xl font-extrabold tracking-wide sm:text-2xl">{p.id}</p>
          </div>
          <Badge tone={PRESCRIPTION_TONE[p.status]} className="text-sm">{p.locked && '🔒 '}{PRESCRIPTION_LABEL[p.status]}</Badge>
        </div>
        <p className="mt-2 text-sm text-slate-600">🔐 Empreinte numérique enregistrée · reçue le {dateTimeFr(p.createdAt)}</p>
      </Card>

      {/* Verrou */}
      {p.locked && (
        <div className="mb-4 rounded-2xl border-2 border-ink bg-ink p-4 text-white shadow-lg">
          <p className="flex items-center gap-2 text-lg font-extrabold"><Lock size={20} /> ORDONNANCE VERROUILLÉE</p>
          <p className="mt-1 text-sm text-white/75">Elle est rattachée à une mission et ne peut pas être réutilisée.</p>
          {mission && (
            <div className="mt-3 grid gap-2 rounded-xl bg-white/10 p-3 text-sm sm:grid-cols-2">
              <div><span className="text-white/60">Mission</span><p className="font-mono font-bold">{mission.id}</p></div>
              <div><span className="text-white/60">Date</span><p className="font-semibold">{dateTimeFr(mission.createdAt)}</p></div>
              <div><span className="text-white/60">Agent</span><p className="font-semibold">{agent?.name ?? 'Affectation en cours…'}</p></div>
              <div><span className="text-white/60">Statut</span><p><Badge tone={MISSION_TONE[mission.status]}>{MISSION_LABEL[mission.status]}</Badge></p></div>
            </div>
          )}
          {mission && (
            <ButtonLink to={`/missions/${mission.id}`} variant="accent" className="mt-3 w-full sm:w-auto"><Truck size={16} /> Suivre la mission</ButtonLink>
          )}
        </div>
      )}

      {/* Non confirmée */}
      {!p.confirmed && (
        <Notice tone="orange" className="mb-4">
          <p className="font-bold">Éléments détectés à confirmer</p>
          <p>Vérifiez que les lignes ci-dessous correspondent exactement à votre ordonnance, puis confirmez. L'IA ne modifie pas la prescription.</p>
          <Button size="sm" className="mt-2" onClick={() => confirmPrescription(p.id)}><Check size={14} /> Je confirme ces éléments</Button>
        </Notice>
      )}

      {/* Documents */}
      {p.previews.length > 0 && (
        <Section title="Document(s)">
          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {p.previews.map((src, i) => (
              <button key={i} onClick={() => setZoom(src)} className="h-36 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img src={src} alt={`Page ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </Section>
      )}
      {p.previews.length === 0 && p.fileNames.length > 0 && (
        <Section title="Document(s)">
          <div className="flex flex-wrap gap-2">{p.fileNames.map((f) => <Badge key={f}><FileText size={12} /> {f}</Badge>)}</div>
        </Section>
      )}

      {/* Lignes */}
      <Section title="Éléments de l'ordonnance">
        <Card className="divide-y divide-slate-100 p-0">
          {p.lines.length === 0 && <p className="p-4 text-sm text-slate-500">Aucune ligne.</p>}
          {p.lines.map((l) => {
            const med = medById(l.medicationId)
            return (
              <div key={l.id} className="flex items-start gap-3 p-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Pill size={18} /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{l.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Quantité : {l.quantity}{med && <> · <Link to={`/medicaments/${med.id}`} className="text-brand-600 hover:underline">{med.brand}</Link></>}</p>
                  {med?.price ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <PriceLevelBadge level={med.price.level} />
                      <span className="text-xs font-semibold text-slate-600">≈ {fcfa(med.price.amount * Math.max(1, l.quantity))}</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-amber-700">
                      {med ? 'Prix non publié' : 'Non identifié dans la base'} — montant à confirmer par la facture de la pharmacie
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </Card>
      </Section>

      {/* Estimation + paiement */}
      {canPay && estimate && (
        <Section title="Estimation de la mission">
          <Card className="border-brand-200">
            <dl className="space-y-2 text-sm">
              <Row
                label="💊 Médicaments estimés"
                value={estimate.priced === 0 ? 'À confirmer' : `${fcfa(estimate.medications)}${estimate.unknown > 0 ? ' + à confirmer' : ''}`}
              />
              <Row label="🧑🏾‍💼 Service PHARMA CI" value={fcfa(estimate.service)} />
              <Row label={`🚚 Livraison${nearest ? ` (depuis ${nearest.name})` : ''}`} value={fcfa(estimate.delivery)} />
              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2 text-base font-extrabold">
                <dt>Total estimé{estimate.unknown > 0 ? ' (hors lignes à confirmer)' : ''}</dt><dd className="tabular-nums">{fcfa(estimate.total)}</dd>
              </div>
            </dl>
            <Notice tone="orange" className="mt-3 text-xs">
              Le montant des médicaments est estimatif lorsqu'il n'a pas été confirmé par une pharmacie. Le montant définitif des médicaments correspond à la facture émise par la pharmacie.
            </Notice>
            {estimate.unknown > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                {estimate.unknown} ligne(s) sans prix publié : montant à confirmer par la facture de la pharmacie.
              </p>
            )}
          </Card>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
              <span className="text-xl">🧾</span>
              <div><p className="font-bold">Achat des médicaments</p><p className="text-slate-500">Facturé par la pharmacie — facture originale remise à la livraison.</p></div>
            </div>
            <div className="flex items-start gap-2 rounded-2xl border border-brand-200 bg-brand-50 p-3 text-sm">
              <span className="text-xl">🚚</span>
              <div><p className="font-bold">Service PHARMA CI</p><p className="text-slate-600">Facturé séparément : {fcfa(estimate.service + estimate.delivery)} (service + livraison).</p></div>
            </div>
          </div>

          <Card className="mt-3">
            <Input label="Adresse de livraison (obligatoire)" required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Commune, quartier, rue, repère…" />
            {!address.trim() && <p className="mt-1 text-xs font-semibold text-amber-700">Saisissez l'adresse où l'agent doit livrer pour lancer la mission.</p>}
            <Input label="Votre téléphone (obligatoire)" type="tel" inputMode="tel" className="mt-3" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex. 07 00 00 00 00" />
            {!phone.trim() && <p className="mt-1 text-xs font-semibold text-amber-700">L'agent doit pouvoir vous appeler en cas de souci (médicament indisponible, prix, adresse).</p>}
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} /> {locationGranted ? 'Votre position GPS est utilisée pour le suivi.' : 'Localisation non activée : l\'agent se guidera sur l\'adresse saisie.'}</p>

            <p className="mt-4 mb-2 text-sm font-semibold text-slate-700">Moyen de paiement</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => setMethod(pm.id)}
                  className={cx(
                    'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition',
                    method === pm.id ? 'border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-500/20' : 'border-slate-200 bg-white hover:bg-slate-50',
                  )}
                >
                  <span className="text-lg">{pm.emoji}</span>{pm.id}
                </button>
              ))}
            </div>

            <Button size="lg" variant="accent" className="mt-4 w-full" onClick={() => void pay()} disabled={!address.trim() || !phone.trim() || paying}>
              <Rocket size={18} /> PAYER ET LANCER LA MISSION
            </Button>
            <p className="mt-2 text-center text-xs text-slate-500">Un agent PHARMA CI prend la mission et peut vous appeler en cas de souci. Votre ordonnance sera verrouillée pendant la mission.</p>
          </Card>
        </Section>
      )}

      {/* Renouvellement */}
      {canRenew && (
        <Card className="mb-6">
          <p className="flex items-center gap-2 font-bold"><RefreshCw size={18} className="text-brand-600" /> Nouvelle exécution</p>
          <p className="mt-1 text-sm text-slate-600">
            Nouvelle exécution possible uniquement si compatible avec les conditions de l'ordonnance et les règles applicables — vérifiez votre ordonnance.
          </p>
          <Button variant="outline" className="mt-3" onClick={() => setRenewOpen(true)}>Demander un renouvellement</Button>
        </Card>
      )}

      {/* Historique */}
      <Section title="Historique">
        <Card>
          <ol className="relative space-y-4 border-l-2 border-slate-100 pl-5">
            {[...p.history].reverse().map((h, i) => (
              <li key={i} className="relative">
                <span className={cx('absolute top-1 -left-[27px] h-3 w-3 rounded-full ring-4 ring-white', i === 0 ? 'bg-brand-500' : 'bg-slate-300')} />
                <p className="text-sm font-medium leading-snug">{h.event}</p>
                <p className="text-xs text-slate-400">{dateTimeFr(h.at)}</p>
              </li>
            ))}
          </ol>
        </Card>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/historique" className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-ink"><History size={14} /> Tout mon historique <ChevronRight size={14} /></Link>
        {!p.locked && (
          <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={remove}><Trash2 size={16} /> Supprimer l'ordonnance</Button>
        )}
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400"><ShieldCheck size={12} /> Chaque consultation de cette ordonnance est journalisée.</p>

      <Modal open={paying} onClose={() => {}} title="Paiement en cours">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Loader2 size={36} className="animate-spin text-brand-500" />
          <p className="font-bold">Paiement {method} (simulation)…</p>
          <p className="text-sm text-slate-500">Montant du service : {estimate ? fcfa(estimate.service + estimate.delivery) : '—'}</p>
          <p className="flex items-center gap-1 text-xs text-slate-400"><CreditCard size={12} /> Démo : aucun débit réel</p>
        </div>
      </Modal>

      <Modal open={renewOpen} onClose={() => setRenewOpen(false)} title="Demander un renouvellement">
        <Notice tone="orange">
          Nouvelle exécution possible uniquement si compatible avec les conditions de l'ordonnance (mention de renouvellement, durée de validité) et les règles applicables. Vérifiez votre ordonnance.
        </Notice>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => setRenewOpen(false)}>Annuler</Button>
          <Button onClick={() => { requestRenewal(p.id); setRenewOpen(false) }}><Receipt size={16} /> Confirmer la demande</Button>
        </div>
      </Modal>

      <Modal open={!!zoom} onClose={() => setZoom(null)} title="Ordonnance">
        {zoom && <img src={zoom} alt="Ordonnance" className="w-full rounded-xl" />}
      </Modal>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="min-w-0 truncate text-slate-600">{label}</dt>
      <dd className="shrink-0 font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
