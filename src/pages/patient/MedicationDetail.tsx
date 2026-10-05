import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, Bot, ChevronRight, FileText, MapPin, Pill, ShieldCheck, Tag } from 'lucide-react'
import type { Medication } from '../../types'
import { medById } from '../../data/medications'
import { DRUG_ALERTS } from '../../data/alerts'
import { dateFr, fcfa } from '../../lib/format'
import { Badge, ButtonLink, CMU_LABEL, Card, CmuBadge, EmptyState, Notice, PageHeader, PRICE_LEVEL, PriceLevelBadge, Section, cx } from '../../components/ui'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-slate-100 py-2.5 last:border-0 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm leading-relaxed">{children || <span className="text-slate-400">Non renseigné</span>}</dd>
    </div>
  )
}

const CMU_BG = { pris_en_charge: 'from-emerald-50 to-white border-emerald-200', non_pris_en_charge: 'from-red-50 to-white border-red-200', a_verifier: 'from-amber-50 to-white border-amber-200' }

export default function MedicationDetail() {
  const { id } = useParams()
  const m = medById(id)

  if (!m) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Médicament introuvable" back="/medicaments" />
        <EmptyState icon={<Pill />} title="Ce médicament n'est pas dans la base PHARMA MED" action={<ButtonLink to="/medicaments">Retour à la recherche</ButtonLink>} />
      </div>
    )
  }

  const equivalents = m.equivalents.map((e) => medById(e)).filter((x): x is Medication => !!x)
  const alerts = DRUG_ALERTS.filter((a) => a.medication === m.id)
  const recalled = m.lots.filter((l) => l.status === 'rappele')

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={m.brand} subtitle={`${m.dci} · ${m.dosage} · ${m.form}`} back="/medicaments" />

      <div className="mb-5 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-lg shadow-brand-700/20">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-3xl">💊</div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{m.therapeuticClass}</p>
            <p className="text-xl font-extrabold leading-tight">{m.brand}</p>
            <p className="text-sm text-white/80">{m.presentation} · {m.lab}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">{m.prescriptionRequired ? '📝 Sur ordonnance' : '🛒 Sans ordonnance'}</span>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">{CMU_LABEL[m.cmu.status].icon} {CMU_LABEL[m.cmu.status].label}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <ButtonLink to={`/pharmacies`} variant="accent"><MapPin size={16} />Trouver une pharmacie</ButtonLink>
          <ButtonLink to={`/vigilance?med=${m.id}`} className="bg-white/15 text-white hover:bg-white/25"><AlertTriangle size={16} />Signaler un effet</ButtonLink>
          <ButtonLink to={`/assistant?q=${encodeURIComponent(`À quoi sert ${m.brand} ?`)}`} className="bg-white text-brand-700 hover:bg-brand-50"><Bot size={16} />Demander à PHARMA AI</ButtonLink>
        </div>
      </div>

      {(alerts.length > 0 || recalled.length > 0) && (
        <Notice tone="red" icon={<AlertTriangle size={18} />} className="mb-5">
          <p className="font-bold">Alerte associée à ce médicament</p>
          {recalled.length > 0 && <p>Lot(s) rappelé(s) (démo) : {recalled.map((l) => l.lot).join(', ')}. Vérifiez votre boîte avec SCAN PHARMA.</p>}
          <div className="mt-1 flex flex-wrap gap-3">
            <Link to="/alertes" className="font-semibold underline">Voir les alertes</Link>
            <Link to="/scan" className="font-semibold underline">SCAN PHARMA</Link>
          </div>
        </Notice>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <Section title="Fiche médicament">
            <Card>
              <dl>
                <Row label="Nom commercial">{m.brand}</Row>
                <Row label="DCI">{m.dci}</Row>
                <Row label="Dosage">{m.dosage}</Row>
                <Row label="Forme">{m.form}</Row>
                <Row label="Présentation">{m.presentation}</Row>
                <Row label="Laboratoire">{m.lab}</Row>
                <Row label="Classe thérapeutique">{m.therapeuticClass}</Row>
                <Row label="Statut réglementaire">{m.regulatoryStatus}</Row>
              </dl>
            </Card>
          </Section>

          <Section title="Bon usage">
            <Card>
              <dl>
                <Row label="Indications">{m.indications}</Row>
                <Row label="Précautions">{m.precautions}</Row>
                <Row label="Contre-indications">{m.contraindications}</Row>
                <Row label="Effets indésirables">{m.sideEffects}</Row>
                <Row label="Conservation">{m.storage}</Row>
                <Row label="Notice">
                  <span className="flex gap-2"><FileText size={16} className="mt-0.5 shrink-0 text-slate-400" />{m.leaflet}</span>
                </Row>
              </dl>
            </Card>
          </Section>

          <Section title="Équivalents et génériques">
            {equivalents.length === 0 ? (
              <Card className="text-sm text-slate-500">Aucun équivalent (même DCI, même dosage) référencé dans la base de démonstration.</Card>
            ) : (
              <div className="space-y-2">
                {equivalents.map((e) => (
                  <Link key={e.id} to={`/medicaments/${e.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm hover:border-brand-200">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100">💊</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{e.brand}</p>
                      <p className="text-xs text-slate-500">{e.form} · {e.lab}</p>
                    </div>
                    <span className="hidden text-sm font-bold tabular-nums sm:block">{fcfa(e.price.amount)}</span>
                    <ChevronRight size={16} className="text-slate-300" />
                  </Link>
                ))}
              </div>
            )}
            <Notice tone="orange" icon={<AlertTriangle size={16} />} className="mt-3">
              Ne substituez pas un médicament sans l'avis de votre pharmacien ou de votre prescripteur. Un équivalent peut différer par ses excipients ou sa présentation.
            </Notice>
          </Section>
        </div>

        <aside className="space-y-5">
          <div className={cx('rounded-2xl border bg-gradient-to-b p-4', CMU_BG[m.cmu.status])}>
            <p className="mb-2 flex items-center gap-2 font-bold"><ShieldCheck size={18} className="text-brand-600" />PHARMA CMU</p>
            <CmuBadge status={m.cmu.status} />
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Référence</dt><dd className="text-right font-semibold">{m.cmu.reference ?? '—'}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">DCI</dt><dd className="text-right font-semibold">{m.dci}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Forme</dt><dd className="text-right font-semibold">{m.form}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Conditions</dt><dd className="text-right font-semibold">{m.cmu.conditions ?? 'Selon la liste officielle'}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Mise à jour</dt><dd className="text-right font-semibold">{dateFr(m.cmu.updatedAt)}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-slate-500">Source : {m.cmu.source}</p>
          </div>

          <Card>
            <p className="mb-2 flex items-center gap-2 font-bold"><Tag size={18} className="text-accent-500" />Prix</p>
            <p className="text-3xl font-extrabold tabular-nums">{m.price.level === 'confirme' ? '' : '~ '}{fcfa(m.price.amount)}</p>
            <div className="mt-2"><PriceLevelBadge level={m.price.level} /></div>
            <p className="mt-2 text-xs text-slate-600">{PRICE_LEVEL[m.price.level].help}</p>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Relevé le</dt><dd className="font-semibold">{dateFr(m.price.updatedAt)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Source</dt><dd className="text-right font-semibold">{m.price.source}</dd></div>
            </dl>
            <p className="mt-3 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-500">
              <b>PHARMA PRIX :</b> ce prix n'est pas un prix officiel. Il peut varier selon la pharmacie ; seul le prix payé en pharmacie fait foi.
            </p>
          </Card>

          {m.lots.length > 0 && (
            <Card>
              <p className="mb-2 font-bold">Lots connus (démo)</p>
              <ul className="space-y-1.5 text-sm">
                {m.lots.map((l) => (
                  <li key={l.lot} className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs">{l.lot}</span>
                    <Badge tone={l.status === 'conforme' ? 'green' : l.status === 'rappele' ? 'red' : 'orange'}>
                      {l.status === 'conforme' ? '✅ Conforme' : l.status === 'rappele' ? '🚨 Rappelé' : '⚠️ Inconnu'}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>

      <Notice tone="blue" icon={<FileText size={16} />} className="mt-2">
        Ces informations sont générales et de démonstration. Elles ne remplacent ni la notice officielle du médicament, ni l'avis de votre pharmacien ou de votre médecin.
      </Notice>
    </div>
  )
}
