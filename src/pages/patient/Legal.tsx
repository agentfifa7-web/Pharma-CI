import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Scale, Search } from 'lucide-react'
import { LEGAL_CATEGORIES, OFFICIAL_SOURCES } from '../../data/legal'
import { normalize } from '../../lib/format'
import { Badge, Chips, EmptyState, Notice, PageHeader, Section } from '../../components/ui'

type Audience = 'Tous' | 'Patients' | 'Pharmaciens' | 'Professionnels de santé'

export default function Legal() {
  const [q, setQ] = useState('')
  const [audience, setAudience] = useState<Audience>('Tous')

  const list = useMemo(() => {
    const n = normalize(q)
    return LEGAL_CATEGORIES.filter((c) =>
      (audience === 'Tous' || c.audience.includes(audience) || c.audience.includes('Tous')) &&
      (!n || normalize([c.title, c.description, ...c.covers].join(' ')).includes(n)),
    )
  }, [q, audience])

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="PHARMA LEGAL" subtitle="Bibliothèque réglementaire de la pharmacie" icon={<Scale size={22} />} />

      <div className="mb-4 rounded-3xl bg-gradient-to-br from-slate-800 to-ink p-5 text-white shadow-lg">
        <p className="text-lg font-extrabold">⚖️ Textes et réglementation</p>
        <p className="mt-1 text-sm text-white/75">Déontologie, lois, décrets, arrêtés, pharmacovigilance, droits des patients… Retrouvez les grandes catégories de textes et accédez aux sources officielles.</p>
        <div className="relative mt-4">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher : garde, déontologie, AMM, données…"
            aria-label="Rechercher dans la bibliothèque"
            className="w-full rounded-2xl bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <Chips
        value={audience}
        onChange={setAudience}
        options={(['Tous', 'Patients', 'Pharmaciens', 'Professionnels de santé'] as Audience[]).map((a) => ({ value: a, label: a }))}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {list.length === 0 && <div className="sm:col-span-2"><EmptyState icon={<Search />} title="Aucune catégorie trouvée" /></div>}
        {list.map((c) => (
          <article key={c.id} className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-2xl">{c.emoji}</span>
              <div className="min-w-0">
                <h2 className="font-bold leading-snug">{c.title}</h2>
                <div className="mt-1 flex flex-wrap gap-1">{c.audience.map((a) => <Badge key={a} tone="slate">{a}</Badge>)}</div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{c.description}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {c.covers.map((x) => <li key={x} className="rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{x}</li>)}
            </ul>
            <div className="mt-auto space-y-1.5 pt-4">
              {c.sources.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-ink hover:bg-slate-100">
                  <span className="min-w-0 truncate">Consulter la source officielle · {s.label}</span>
                  <ExternalLink size={14} className="shrink-0 text-slate-400" />
                </a>
              ))}
            </div>
          </article>
        ))}
      </div>

      <Notice tone="orange" className="my-5">
        Les textes officiels (références, contenus, mises à jour) seront intégrés directement depuis les sources officielles. PHARMA CI ne reproduit aucune référence non vérifiée :
        consultez toujours le texte publié par l'autorité compétente.
      </Notice>

      <Section title="Portails officiels">
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.values(OFFICIAL_SOURCES).map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-brand-200">
              <p className="text-sm font-bold">{s.label}</p>
              <p className="mt-1 flex items-center gap-1 break-all text-xs text-brand-600">{s.url.replace('https://', '')}<ExternalLink size={12} className="shrink-0" /></p>
            </a>
          ))}
        </div>
      </Section>

      <p className="text-center text-sm text-slate-500">Voir aussi : <Link to="/ordre" className="font-semibold text-brand-600 hover:underline">Ordre des pharmaciens</Link></p>
    </div>
  )
}
