import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Camera, CameraOff, ScanLine, Search } from 'lucide-react'
import type { Medication } from '../../types'
import { MEDICATIONS } from '../../data/medications'
import { DRUG_ALERTS } from '../../data/alerts'
import { normalize } from '../../lib/format'
import { Button, ButtonLink, Card, Notice, PageHeader } from '../../components/ui'
import { FormIcon } from '../../components/FormIcon'

// API BarcodeDetector (non incluse dans les types DOM standard)
type DetectedBarcode = { rawValue: string; format: string }
type BarcodeDetectorLike = { detect: (src: CanvasImageSource) => Promise<DetectedBarcode[]> }
type BarcodeDetectorCtor = new (opts?: { formats: string[] }) => BarcodeDetectorLike

type Result =
  | { kind: 'conforme' | 'rappele'; med: Medication; lot: string; expiry: string }
  | { kind: 'produit'; med: Medication; code: string }
  | { kind: 'inconnu'; code: string }

let CODES: { src: Medication | undefined; map: Map<string, Medication> } = { src: undefined, map: new Map() }
function byCode(code: string) {
  if (CODES.src !== MEDICATIONS[0]) {
    const map = new Map<string, Medication>()
    for (const m of MEDICATIONS) if (m.code) map.set(m.code, m)
    CODES = { src: MEDICATIONS[0], map }
  }
  return CODES.map.get(code)
}

function lookup(raw: string): Result {
  const code = raw.trim()
  const n = normalize(code).replace(/[^a-z0-9]/g, '')
  // 1. Lots connus (aucune base officielle importée pour l'instant : liste vide).
  for (const med of MEDICATIONS) {
    for (const l of med.lots) {
      const ln = normalize(l.lot)
      // Un code DataMatrix / QR peut contenir le lot parmi d'autres données (GTIN, péremption…)
      if (n === ln || (n.length > ln.length && n.includes(ln))) {
        return l.status === 'inconnu' ? { kind: 'inconnu', code } : { kind: l.status, med, lot: l.lot, expiry: l.expiry }
      }
    }
  }
  // 2. Code produit publié par la source (ex. 3258453).
  const med = byCode(n)
  if (med) return { kind: 'produit', med, code: n }
  return { kind: 'inconnu', code }
}

export default function Scan() {
  const [params] = useSearchParams()
  const initial = params.get('lot') ?? params.get('code') ?? ''
  const [code, setCode] = useState(initial)
  const [result, setResult] = useState<Result | null>(initial ? lookup(initial) : null)
  const [scanning, setScanning] = useState(false)
  const [camError, setCamError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia

  const check = (value: string) => {
    if (!value.trim()) return
    setCode(value)
    setResult(lookup(value))
  }

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  useEffect(() => {
    if (!scanning) return
    let cancelled = false
    let timer = 0
    const run = async () => {
      try {
        const Ctor = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector
        const detector = new Ctor({ formats: ['qr_code', 'data_matrix'] })
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        const tick = async () => {
          if (cancelled) return
          try {
            const codes = await detector.detect(video)
            if (codes[0]?.rawValue) {
              check(codes[0].rawValue)
              stop()
              return
            }
          } catch { /* image pas encore prête */ }
          timer = window.setTimeout(tick, 350)
        }
        void tick()
      } catch {
        setCamError('Impossible d\'accéder à la caméra. Vérifiez les autorisations ou saisissez le code manuellement.')
        stop()
      }
    }
    void run()
    return () => { cancelled = true; window.clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning])

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), [])

  const matchedAlert = result && result.kind === 'rappele' ? DRUG_ALERTS.find((a) => a.lots?.includes(result.lot)) : undefined

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="SCAN PHARMA" subtitle="Retrouver un médicament par son code produit" icon={<ScanLine size={22} />} />

      <Card className="mb-4">
        <form onSubmit={(e) => { e.preventDefault(); check(code) }} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Code produit, numéro de lot ou code QR / DataMatrix</span>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex. 3258453"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm uppercase outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
              />
              <Button type="submit" disabled={!code.trim()}><Search size={16} /><span className="hidden sm:inline">Vérifier</span></Button>
            </div>
          </label>

          {scanning ? (
            <div className="relative overflow-hidden rounded-2xl bg-ink">
              <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
              <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/80" />
              <Button type="button" variant="danger" size="sm" className="absolute bottom-3 right-3" onClick={stop}><CameraOff size={15} />Arrêter</Button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full" onClick={() => { setCamError(null); if (supported) setScanning(true); else setCamError('unsupported') }}>
              <Camera size={16} />Scanner avec la caméra
            </Button>
          )}
          {camError === 'unsupported' ? (
            <Notice tone="blue">Le scan par caméra n'est pas pris en charge par ce navigateur. Saisissez le code manuellement.</Notice>
          ) : camError ? <Notice tone="orange">{camError}</Notice> : null}
        </form>

        <Notice tone="blue" className="mt-4">
          <b>Aucune base officielle de lots n'est encore connectée.</b> SCAN PHARMA ne peut donc pas certifier l'authenticité d'un lot.
          Vous pouvez en revanche retrouver un produit par son <b>code produit</b> (liste publique des prix).
        </Notice>
      </Card>

      {result?.kind === 'conforme' && (
        <div className="rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-5">
          <p className="text-4xl">✅</p>
          <p className="mt-2 text-lg font-extrabold text-emerald-800">Lot conforme</p>
          <p className="text-sm text-emerald-900">Le lot <b className="font-mono">{result.lot}</b> correspond à <b>{result.med.brand}</b> et ne fait l'objet d'aucune alerte connue.</p>
          <p className="mt-1 text-sm text-emerald-900">Péremption : <b>{result.expiry}</b> — vérifiez aussi la date sur la boîte.</p>
          <ButtonLink to={`/medicaments/${result.med.id}`} variant="primary" className="mt-3">Voir la fiche</ButtonLink>
        </div>
      )}

      {result?.kind === 'rappele' && (
        <div className="rounded-3xl border-2 border-red-300 bg-red-50 p-5">
          <p className="text-4xl">🚨</p>
          <p className="mt-2 text-lg font-extrabold text-red-800">Lot rappelé</p>
          <p className="text-sm text-red-900">Le lot <b className="font-mono">{result.lot}</b> de <b>{result.med.brand}</b> fait l'objet d'un rappel.</p>
          <p className="mt-1 text-sm text-red-900">Ne l'utilisez pas et rapportez-le à votre pharmacie. N'interrompez pas un traitement sans avis : votre pharmacien vous orientera.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink to="/alertes" variant="danger">{matchedAlert ? 'Voir l\'alerte' : 'Alertes médicaments'}</ButtonLink>
            <ButtonLink to={`/vigilance?med=${result.med.id}`} variant="outline">Signaler</ButtonLink>
          </div>
        </div>
      )}

      {result?.kind === 'produit' && (
        <div className="rounded-3xl border-2 border-brand-200 bg-brand-50 p-5">
          <FormIcon m={result.med} className="h-14 w-14 rounded-2xl" />
          <p className="mt-2 text-lg font-extrabold text-brand-800">Produit identifié</p>
          <p className="text-sm text-slate-700">
            Le code <b className="font-mono">{result.code}</b> correspond à <b>{result.med.brand}</b>
            {result.med.therapeuticClass && <> ({result.med.therapeuticClass})</>} dans la liste publique des prix.
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Ce code identifie le produit, pas la boîte : il ne garantit pas son authenticité. Vérifiez l'emballage (aspect, date de péremption, numéro de lot) et achetez vos médicaments en pharmacie.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink to={`/medicaments/${result.med.id}`} variant="primary">Voir la fiche</ButtonLink>
            <ButtonLink to={`/vigilance?med=${result.med.id}`} variant="outline">Signaler un produit suspect</ButtonLink>
          </div>
        </div>
      )}

      {result?.kind === 'inconnu' && (
        <div className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-5">
          <p className="text-4xl">⚠️</p>
          <p className="mt-2 text-lg font-extrabold text-amber-800">Code non trouvé</p>
          <p className="text-sm text-amber-900">
            « <span className="break-all font-mono">{result.code}</span> » ne correspond à aucun code produit de la base PHARMA MED. Aucune base officielle de lots n'est encore connectée :
            cela ne signifie pas que le produit est falsifié. Vérifiez l'emballage, demandez conseil à un pharmacien et signalez-le si vous le trouvez suspect (emballage, aspect, lieu d'achat).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink to="/pharmacies" variant="accent">Trouver un pharmacien</ButtonLink>
            <ButtonLink to="/vigilance" variant="outline">Signaler un produit suspect</ButtonLink>
          </div>
        </div>
      )}

      <Notice tone="blue" className="mt-5">
        La vérification des lots sera disponible lorsqu'une base officielle de traçabilité (AIRP, ministère de la Santé) sera connectée. En attendant, consultez les <Link to="/alertes" className="font-semibold underline">alertes médicaments</Link>.
      </Notice>
    </div>
  )
}
