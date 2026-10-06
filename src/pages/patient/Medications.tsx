import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, Info, Pill, Search } from 'lucide-react'
import type { Medication } from '../../types'
import { MEDICATIONS, MEDICATION_META } from '../../data/medications'
import { searchMedications } from '../../data/assistant'
import { dateFr, fcfa } from '../../lib/format'
import { MedThumb } from '../../components/MedImage'
import { Badge, Button, Chips, CmuBadge, EmptyState, PageHeader, PriceLevelBadge, Select, cx } from '../../components/ui'

type Filter = 'tous' | 'cmu' | 'hors_cmu'

const FILTERS: Record<Filter, (m: Medication) => boolean> = {
  tous: () => true,
  cmu: (m) => m.cmu.status === 'pris_en_charge',
  hors_cmu: (m) => m.cmu.status !== 'pris_en_charge',
}

const PAGE = 50

let CLASSES: { src: Medication | undefined; list: string[] } = { src: undefined, list: [] }
/** Classes thérapeutiques présentes dans la base (calculées une fois). */
function therapeuticClasses() {
  if (CLASSES.src !== MEDICATIONS[0]) {
    CLASSES = {
      src: MEDICATIONS[0],
      list: [...new Set(MEDICATIONS.map((m) => m.therapeuticClass).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, 'fr')),
    }
  }
  return CLASSES.list
}

function SourceNote({ className }: { className?: string }) {
  return (
    <div className={cx('rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 text-xs leading-relaxed text-slate-600', className)}>
      <p className="mb-1.5 flex items-center gap-2 text-sm font-bold text-ink"><Info size={16} className="text-brand-600" />Sources des données</p>
      <ul className="space-y-1">
        {MEDICATION_META.prixUrl && (
          <li>
            Prix : <a href={MEDICATION_META.prixUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline">« Prix des médicaments en pharmacie en Côte d'Ivoire »</a> — pharmacies-de-garde.ci
            {MEDICATION_META.prixUpdatedAt && <>, mise à jour du {dateFr(MEDICATION_META.prixUpdatedAt)}</>}.
          </li>
        )}
        {MEDICATION_META.cmuUrl && (
          <li>
            CMU : <a href={MEDICATION_META.cmuUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline">« Liste des médicaments pris en charge par la CMU »</a> — pharmacies-de-garde.ci
            {MEDICATION_META.cmuUpdatedAt && <>, mise à jour du {dateFr(MEDICATION_META.cmuUpdatedAt)}</>}.
          </li>
        )}
      </ul>
      <p className="mt-2">
        Les prix affichés sont ceux publiés par la source : ce ne sont pas des prix officiels et ils peuvent varier selon la pharmacie.
        Seule la liste CMU publiée par la CNAM / le ministère de la Santé fait foi. Ces informations ne remplacent ni la notice ni l'avis d'un pharmacien.
      </p>
    </div>
  )
}

export default function Medications() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [filter, setFilter] = useState<Filter>('tous')
  const [cls, setCls] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const classes = therapeuticClasses()

  const results = useMemo(() => {
    const f = FILTERS[filter]
    return searchMedications(q, (m) => f(m) && (!cls || m.therapeuticClass === cls))
  }, [q, filter, cls])
  const shown = results.slice(0, limit)

  const onSearch = (v: string) => {
    setQ(v)
    setLimit(PAGE)
    setParams(v ? { q: v } : {}, { replace: true })
  }

  if (MEDICATIONS.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="PHARMA MED" subtitle="Base d'information sur les médicaments" icon={<Pill size={22} />} />
        <EmptyState
          icon={<Pill />}
          title="Base médicaments non chargée"
          text="Les données (liste des prix et liste CMU publiées sur pharmacies-de-garde.ci) n'ont pas pu être chargées. Réessayez plus tard ou lancez la synchronisation."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="PHARMA MED" subtitle={`${MEDICATIONS.length.toLocaleString('fr-FR')} produits — prix et liste CMU publiés`} icon={<Pill size={22} />} />

      <div className="mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-lg shadow-brand-700/20">
        <p className="text-lg font-extrabold">Rechercher un médicament</p>
        <p className="text-sm text-white/80">Par nom commercial, DCI (molécule), classe thérapeutique ou code produit.</p>
        <div className="relative mt-3">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Ex. paracétamol, Coartem, antipaludéen, 3258453…"
            className="w-full rounded-2xl border-0 bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none ring-4 ring-white/10 placeholder:text-slate-400"
            aria-label="Rechercher un médicament"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <Chips
            value={filter}
            onChange={(v) => { setFilter(v); setLimit(PAGE) }}
            options={[
              { value: 'tous', label: 'Tous' },
              { value: 'cmu', label: '✅ Liste CMU' },
              { value: 'hors_cmu', label: 'Hors liste CMU' },
            ]}
          />
        </div>
        {classes.length > 0 && (
          <Select aria-label="Classe thérapeutique" value={cls} onChange={(e) => { setCls(e.target.value); setLimit(PAGE) }} className="sm:w-72">
            <option value="">Toutes les classes thérapeutiques</option>
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        )}
      </div>

      <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {results.length.toLocaleString('fr-FR')} résultat{results.length > 1 ? 's' : ''}
        {results.length > shown.length && ` · ${shown.length} affichés`}
      </p>

      {results.length === 0 ? (
        <EmptyState icon={<Search />} title="Aucun médicament trouvé" text="Vérifiez l'orthographe, essayez la DCI (nom de la molécule) ou le code produit." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {shown.map((m) => {
              const sub = [m.dci, m.dosage, m.form].filter(Boolean).join(' · ')
              return (
                <Link key={m.id} to={`/medicaments/${m.id}`} className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <MedThumb m={m} className="h-11 w-11 rounded-xl bg-brand-50 text-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold leading-tight group-hover:text-brand-700">{m.brand}</p>
                      {sub && <p className="mt-0.5 text-sm text-slate-500">{sub}</p>}
                      {m.therapeuticClass && <p className="text-xs text-slate-400">{m.therapeuticClass}</p>}
                    </div>
                    <ChevronRight size={18} className="mt-1 shrink-0 text-slate-300 group-hover:text-brand-500" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <CmuBadge status={m.cmu.status} />
                    {m.code && <Badge tone="slate">Code {m.code}</Badge>}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    {m.price ? (
                      <>
                        <PriceLevelBadge level={m.price.level} />
                        <span className="font-extrabold tabular-nums">{fcfa(m.price.amount)}</span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">Prix non publié par la source</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
          {results.length > shown.length && (
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
                Afficher plus ({(results.length - shown.length).toLocaleString('fr-FR')} restants)
              </Button>
            </div>
          )}
        </>
      )}

      <SourceNote className="mt-6" />
    </div>
  )
}
