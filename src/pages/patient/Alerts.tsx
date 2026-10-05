import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, ChevronRight, ScanLine } from 'lucide-react'
import type { DrugAlert } from '../../types'
import { ALERT_KIND, DRUG_ALERTS } from '../../data/alerts'
import { medById } from '../../data/medications'
import { dateFr } from '../../lib/format'
import { Badge, ButtonLink, Chips, EmptyState, Notice, PageHeader, cx } from '../../components/ui'

type Kind = DrugAlert['kind'] | 'tous'

export default function Alerts() {
  const [kind, setKind] = useState<Kind>('tous')
  const list = DRUG_ALERTS.filter((a) => kind === 'tous' || a.kind === kind).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Alertes médicaments" subtitle="Rappels de lots, défauts de qualité, faux médicaments" icon={<BellRing size={22} />} />

      <div className="mb-4 flex flex-col gap-3 rounded-3xl bg-gradient-to-br from-red-600 to-accent-500 p-5 text-white shadow-lg shadow-red-600/20 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold">Vérifiez vos boîtes 🔍</p>
          <p className="text-sm text-white/85">Saisissez ou scannez le numéro de lot pour savoir s'il fait l'objet d'une alerte.</p>
        </div>
        <ButtonLink to="/scan" className="bg-white text-red-600 hover:bg-red-50"><ScanLine size={16} />SCAN PHARMA</ButtonLink>
      </div>

      <Chips
        value={kind}
        onChange={setKind}
        options={[
          { value: 'tous', label: 'Toutes' },
          ...(Object.keys(ALERT_KIND) as DrugAlert['kind'][]).map((k) => ({ value: k as Kind, label: `${ALERT_KIND[k].emoji} ${ALERT_KIND[k].label}` })),
        ]}
      />

      <div className="mt-4 space-y-3">
        {list.length === 0 && <EmptyState icon={<BellRing />} title="Aucune alerte dans cette catégorie" />}
        {list.map((a) => {
          const k = ALERT_KIND[a.kind]
          const med = medById(a.medication)
          return (
            <article key={a.id} className={cx('rounded-2xl border bg-white p-4 shadow-sm', a.kind === 'rappel' ? 'border-red-200' : 'border-slate-200/80')}>
              <div className="flex items-start gap-3">
                <div className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl', k.bg)}>{k.emoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={k.tone}>{k.label}</Badge>
                    <span className="text-xs text-slate-400">{dateFr(a.date)}</span>
                  </div>
                  <h2 className="mt-1.5 font-bold leading-snug">{a.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{a.description}</p>
                  {a.lots && a.lots.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500">Lot(s) :</span>
                      {a.lots.map((l) => (
                        <Link key={l} to={`/scan?lot=${l}`} className="rounded-lg bg-red-50 px-2 py-0.5 font-mono text-xs font-bold text-red-700 hover:bg-red-100">{l}</Link>
                      ))}
                    </div>
                  )}
                  {med && (
                    <Link to={`/medicaments/${med.id}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
                      💊 {med.brand}<ChevronRight size={14} />
                    </Link>
                  )}
                  <p className="mt-2 text-[11px] text-slate-400">Source : {a.source}</p>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <Notice tone="orange" className="mt-6">
        <b>Alertes fictives de démonstration.</b> En production, les alertes proviennent exclusivement des sources officielles (AIRP — Autorité Ivoirienne de Régulation Pharmaceutique, ministère de la Santé). Ne jetez pas un médicament et n'interrompez pas un traitement sans avis : rapprochez-vous de votre pharmacien.
      </Notice>
      <div className="mt-3 text-center">
        <Link to="/vigilance" className="text-sm font-semibold text-brand-600 hover:underline">Signaler un problème de qualité →</Link>
      </div>
    </div>
  )
}
