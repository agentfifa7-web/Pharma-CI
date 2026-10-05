import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertOctagon, CheckCircle2, MessageSquareHeart, Phone, Siren } from 'lucide-react'
import type { VigilanceReport } from '../../types'
import { medById } from '../../data/medications'
import { medNameOptions } from '../../data/assistant'
import { useStore } from '../../store/useStore'
import { dateTimeFr } from '../../lib/format'
import { Badge, Button, Card, EmptyState, Input, Notice, PageHeader, Section, Select, Stars, Textarea, cx } from '../../components/ui'

type Mode = 'avis' | 'pharmacovigilance'
type Severity = NonNullable<VigilanceReport['severity']>

const CATEGORIES = ['Effet indésirable', 'Réaction inhabituelle', 'Problème de qualité', 'Emballage suspect', 'Médicament endommagé', 'Autre']
const AVIS_CATEGORIES = ['Efficacité', 'Facilité de prise', 'Goût / présentation', 'Disponibilité', 'Autre']

const SEVERITY: Record<Severity, { label: string; tone: 'green' | 'orange' | 'red'; help: string }> = {
  faible: { label: 'Faible', tone: 'green', help: 'Gêne légère, sans impact sur les activités.' },
  moderee: { label: 'Modérée', tone: 'orange', help: 'Gêne importante, a nécessité un avis ou un arrêt.' },
  grave: { label: 'Grave', tone: 'red', help: 'Hospitalisation, mise en danger, handicap.' },
}

const STATUS: Record<VigilanceReport['status'], { label: string; tone: 'blue' | 'violet' | 'slate' }> = {
  recu: { label: 'Reçu', tone: 'blue' },
  transmis_airp: { label: 'À orienter vers l\'AIRP', tone: 'violet' },
  clos: { label: 'Clos', tone: 'slate' },
}

export default function Vigilance() {
  const [params] = useSearchParams()
  const prefill = medById(params.get('med') ?? undefined)
  const reports = useStore((s) => s.reports)
  const addReport = useStore((s) => s.addReport)

  const [mode, setMode] = useState<Mode>(params.get('med') ? 'pharmacovigilance' : 'avis')
  const [medication, setMedication] = useState(prefill?.brand ?? '')
  const [category, setCategory] = useState(CATEGORIES[0]!)
  const [avisCategory, setAvisCategory] = useState(AVIS_CATEGORIES[0]!)
  const [lot, setLot] = useState('')
  const [severity, setSeverity] = useState<Severity>('faible')
  const [stars, setStars] = useState(0)
  const [description, setDescription] = useState('')
  const [sent, setSent] = useState<VigilanceReport | null>(null)

  const reset = () => { setLot(''); setStars(0); setDescription(''); setSeverity('faible') }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!medication.trim() || !description.trim()) return
    if (mode === 'avis' && !stars) return
    const r = mode === 'avis'
      ? addReport({ kind: 'avis', category: avisCategory, medication: medication.trim(), description: description.trim(), stars })
      : addReport({ kind: 'pharmacovigilance', category, medication: medication.trim(), lot: lot.trim() || undefined, severity, description: description.trim() })
    setSent(r)
    reset()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="MON EXPÉRIENCE" subtitle="Donner un avis ou signaler un problème lié à un médicament" icon={<MessageSquareHeart size={22} />} />

      {sent && (
        <Notice tone={sent.severity === 'grave' ? 'red' : 'green'} icon={<CheckCircle2 size={18} />} className="mb-4">
          <p className="font-bold">{sent.kind === 'avis' ? 'Merci pour votre avis !' : `Signalement ${sent.id} enregistré.`}</p>
          {sent.kind === 'pharmacovigilance' && (
            <p>
              {sent.severity === 'grave'
                ? 'Signalement grave : il est marqué pour orientation vers l\'AIRP. Si la personne est en danger, appelez immédiatement le 185.'
                : 'Votre signalement sera examiné. Parlez-en aussi à votre pharmacien ou médecin.'}
            </p>
          )}
        </Notice>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => setMode('avis')}
          className={cx('rounded-2xl border-2 p-4 text-left transition', mode === 'avis' ? 'border-accent-500 bg-accent-50' : 'border-slate-200 bg-white hover:border-slate-300')}
        >
          <span className="text-2xl">⭐</span>
          <p className="mt-1 font-extrabold">Avis utilisateur</p>
          <p className="text-xs text-slate-500 sm:text-sm">Partager votre expérience (efficacité, prise…)</p>
        </button>
        <button
          onClick={() => setMode('pharmacovigilance')}
          className={cx('rounded-2xl border-2 p-4 text-left transition', mode === 'pharmacovigilance' ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300')}
        >
          <span className="text-2xl">🚨</span>
          <p className="mt-1 font-extrabold">Signalement</p>
          <p className="text-xs text-slate-500 sm:text-sm">Pharmacovigilance : effet indésirable, qualité…</p>
        </button>
      </div>

      <Card className={cx('mb-6 border-t-4', mode === 'avis' ? 'border-t-accent-500' : 'border-t-red-500')}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <p className="font-bold">{mode === 'avis' ? '⭐ Donner un avis' : '🚨 Signalement de pharmacovigilance'}</p>
            <p className="text-sm text-slate-500">
              {mode === 'avis'
                ? 'Un avis est une appréciation personnelle. Il n\'est pas transmis aux autorités de santé.'
                : 'Un signalement concerne un effet indésirable ou un problème de qualité. Il contribue à la sécurité des médicaments.'}
            </p>
          </div>

          <div>
            <Input label="Médicament concerné" required list="vig-meds" value={medication} onChange={(e) => setMedication(e.target.value)} placeholder="Nom du médicament" />
            <datalist id="vig-meds">{medNameOptions().map((n) => <option key={n} value={n} />)}</datalist>
          </div>

          {mode === 'avis' ? (
            <>
              <div>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Votre note</span>
                <Stars value={stars} onChange={setStars} size={30} />
                {!stars && <p className="mt-1 text-xs text-slate-400">Choisissez une note de 1 à 5.</p>}
              </div>
              <Select label="Votre avis porte sur" value={avisCategory} onChange={(e) => setAvisCategory(e.target.value)}>
                {AVIS_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </Select>
                <Input label="Numéro de lot (si connu)" value={lot} onChange={(e) => setLot(e.target.value.toUpperCase())} placeholder="Ex. AMX500B199" />
              </div>
              <div>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Gravité</span>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(SEVERITY) as Severity[]).map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setSeverity(s)}
                      className={cx(
                        'rounded-xl border p-2.5 text-left text-sm transition',
                        severity === s
                          ? s === 'grave' ? 'border-red-500 bg-red-50' : s === 'moderee' ? 'border-amber-500 bg-amber-50' : 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 bg-white',
                      )}
                    >
                      <span className="font-bold">{SEVERITY[s].label}</span>
                      <span className="mt-0.5 hidden text-xs text-slate-500 sm:block">{SEVERITY[s].help}</span>
                    </button>
                  ))}
                </div>
              </div>
              {severity === 'grave' && (
                <Notice tone="red" icon={<Siren size={18} />}>
                  <p className="font-bold">Situation grave ?</p>
                  <p>Si la personne est en danger (malaise, difficulté à respirer, gonflement du visage…), appelez immédiatement le <a href="tel:185" className="font-bold underline">185 (SAMU)</a> ou rendez-vous aux urgences.</p>
                  <p className="mt-1">Les effets indésirables graves doivent être déclarés à l'<b>AIRP</b> (Autorité Ivoirienne de Régulation Pharmaceutique) ; votre pharmacien ou médecin peut vous aider à le faire.</p>
                </Notice>
              )}
            </>
          )}

          <Textarea
            label={mode === 'avis' ? 'Votre commentaire' : 'Description de ce qui s\'est passé'}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={mode === 'avis' ? 'Partagez votre expérience…' : 'Quand ? Quels symptômes ou quel défaut ? Depuis quand prenez-vous le médicament ?'}
          />

          <Button type="submit" variant={mode === 'avis' ? 'accent' : 'danger'} size="lg" className="w-full" disabled={!medication.trim() || !description.trim() || (mode === 'avis' && !stars)}>
            {mode === 'avis' ? 'Publier mon avis' : 'Envoyer le signalement'}
          </Button>
          <p className="text-xs text-slate-500">
            Données traitées de façon confidentielle. Ce formulaire ne remplace pas une consultation : en cas de doute, contactez votre pharmacien ou votre médecin.
          </p>
        </form>
      </Card>

      <Section title={`Mes avis et signalements (${reports.length})`}>
        {reports.length === 0 ? (
          <EmptyState icon={<AlertOctagon />} title="Aucun envoi pour le moment" text="Vos avis et signalements apparaîtront ici avec leur statut." />
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <Card key={r.id} className="!p-3.5">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{r.kind === 'avis' ? '⭐' : '🚨'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-bold">{r.medication}</p>
                      <Badge tone={r.kind === 'avis' ? 'orange' : 'red'}>{r.kind === 'avis' ? 'Avis' : 'Pharmacovigilance'}</Badge>
                      {r.severity && <Badge tone={SEVERITY[r.severity].tone}>{SEVERITY[r.severity].label}</Badge>}
                      {r.kind === 'pharmacovigilance' && <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>}
                    </div>
                    <p className="text-xs text-slate-500">{r.id} · {r.category}{r.lot ? ` · lot ${r.lot}` : ''} · {dateTimeFr(r.createdAt)}</p>
                    {r.stars ? <div className="mt-1"><Stars value={r.stars} size={14} /></div> : null}
                    <p className="mt-1 line-clamp-3 text-sm text-slate-700">{r.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
        <Phone size={14} />Urgence : <a href="tel:185" className="font-bold text-red-600">185 (SAMU)</a>
      </div>
    </div>
  )
}
