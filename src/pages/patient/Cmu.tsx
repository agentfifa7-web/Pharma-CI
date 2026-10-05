import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ExternalLink, Search, ShieldCheck } from 'lucide-react'
import type { Medication } from '../../types'
import { MEDICATIONS, MEDICATION_META } from '../../data/medications'
import { searchMedications } from '../../data/assistant'
import { dateFr, fcfa } from '../../lib/format'
import { Button, Chips, EmptyState, Notice, PageHeader, cx } from '../../components/ui'

type Filter = 'cmu' | 'hors_cmu' | 'tous'
const PAGE = 50
const onList = (m: Medication) => m.cmu.status === 'pris_en_charge'

export default function Cmu() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [filter, setFilter] = useState<Filter>(params.get('q') ? 'tous' : 'cmu')
  const [limit, setLimit] = useState(PAGE)

  const counts = useMemo(() => {
    let inList = 0
    for (const m of MEDICATIONS) if (onList(m)) inList++
    return { inList, out: MEDICATIONS.length - inList }
  }, [])

  const results = useMemo(
    () => searchMedications(q, filter === 'cmu' ? onList : filter === 'hors_cmu' ? (m) => !onList(m) : undefined),
    [q, filter],
  )
  const shown = results.slice(0, limit)

  const onSearch = (v: string) => {
    setQ(v)
    setLimit(PAGE)
    setParams(v ? { q: v } : {}, { replace: true })
  }
  const sourceUrl = MEDICATION_META.cmuUrl

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="PHARMA CMU" subtitle="Votre médicament figure-t-il sur la liste CMU ?" icon={<ShieldCheck size={22} />} />

      <div className="mb-5 rounded-3xl bg-gradient-to-br from-emerald-600 via-brand-600 to-brand-800 p-5 text-white shadow-lg shadow-brand-700/20">
        <p className="text-lg font-extrabold">🛡️ Couverture Maladie Universelle</p>
        <p className="mt-1 text-sm leading-relaxed text-white/85">
          La CMU prend en charge une liste de médicaments définie par les autorités. Recherchez un médicament pour savoir s'il figure
          sur la liste publiée par pharmacies-de-garde.ci{MEDICATION_META.cmuUpdatedAt && <> (mise à jour du {dateFr(MEDICATION_META.cmuUpdatedAt)})</>}.
        </p>
        <div className="relative mt-4">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Nom du médicament, DCI ou classe…"
            aria-label="Rechercher un médicament"
            className="w-full rounded-2xl bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {MEDICATIONS.length === 0 ? (
        <EmptyState icon={<ShieldCheck />} title="Liste CMU non chargée" text="Les données n'ont pas pu être chargées. Réessayez plus tard." />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3">
            <button onClick={() => { setFilter(filter === 'cmu' ? 'tous' : 'cmu'); setLimit(PAGE) }} className={cx('rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 text-left transition', filter === 'cmu' && 'ring-2 ring-ink')}>
              <p className="text-xl">✅</p>
              <p className="text-2xl font-extrabold tabular-nums">{counts.inList.toLocaleString('fr-FR')}</p>
              <p className="text-[11px] font-semibold leading-tight text-slate-600 sm:text-xs">produits sur la liste CMU publiée</p>
            </button>
            <button onClick={() => { setFilter(filter === 'hors_cmu' ? 'tous' : 'hors_cmu'); setLimit(PAGE) }} className={cx('rounded-2xl border border-amber-200 bg-amber-50/60 p-3 text-left transition', filter === 'hors_cmu' && 'ring-2 ring-ink')}>
              <p className="text-xl">⚠️</p>
              <p className="text-2xl font-extrabold tabular-nums">{counts.out.toLocaleString('fr-FR')}</p>
              <p className="text-[11px] font-semibold leading-tight text-slate-600 sm:text-xs">produits absents de la liste (à vérifier)</p>
            </button>
          </div>

          <Chips
            value={filter}
            onChange={(v) => { setFilter(v); setLimit(PAGE) }}
            options={[
              { value: 'cmu', label: '✅ Sur la liste CMU' },
              { value: 'hors_cmu', label: '⚠️ Hors liste' },
              { value: 'tous', label: 'Tous' },
            ]}
          />

          <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {results.length.toLocaleString('fr-FR')} résultat{results.length > 1 ? 's' : ''}
            {results.length > shown.length && ` · ${shown.length} affichés`}
          </p>

          <div className="space-y-3">
            {results.length === 0 && <EmptyState icon={<Search />} title="Aucun résultat" text="Essayez la DCI (nom de la molécule) ou une partie du nom." />}
            {shown.map((m) => {
              const listed = onList(m)
              const details: [string, string | undefined][] = [['DCI', m.dci], ['Dosage', m.dosage], ['Forme', m.form], ['Classe', m.therapeuticClass]]
              return (
                <div key={m.id} className={cx('rounded-2xl border p-4', listed ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60')}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none">{listed ? '✅' : '⚠️'}</span>
                    <div className="min-w-0 flex-1">
                      <Link to={`/medicaments/${m.id}`} className="font-bold hover:text-brand-700">{m.brand}</Link>
                      <p className="text-sm font-semibold text-slate-700">{listed ? 'Sur la liste CMU publiée' : 'Absent de la liste CMU publiée — à vérifier'}</p>
                      <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                        {details.filter(([, v]) => !!v).map(([k, v]) => (
                          <div key={k}><dt className="inline text-slate-500">{k} : </dt><dd className="break-source inline font-semibold">{v}</dd></div>
                        ))}
                        {m.price && <div><dt className="inline text-slate-500">Prix publié : </dt><dd className="inline font-semibold tabular-nums">{fcfa(m.price.amount)}</dd></div>}
                        {!listed && m.cmuCandidates && m.cmuCandidates.length > 0 && (
                          <div className="sm:col-span-2 text-xs text-slate-600">D'autres produits de la même marque figurent sur la liste — voir la fiche (sans conclure à une prise en charge).</div>
                        )}
                      </dl>
                    </div>
                  </div>
                </div>
              )
            })}
            {results.length > shown.length && (
              <div className="text-center">
                <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>Afficher plus ({(results.length - shown.length).toLocaleString('fr-FR')} restants)</Button>
              </div>
            )}
          </div>
        </>
      )}

      <Notice tone="orange" className="my-5" icon={<ExternalLink size={16} />}>
        <p>
          Source :{' '}
          {sourceUrl ? (
            <a href={sourceUrl} target="_blank" rel="noreferrer" className="font-semibold underline">« Liste des médicaments pris en charge par la CMU » — pharmacies-de-garde.ci</a>
          ) : 'liste CMU publiée sur pharmacies-de-garde.ci'}
          {MEDICATION_META.cmuUpdatedAt && <> (mise à jour du {dateFr(MEDICATION_META.cmuUpdatedAt)})</>}.
        </p>
        <p className="mt-1">
          Seule la liste officielle publiée par la CNAM et le ministère de la Santé fait foi :{' '}
          <a href="https://www.sante.gouv.ci" target="_blank" rel="noreferrer" className="font-semibold underline">sante.gouv.ci</a>.
          Les conditions de prise en charge (ordonnance, carte CMU, établissement conventionné) sont à vérifier auprès de votre pharmacien.
        </p>
      </Notice>

      <p className="text-center text-sm">
        <Link to="/pharmacies" className="font-semibold text-brand-600 hover:underline">Trouver une pharmacie →</Link>
      </p>
    </div>
  )
}
