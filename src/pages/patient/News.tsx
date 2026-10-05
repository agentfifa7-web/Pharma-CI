import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Newspaper } from 'lucide-react'
import { NEWS, NEWS_CATEGORIES } from '../../data/news'
import { dateFr } from '../../lib/format'
import { Badge, Chips, EmptyState, Notice, PageHeader } from '../../components/ui'

export default function News() {
  const [cat, setCat] = useState<string>('Toutes')
  const list = NEWS.filter((n) => cat === 'Toutes' || n.category === cat)
  const [featured, ...rest] = list

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="PHARMA NEWS CI" subtitle="Informations santé et médicaments" icon={<Newspaper size={22} />} />

      <Chips
        value={cat}
        onChange={setCat}
        options={[{ value: 'Toutes', label: 'Toutes' }, ...NEWS_CATEGORIES.filter((c) => NEWS.some((n) => n.category === c)).map((c) => ({ value: c as string, label: c }))]}
      />

      {!featured ? (
        <div className="mt-4"><EmptyState icon={<Newspaper />} title="Aucun article dans cette catégorie" /></div>
      ) : (
        <>
          <Link to={`/actualites/${featured.id}`} className="group mt-4 block overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-ink p-6 text-white shadow-lg shadow-brand-700/20">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">À la une · {featured.category}</span>
                <h2 className="mt-3 text-xl font-extrabold leading-tight group-hover:underline sm:text-2xl">{featured.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/80">{featured.excerpt}</p>
                <p className="mt-3 flex items-center gap-2 text-xs text-white/60"><Clock size={13} />{featured.readMinutes} min de lecture · {dateFr(featured.date)}</p>
              </div>
              <span className="hidden text-6xl sm:block">{featured.emoji}</span>
            </div>
          </Link>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {rest.map((n) => (
              <Link key={n.id} to={`/actualites/${n.id}`} className="group flex gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-50 text-3xl">{n.emoji}</div>
                <div className="min-w-0">
                  <Badge tone="green">{n.category}</Badge>
                  <p className="mt-1 font-bold leading-snug group-hover:text-brand-700">{n.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{n.excerpt}</p>
                  <p className="mt-1.5 text-xs text-slate-400">{n.readMinutes} min · {dateFr(n.date)}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <Notice tone="blue" className="mt-6">
        <b>Contenu éditorial de démonstration.</b> Ces articles d'éducation à la santé sont généraux ; ils ne remplacent pas l'avis d'un professionnel de santé. En production, les actualités seront rédigées et validées par des professionnels et citeront leurs sources officielles.
      </Notice>
    </div>
  )
}
