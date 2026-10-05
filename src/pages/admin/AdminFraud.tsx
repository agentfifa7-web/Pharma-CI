import { useMemo, useState } from 'react'
import { CheckCircle2, ShieldAlert } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { dateTimeFr } from '../../lib/format'
import { Badge, Button, Chips, PageHeader, Stat, cx } from '../../components/ui'
import type { FraudEvent } from '../../types'
import { Panel } from './adminKit'

const SEVERITY: Record<FraudEvent['severity'], { label: string; tone: 'slate' | 'orange' | 'red'; icon: string }> = {
  faible: { label: 'Faible', tone: 'slate', icon: '▫️' },
  moyenne: { label: 'Moyenne', tone: 'orange', icon: '⚠️' },
  elevee: { label: 'Élevée', tone: 'red', icon: '⛔' },
}

const KIND_LABEL: Record<FraudEvent['kind'], string> = {
  doublon_ordonnance: 'Doublon d\'ordonnance',
  ecart_facture: 'Écart de facture',
  localisation_incoherente: 'Localisation incohérente',
  mission_suspecte: 'Mission suspecte',
  compte_suspect: 'Compte suspect',
}

const RULES: { label: string; detail: string; active: boolean }[] = [
  { label: 'Doublons d\'ordonnance', detail: 'Empreinte SHA-256 identique à une ordonnance déjà enregistrée → envoi bloqué.', active: true },
  { label: 'Double utilisation d\'ordonnance', detail: 'Ordonnance verrouillée dès le paiement : aucune seconde mission possible.', active: true },
  { label: 'Fausses factures', detail: 'Contrôle de cohérence facture / ordonnance / prix de référence (OCR + revue).', active: false },
  { label: 'Manipulation des prix', detail: 'Facture supérieure de plus de 30 % à l\'estimation → alerte automatique.', active: true },
  { label: 'Missions fictives', detail: 'Missions sans livraison confirmée par OTP, schémas répétitifs agent/patient.', active: false },
  { label: 'Comptes suspects', detail: 'Création massive de comptes, appareils partagés, moyens de paiement multiples.', active: false },
  { label: 'Localisation incohérente', detail: 'Pharmacie à plus de 30 km du lieu de livraison.', active: true },
  { label: 'Abus de remboursement', detail: 'Fréquence anormale d\'annulations après paiement.', active: false },
  { label: 'Utilisation anormale des comptes agents', detail: 'Connexions simultanées, trajets impossibles, horaires atypiques.', active: false },
]

type Filter = 'ouvertes' | 'resolues' | 'toutes'

export default function AdminFraud() {
  const fraud = useStore((s) => s.fraud)
  const resolve = useStore((s) => s.resolveFraud)
  const duplicateAttempts = useStore((s) => s.duplicateAttempts)
  const [filter, setFilter] = useState<Filter>('ouvertes')

  const list = useMemo(
    () => fraud.filter((f) => (filter === 'toutes' ? true : filter === 'ouvertes' ? !f.resolved : f.resolved)),
    [fraud, filter],
  )
  const open = fraud.filter((f) => !f.resolved)

  return (
    <div>
      <PageHeader title="Système anti-fraude" subtitle="Détection automatique et traitement des alertes" icon={<ShieldAlert />} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Alertes ouvertes" value={open.length} tone={open.length ? 'red' : 'slate'} icon={<ShieldAlert size={20} />} />
        <Stat label="Sévérité élevée" value={open.filter((f) => f.severity === 'elevee').length} tone="red" />
        <Stat label="Résolues" value={fraud.length - open.length} icon={<CheckCircle2 size={20} />} />
        <Stat label="Doublons bloqués" value={duplicateAttempts} tone="slate" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-3">
            <Chips<Filter> value={filter} onChange={setFilter} options={[
              { value: 'ouvertes', label: `Ouvertes (${open.length})` },
              { value: 'resolues', label: 'Résolues' },
              { value: 'toutes', label: 'Toutes' },
            ]} />
          </div>
          {list.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 py-10 text-center text-sm text-slate-500">
              ✅ Aucune alerte dans cette catégorie.<br />
              <span className="text-xs">Astuce démo : renvoyez la même photo d'ordonnance depuis l'app Patient pour déclencher un doublon.</span>
            </p>
          ) : (
            <ul className="space-y-2">
              {list.map((f) => {
                const s = SEVERITY[f.severity]
                return (
                  <li key={f.id} className={cx('rounded-2xl border bg-white p-4 shadow-sm', f.resolved ? 'border-slate-200 opacity-60' : f.severity === 'elevee' ? 'border-red-200' : 'border-slate-200')}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={s.tone}>{s.icon} {s.label}</Badge>
                      <span className="text-sm font-semibold">{KIND_LABEL[f.kind]}</span>
                      {f.ref && <code className="rounded bg-slate-100 px-1.5 text-xs">{f.ref}</code>}
                      <span className="ml-auto text-xs text-slate-400">{dateTimeFr(f.at)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{f.description}</p>
                    <div className="mt-3 flex justify-end">
                      {f.resolved ? <Badge tone="green"><CheckCircle2 size={12} />Résolue</Badge> : <Button size="sm" variant="soft" onClick={() => resolve(f.id)}><CheckCircle2 size={14} />Marquer comme résolue</Button>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <Panel title="Règles de détection" className="h-fit">
          <ul className="divide-y divide-slate-100">
            {RULES.map((r) => (
              <li key={r.label} className="py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{r.label}</p>
                  {r.active ? <Badge tone="green">● actif (démo)</Badge> : <Badge tone="slate">○ prévu</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{r.detail}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-400">Les règles « prévues » nécessitent le backend (historique multi-utilisateurs, appareils, paiements).</p>
        </Panel>
      </div>
    </div>
  )
}
