import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Camera, Check, FileText, Fingerprint, Images, Loader2, Paperclip, Plus, ScanLine, Sparkles, Trash2, UserRound, X,
} from 'lucide-react'
import type { Prescription, PrescriptionLine } from '../../types'
import { PRESCRIPTION_LABEL, useActiveProfile, useStore } from '../../store/useStore'
import { Badge, Button, ButtonLink, Card, Input, Notice, PageHeader, cx } from '../../components/ui'
import { fingerprintFiles, imagePreview, uid } from '../../lib/crypto'
import { dateTimeFr } from '../../lib/format'
import { aiReadingEnabled, readPrescription } from '../../data/extraction'
import { MEDICATIONS, medById, medShortName } from '../../data/medications'
import { fcfa } from '../../lib/format'
import { PRESCRIPTION_TONE, RELATION_LABEL } from '../../data/statusUi'

type Picked = { key: string; file: File; preview?: string; pdf: boolean }
type Phase = 'select' | 'processing' | 'ocr' | 'detected' | 'review' | 'duplicate'

const STEPS = ['Document', 'Analyse', 'Vérification']

export default function PrescriptionUpload() {
  const navigate = useNavigate()
  const profile = useActiveProfile()
  const registerPrescription = useStore((s) => s.registerPrescription)
  const updatePrescriptionLines = useStore((s) => s.updatePrescriptionLines)
  const confirmPrescription = useStore((s) => s.confirmPrescription)

  const [files, setFiles] = useState<Picked[]>([])
  const [phase, setPhase] = useState<Phase>('select')
  const [error, setError] = useState('')
  const [created, setCreated] = useState<Prescription | null>(null)
  const [duplicate, setDuplicate] = useState<Prescription | null>(null)
  const [lines, setLines] = useState<PrescriptionLine[]>([])
  const [progress, setProgress] = useState({ p: 0, status: '' })
  const [ocrText, setOcrText] = useState('')
  const [ocrNote, setOcrNote] = useState('')
  const [engine, setEngine] = useState<'ia' | 'ocr'>('ocr')

  /** Autocomplétion : nom commercial → produit de la base PHARMA MED. */
  const byBrand = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of MEDICATIONS) if (!map.has(m.brand)) map.set(m.brand, m.id)
    return map
  }, [MEDICATIONS.length])

  const cameraRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const multiRef = useRef<HTMLInputElement>(null)

  const step = phase === 'select' ? 0 : phase === 'review' ? 2 : 1

  const addFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!list.length) return
    setError('')
    const picked = await Promise.all(
      list.map(async (file) => ({
        key: uid('f-'), file, pdf: file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
        preview: await imagePreview(file, 400).catch(() => undefined),
      })),
    )
    setFiles((f) => [...f, ...picked])
  }

  const analyze = async () => {
    if (!files.length) return
    setPhase('processing')
    setError('')
    setOcrNote('')
    setOcrText('')
    let fingerprint: string
    let previews: string[]
    const raw = files.map((f) => f.file)
    try {
      fingerprint = await fingerprintFiles(raw)
      previews = (await Promise.all(raw.map((f) => imagePreview(f).catch(() => undefined)))).filter((x): x is string => !!x)
    } catch {
      setError('Impossible de lire ce document. Réessayez avec une photo nette ou un PDF.')
      setPhase('select')
      return
    }

    // Anti-doublon AVANT toute lecture : une ordonnance déjà enregistrée est bloquée (et journalisée).
    if (useStore.getState().prescriptions.some((p) => p.fingerprint === fingerprint)) {
      const res = registerPrescription({ fingerprint, fileNames: raw.map((f) => f.name), previews, lines: [] })
      if (!res.ok) {
        setDuplicate(res.existing)
        setPhase('duplicate')
        return
      }
    }

    // Lecture automatique (OCR) — en cas d'échec, saisie manuelle.
    let extracted: PrescriptionLine[] = []
    let note = ''
    setProgress({ p: 0, status: aiReadingEnabled() ? 'Préparation des photos' : 'Chargement du moteur de lecture' })
    setPhase('ocr')
    try {
      const res = await readPrescription(raw, (p, status) => setProgress({ p, status }))
      extracted = res.lines
      setEngine(res.engine)
      setOcrText(res.text.trim())
      if (res.unsupported.length && res.unsupported.length === raw.length)
        note = 'La lecture automatique des PDF n\'est pas encore prise en charge : saisissez les lignes de l\'ordonnance ci-dessous (ou envoyez une photo).'
      else if (!extracted.length)
        note = 'Aucune ligne de médicament n\'a pu être lue automatiquement. Reprenez une photo nette, de face et bien éclairée, ou saisissez les lignes telles qu\'écrites sur l\'ordonnance.'
      else if (res.unsupported.length)
        note = `${res.unsupported.length} PDF non lu(s) automatiquement : ajoutez leurs lignes manuellement.`
    } catch {
      note = 'Le moteur de lecture n\'a pas pu être chargé (connexion internet requise la première fois). Saisissez les lignes manuellement.'
    }

    const res = registerPrescription({ fingerprint, fileNames: raw.map((f) => f.name), previews, lines: extracted })
    if (!res.ok) {
      setDuplicate(res.existing)
      setPhase('duplicate')
      return
    }
    setCreated(res.prescription)
    setOcrNote(note)
    if (res.prescription.lines.length) {
      setLines(res.prescription.lines)
      setPhase('detected')
    } else {
      setLines([{ id: uid('ln-'), label: '', dosage: '', quantity: 1 }])
      setPhase('review')
    }
  }

  const restart = () => {
    setFiles([])
    setCreated(null)
    setDuplicate(null)
    setLines([])
    setOcrText('')
    setOcrNote('')
    setPhase('select')
  }

  const patchLine = (id: string, p: Partial<PrescriptionLine>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)))

  const confirm = () => {
    if (!created) return
    const clean = lines.filter((l) => l.label.trim()).map((l) => ({ ...l, label: l.label.trim(), quantity: Math.max(1, l.quantity || 1) }))
    updatePrescriptionLines(created.id, clean)
    confirmPrescription(created.id)
    navigate(`/ordonnances/${created.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="PHARMA ORDONNANCE"
        subtitle="Envoyez votre ordonnance : un agent PHARMA CI achète et livre vos médicaments."
        icon={<Camera size={22} />}
        back="/"
      />

      {/* Stepper */}
      <ol className="mb-5 grid grid-cols-3 gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-col gap-1.5">
            <div className={cx('h-1.5 rounded-full transition-colors', i <= step ? 'bg-brand-500' : 'bg-slate-200')} />
            <span className={cx('text-xs font-semibold', i === step ? 'text-brand-700' : i < step ? 'text-slate-600' : 'text-slate-400')}>
              {i + 1}. {s}
            </span>
          </li>
        ))}
      </ol>

      {/* Profil concerné */}
      <Card className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-600"><UserRound size={20} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ordonnance pour</p>
          <p className="truncate font-bold">{profile.name} <span className="font-medium text-slate-500">· {RELATION_LABEL[profile.relation]}</span></p>
        </div>
        {phase === 'select' && <Link to="/famille" className="shrink-0 text-sm font-semibold text-brand-600 hover:underline">Changer</Link>}
      </Card>

      {phase === 'select' && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <SourceButton icon={<Camera size={26} />} title="Prendre une photo" text="Appareil photo" onClick={() => cameraRef.current?.click()} highlight />
            <SourceButton icon={<Paperclip size={26} />} title="Importer un PDF" text="Ordonnance numérique" onClick={() => pdfRef.current?.click()} />
            <SourceButton icon={<Images size={26} />} title="Plusieurs photos" text="Ordonnance de plusieurs pages" onClick={() => multiRef.current?.click()} />
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={addFiles} />
          <input ref={pdfRef} type="file" accept="application/pdf" className="hidden" onChange={addFiles} />
          <input ref={multiRef} type="file" accept="image/*" multiple className="hidden" onChange={addFiles} />

          {error && <Notice tone="red" icon={<AlertTriangle size={16} />} className="mt-4">{error}</Notice>}

          {files.length > 0 && (
            <Card className="mt-4">
              <p className="mb-3 text-sm font-bold">{files.length} document{files.length > 1 ? 's' : ''} sélectionné{files.length > 1 ? 's' : ''}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {files.map((f, i) => (
                  <div key={f.key} className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {f.preview ? (
                      <img src={f.preview} alt={`Page ${i + 1}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center text-slate-500">
                        <FileText size={28} className={f.pdf ? 'text-red-500' : ''} />
                        <span className="line-clamp-2 break-all text-[10px] font-medium">{f.file.name}</span>
                      </div>
                    )}
                    <span className="absolute top-1 left-1 rounded-md bg-ink/70 px-1.5 text-[10px] font-bold text-white">{i + 1}</span>
                    <button
                      onClick={() => setFiles((all) => all.filter((x) => x.key !== f.key))}
                      className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-slate-600 shadow hover:text-red-600"
                      aria-label="Retirer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <Button size="lg" className="mt-4 w-full" onClick={analyze}>
                <ScanLine size={18} /> Analyser mon ordonnance
              </Button>
            </Card>
          )}

          <div className="mt-5 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <Notice tone="blue" icon={<Fingerprint size={16} />}>
              Une <b>empreinte numérique</b> unique est calculée pour chaque ordonnance afin d'empêcher toute réutilisation frauduleuse.
            </Notice>
            <Notice tone="green" icon={<Sparkles size={16} />}>
              PHARMA CI ne vend pas de médicaments : un agent les achète pour vous en pharmacie, la facture originale vous est remise.
            </Notice>
          </div>
        </>
      )}

      {phase === 'processing' && (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 size={32} className="animate-spin text-brand-500" />
          <p className="font-bold">Calcul de l'empreinte numérique…</p>
          <p className="text-sm text-slate-500">Vérification que cette ordonnance n'a pas déjà été utilisée.</p>
        </Card>
      )}

      {phase === 'duplicate' && duplicate && (
        <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 text-red-900 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-600 text-2xl text-white">⚠️</div>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold">ORDONNANCE DÉJÀ ENREGISTRÉE</h2>
              <p className="mt-1 text-sm leading-relaxed">
                Cette ordonnance a déjà été utilisée ou fait actuellement l'objet d'une mission.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-white p-3 text-ink">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-base font-bold">{duplicate.id}</span>
              <Badge tone={PRESCRIPTION_TONE[duplicate.status]}>{duplicate.locked && '🔒 '}{PRESCRIPTION_LABEL[duplicate.status]}</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">Enregistrée le {dateTimeFr(duplicate.createdAt)}</p>
          </div>
          <p className="mt-3 text-xs">Cette tentative a été enregistrée par notre système anti-fraude.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <ButtonLink to={`/ordonnances/${duplicate.id}`} variant="danger">Voir cette ordonnance</ButtonLink>
            <Button variant="outline" onClick={restart}>Envoyer une autre ordonnance</Button>
          </div>
        </div>
      )}

      {phase === 'ocr' && (
        <Card className="overflow-hidden py-10 text-center">
          <div className="relative mx-auto mb-4 h-28 w-24 overflow-hidden rounded-xl border-2 border-brand-200 bg-brand-50">
            <div className="absolute inset-x-3 top-4 space-y-2">
              {[80, 60, 90, 50, 70].map((w, i) => <div key={i} className="h-1.5 rounded bg-brand-200" style={{ width: `${w}%` }} />)}
            </div>
            <div className="absolute inset-x-0 h-1 bg-accent-500 shadow-[0_0_12px_rgba(247,127,0,.8)] transition-all" style={{ top: `${10 + progress.p * 80}%` }} />
          </div>
          <p className="flex items-center justify-center gap-2 font-bold"><ScanLine size={18} className="text-accent-500" /> Lecture du document… {Math.round(progress.p * 100)} %</p>
          <p className="mt-1 text-sm text-slate-500">{progress.status}</p>
          <div className="mx-auto mt-4 h-2 w-56 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.round(progress.p * 100)}%` }} />
          </div>
          <p className="mx-auto mt-4 max-w-sm text-xs text-slate-400">
            {aiReadingEnabled()
              ? "L'écriture de l'ordonnance (même manuscrite) est lue par une IA. Une photo nette, bien éclairée et prise de face donne le meilleur résultat."
              : 'La première lecture télécharge le moteur OCR et les données de langue française (quelques Mo).'}
          </p>
        </Card>
      )}

      {(phase === 'detected' || phase === 'review') && created && (
        <>
          <Card className="mb-4 border-brand-200 bg-gradient-to-br from-brand-50 to-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Identifiant unique</p>
            <p className="mt-0.5 font-mono text-2xl font-extrabold tracking-wide text-ink">{created.id}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">🔐 Empreinte numérique enregistrée <span className="truncate font-mono text-xs text-slate-400">{created.fingerprint.slice(0, 16)}…</span></p>
          </Card>

          <Notice tone="orange" icon={<Sparkles size={16} />} className="mb-4">
            <b>{engine === 'ia' ? 'Lecture automatique par IA' : 'Lecture automatique (OCR)'} : vérifiez chaque ligne</b> ; l'IA ne modifie pas la prescription.
          </Notice>
          {ocrNote && <Notice tone="blue" icon={<AlertTriangle size={16} />} className="mb-4">{ocrNote}</Notice>}
        </>
      )}

      {phase === 'detected' && created && (
        <Card>
          <h2 className="text-lg font-bold">Voici les éléments détectés sur votre ordonnance</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {lines.map((l, i) => {
              const med = medById(l.medicationId)
              return (
                <li key={l.id} className="flex items-start gap-3 py-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{l.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {l.instructions && <>{l.instructions} · </>}Quantité : {l.quantity} · {med ? <>Correspondance proposée : <b>{medShortName(med)}</b></> : 'Médicament non identifié dans la base'}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
          <OcrText text={ocrText} engine={engine} />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button size="lg" onClick={() => setPhase('review')}><Check size={18} /> Vérifier et confirmer</Button>
            <Button size="lg" variant="outline" onClick={() => setPhase('review')}>Corriger une erreur de lecture</Button>
          </div>
        </Card>
      )}

      {phase === 'review' && created && (
        <Card>
          <h2 className="text-lg font-bold">Vérification des éléments lus</h2>
          <p className="mt-1 text-sm text-slate-500">
            Corrigez uniquement les <b>erreurs de lecture</b> pour que les lignes correspondent exactement à ce qui est écrit sur l'ordonnance.
            La prescription elle-même ne peut pas être modifiée.
          </p>
          <div className="mt-4 space-y-3">
            {lines.map((l, i) => (
              <div key={l.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Ligne {i + 1}</span>
                  <button onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                    <Trash2 size={14} /> Retirer
                  </button>
                </div>
                <Input label="Libellé tel qu'écrit sur l'ordonnance" value={l.label} onChange={(e) => patchLine(l.id, { label: e.target.value })} />
                <div className="mt-2 grid grid-cols-[1fr_6rem] gap-2">
                  <MedField
                    line={l}
                    resolve={(brand) => byBrand.get(brand)}
                    onChange={(medicationId) => {
                      const med = medById(medicationId)
                      patchLine(l.id, { medicationId: med?.id, dosage: l.dosage || med?.dosage || '', label: l.label.trim() ? l.label : med ? medShortName(med) : l.label })
                    }}
                  />
                  <Input label="Quantité" type="number" min={1} inputMode="numeric" value={l.quantity} onChange={(e) => patchLine(l.id, { quantity: Number(e.target.value) })} />
                </div>
              </div>
            ))}
            <datalist id="pharma-med-list">
              {MEDICATIONS.map((m) => <option key={m.id} value={m.brand} />)}
            </datalist>
            <Button
              variant="soft"
              className="w-full"
              onClick={() => setLines((ls) => [...ls, { id: uid('ln-'), label: '', dosage: '', quantity: 1 }])}
            >
              <Plus size={16} /> Ajouter une ligne non détectée
            </Button>
          </div>
          <Notice tone="blue" className="mt-4">
            Le médicament correspondant sert uniquement à estimer le prix. Seuls les médicaments écrits sur l'ordonnance seront achetés. Aucun remplacement n'est effectué sans l'avis du prescripteur ou du pharmacien.
          </Notice>
          <OcrText text={ocrText} engine={engine} />
          <Button size="lg" className="mt-4 w-full" onClick={confirm} disabled={!lines.some((l) => l.label.trim())}>
            <Check size={18} /> Confirmer
          </Button>
        </Card>
      )}
    </div>
  )
}

function SourceButton({ icon, title, text, onClick, highlight }: { icon: React.ReactNode; title: string; text: string; onClick: () => void; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'flex items-center gap-3 rounded-2xl border p-4 text-left shadow-sm transition active:scale-[.98] sm:flex-col sm:items-start',
        highlight ? 'border-brand-500 bg-brand-500 text-white shadow-brand-500/25 hover:bg-brand-600' : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40',
      )}
    >
      <span className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-xl', highlight ? 'bg-white/20' : 'bg-brand-50 text-brand-600')}>{icon}</span>
      <span>
        <span className="block font-bold">{title}</span>
        <span className={cx('block text-xs', highlight ? 'text-white/80' : 'text-slate-500')}>{text}</span>
      </span>
    </button>
  )
}

function OcrText({ text, engine }: { text: string; engine: 'ia' | 'ocr' }) {
  if (!text) return null
  return (
    <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
      <summary className="cursor-pointer font-semibold text-slate-600">{engine === 'ia' ? 'Texte lu sur le document (IA)' : 'Texte lu sur le document (OCR brut)'}</summary>
      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs text-slate-600">{text}</pre>
    </details>
  )
}

/** Champ d'autocomplétion du médicament (base PHARMA MED). */
function MedField({ line, resolve, onChange }: { line: PrescriptionLine; resolve: (brand: string) => string | undefined; onChange: (medicationId?: string) => void }) {
  const med = medById(line.medicationId)
  const [text, setText] = useState(med?.brand ?? '')
  return (
    <div>
      <Input
        label="Médicament correspondant"
        list="pharma-med-list"
        placeholder="Rechercher dans la base…"
        value={text}
        onChange={(e) => {
          const v = e.target.value
          setText(v)
          const id = resolve(v)
          if (id) onChange(id)
          else if (!v.trim()) onChange(undefined)
        }}
      />
      <p className="mt-1 text-xs text-slate-500">
        {med
          ? med.price ? `Prix publié : ${fcfa(med.price.amount)}` : 'Prix non publié'
          : text.trim() ? 'Choisissez un produit dans la liste proposée' : 'Non identifié'}
      </p>
    </div>
  )
}
