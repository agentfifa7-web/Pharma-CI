import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, Info, Pill, Search } from 'lucide-react'
import type { Medication } from '../../types'
import { MEDICATIONS } from '../../data/medications'
import { fcfa, normalize } from '../../lib/format'
import { Badge, Chips, CmuBadge, EmptyState, PageHeader, PRICE_LEVEL, PriceLevelBadge, cx } from '../../components/ui'

type Filter = 'tous' | 'cmu' | 'otc' | 'rx'

const FILTERS: Record<Filter, (m: Medication) => boolean> = {
  tous: () => true,
  cmu: (m) => m.cmu.status === 'pris_en_charge',
  otc: (m) => !m.prescriptionRequired,
  rx: (m) => m.prescriptionRequired,
}

function PharmaPrixBox({ className }: { className?: string }) {
  return (
    <div className={cx('rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4', className)}>
      <p className="flex items-center gap-2 text-sm font-bold"><Info size={16} className="text-brand-600" />PHARMA PRIX — comment lire un prix ?</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {(['indicatif', 'communique', 'confirme'] as const).map((l) => (
          <div key={l} className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
            <PriceLevelBadge level={l} />
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{PRICE_LEVEL[l].help}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Aucun prix affiché n'est un prix officiel. Le prix réel est celui de la pharmacie, au moment de l'achat.
      </p>
    </div>
  )
}

export default function Medications() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [filter, setFilter] = useState<Filter>('tous')

  const results = useMemo(() => {
    const n = normalize(q)
    return MEDICATIONS.filter(FILTERS[filter]).filter((m) =>
      !n || [m.brand, m.dci, m.therapeuticClass, m.form].some((f) => normalize(f).includes(n)),
    )
  }, [q, filter])

  const onSearch = (v: string) => {
    setQ(v)
    setParams(v ? { q: v } : {}, { replace: true })
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="PHARMA MED" subtitle="Base d'information sur les médicaments" icon={<Pill size={22} />} />

      <div className="mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-lg shadow-brand-700/20">
        <p className="text-lg font-extrabold">Rechercher un médicament</p>
        <p className="text-sm text-white/80">Par nom commercial, DCI (molécule) ou classe thérapeutique.</p>
        <div className="relative mt-3">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Ex. paracétamol, Coartem, antibiotique…"
            className="w-full rounded-2xl border-0 bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none ring-4 ring-white/10 placeholder:text-slate-400"
            aria-label="Rechercher un médicament"
          />
        </div>
      </div>

      <Chips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'tous', label: 'Tous' },
          { value: 'cmu', label: '✅ CMU pris en charge' },
          { value: 'otc', label: 'Sans ordonnance' },
          { value: 'rx', label: 'Sur ordonnance' },
        ]}
      />

      <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {results.length} résultat{results.length > 1 ? 's' : ''}
      </p>

      {results.length === 0 ? (
        <EmptyState icon={<Search />} title="Aucun médicament trouvé" text="Vérifiez l'orthographe ou essayez la DCI (nom de la molécule)." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((m) => (
            <Link key={m.id} to={`/medicaments/${m.id}`} className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-xl">💊</div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-tight group-hover:text-brand-700">{m.brand}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{m.dci} · {m.dosage}</p>
                  <p className="text-xs text-slate-400">{m.form} · {m.therapeuticClass}</p>
                </div>
                <ChevronRight size={18} className="mt-1 shrink-0 text-slate-300 group-hover:text-brand-500" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <CmuBadge status={m.cmu.status} />
                {m.prescriptionRequired ? <Badge tone="violet">Sur ordonnance</Badge> : <Badge tone="slate">Sans ordonnance</Badge>}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <PriceLevelBadge level={m.price.level} />
                <span className="font-extrabold tabular-nums">{m.price.level === 'confirme' ? '' : '~ '}{fcfa(m.price.amount)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <PharmaPrixBox className="mt-6" />
      <p className="mt-3 text-center text-xs text-slate-400">
        Informations générales de démonstration — elles ne remplacent ni la notice ni l'avis d'un pharmacien ou d'un médecin.
      </p>
    </div>
  )
}
