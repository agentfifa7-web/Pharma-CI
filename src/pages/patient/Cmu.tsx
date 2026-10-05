import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ExternalLink, Search, ShieldCheck } from 'lucide-react'
import type { CmuStatus } from '../../types'
import { MEDICATIONS } from '../../data/medications'
import { dateFr, normalize } from '../../lib/format'
import { usePharmacies } from '../../lib/usePharmacies'
import PharmacyCard from '../../components/PharmacyCard'
import { ButtonLink, CMU_LABEL, Chips, EmptyState, Notice, PageHeader, Section, cx } from '../../components/ui'

const STATUS_STYLE: Record<CmuStatus, string> = {
  pris_en_charge: 'border-emerald-200 bg-emerald-50/60',
  non_pris_en_charge: 'border-red-200 bg-red-50/60',
  a_verifier: 'border-amber-200 bg-amber-50/60',
}

export default function Cmu() {
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [status, setStatus] = useState<CmuStatus | 'tous'>('tous')
  const pharmacies = usePharmacies()
  const cmuPharmacies = pharmacies.filter((p) => p.cmuVerified).slice(0, 5)

  const counts = useMemo(() => {
    const c: Record<CmuStatus, number> = { pris_en_charge: 0, non_pris_en_charge: 0, a_verifier: 0 }
    MEDICATIONS.forEach((m) => c[m.cmu.status]++)
    return c
  }, [])

  const results = useMemo(() => {
    const n = normalize(q)
    return MEDICATIONS.filter((m) => (status === 'tous' || m.cmu.status === status) && (!n || normalize(`${m.brand} ${m.dci}`).includes(n)))
  }, [q, status])

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="PHARMA CMU" subtitle="Votre médicament est-il pris en charge par la CMU ?" icon={<ShieldCheck size={22} />} />

      <div className="mb-5 rounded-3xl bg-gradient-to-br from-emerald-600 via-brand-600 to-brand-800 p-5 text-white shadow-lg shadow-brand-700/20">
        <p className="text-lg font-extrabold">🛡️ Couverture Maladie Universelle</p>
        <p className="mt-1 text-sm leading-relaxed text-white/85">
          La CMU prend en charge une liste de médicaments définie par les autorités, selon la DCI, le dosage et la forme.
          Recherchez un médicament pour connaître son statut, sa référence et les conditions de prise en charge.
        </p>
        <div className="relative mt-4">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom du médicament ou DCI…"
            aria-label="Rechercher un médicament"
            className="w-full rounded-2xl bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        {(Object.keys(counts) as CmuStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(status === s ? 'tous' : s)}
            className={cx('rounded-2xl border p-3 text-left transition', STATUS_STYLE[s], status === s && 'ring-2 ring-ink')}
          >
            <p className="text-xl">{CMU_LABEL[s].icon}</p>
            <p className="text-2xl font-extrabold tabular-nums">{counts[s]}</p>
            <p className="text-[11px] font-semibold leading-tight text-slate-600 sm:text-xs">{CMU_LABEL[s].label.replace('CMU : ', '')}</p>
          </button>
        ))}
      </div>

      <Chips
        value={status}
        onChange={setStatus}
        options={[
          { value: 'tous', label: 'Tous' },
          { value: 'pris_en_charge', label: '✅ Pris en charge' },
          { value: 'non_pris_en_charge', label: '❌ Non pris en charge' },
          { value: 'a_verifier', label: '⚠️ À vérifier' },
        ]}
      />

      <div className="mt-3 space-y-3">
        {results.length === 0 && <EmptyState icon={<Search />} title="Aucun résultat" text="Essayez la DCI (nom de la molécule)." />}
        {results.map((m) => (
          <div key={m.id} className={cx('rounded-2xl border p-4', STATUS_STYLE[m.cmu.status])}>
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none">{CMU_LABEL[m.cmu.status].icon}</span>
              <div className="min-w-0 flex-1">
                <Link to={`/medicaments/${m.id}`} className="font-bold hover:text-brand-700">{m.brand}</Link>
                <p className="text-sm font-semibold text-slate-700">{CMU_LABEL[m.cmu.status].label}</p>
                <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                  <div><dt className="inline text-slate-500">Référence : </dt><dd className="inline font-semibold">{m.cmu.reference ?? '—'}</dd></div>
                  <div><dt className="inline text-slate-500">DCI : </dt><dd className="inline font-semibold">{m.dci} {m.dosage}</dd></div>
                  <div><dt className="inline text-slate-500">Forme : </dt><dd className="inline font-semibold">{m.form}</dd></div>
                  <div><dt className="inline text-slate-500">Conditions : </dt><dd className="inline font-semibold">{m.cmu.conditions ?? 'Ordonnance + carte CMU'}</dd></div>
                </dl>
                <p className="mt-2 text-xs text-slate-500">Source : {m.cmu.source} · Mise à jour : {dateFr(m.cmu.updatedAt)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Notice tone="orange" className="my-5" icon={<ExternalLink size={16} />}>
        <p>
          Statuts de <b>démonstration</b>. Seule la liste officielle des médicaments pris en charge, publiée par le ministère de la Santé, fait foi :{' '}
          <a href="https://www.sante.gouv.ci" target="_blank" rel="noreferrer" className="font-semibold underline">sante.gouv.ci</a>.
          En production, cette liste est importée depuis les sources officielles et tenue à jour.
        </p>
      </Notice>

      <Section title="Pharmacies CMU vérifiées près de vous" action={<Link to="/pharmacies" className="text-sm font-semibold text-brand-600">Tout voir</Link>}>
        {cmuPharmacies.length === 0 ? (
          <EmptyState icon={<ShieldCheck />} title="Aucune pharmacie CMU vérifiée" action={<ButtonLink to="/pharmacies">Annuaire</ButtonLink>} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {cmuPharmacies.map((p) => <PharmacyCard key={p.id} p={p} compact />)}
          </div>
        )}
      </Section>
    </div>
  )
}
