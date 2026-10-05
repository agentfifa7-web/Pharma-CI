import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Newspaper } from 'lucide-react'
import type { NewsArticle } from '../../types'
import { NEWS, newsCategories } from '../../data/news'
import { dateFr } from '../../lib/format'
import { Badge, Chips, EmptyState, Notice, PageHeader } from '../../components/ui'

function Thumb({ a, className }: { a: NewsArticle; className: string }) {
  return a.image ? (
    <img src={a.image} alt="" loading="lazy" referrerPolicy="no-referrer" className={`${className} object-cover`} />
  ) : (
    <div className={`${className} grid place-items-center bg-slate-50 text-slate-300`}><Newspaper /></div>
  )
}

export default function News() {
  const [cat, setCat] = useState<string>('Toutes')
  const list = NEWS.filter((n) => cat === 'Toutes' || n.category === cat).sort((a, b) => b.date.localeCompare(a.date))
  const [featured, ...rest] = list

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="PHARMA NEWS CI" subtitle="Actualités santé publiées sur pharmacies-de-garde.ci" icon={<Newspaper size={22} />} />

      {NEWS.length === 0 ? (
        <EmptyState
          icon={<Newspaper />}
          title="Aucune actualité pour le moment"
          text="Les actualités seront disponibles après la prochaine synchronisation avec pharmacies-de-garde.ci."
        />
      ) : (
        <>
          <Chips
            value={cat}
            onChange={setCat}
            options={[{ value: 'Toutes', label: 'Toutes' }, ...newsCategories().map((c) => ({ value: c, label: c }))]}
          />

          {!featured ? (
            <div className="mt-4"><EmptyState icon={<Newspaper />} title="Aucun article dans cette catégorie" /></div>
          ) : (
            <>
              <Link to={`/actualites/${featured.id}`} className="group mt-4 block overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-ink text-white shadow-lg shadow-brand-700/20">
                {featured.image && <img src={featured.image} alt="" referrerPolicy="no-referrer" className="h-48 w-full object-cover sm:h-60" />}
                <div className="p-6">
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">À la une · {featured.category}</span>
                  <h2 className="mt-3 text-xl font-extrabold leading-tight group-hover:underline sm:text-2xl">{featured.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/80">{featured.excerpt}</p>
                  <p className="mt-3 flex items-center gap-2 text-xs text-white/60"><Calendar size={13} />{dateFr(featured.date)}</p>
                </div>
              </Link>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {rest.map((n) => (
                  <Link key={n.id} to={`/actualites/${n.id}`} className="group flex gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md">
                    <Thumb a={n} className="h-16 w-16 shrink-0 rounded-2xl" />
                    <div className="min-w-0">
                      <Badge tone="green">{n.category}</Badge>
                      <p className="mt-1 font-bold leading-snug group-hover:text-brand-700">{n.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{n.excerpt}</p>
                      <p className="mt-1.5 text-xs text-slate-400">{dateFr(n.date)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <Notice tone="blue" className="mt-6">
        Articles publiés par <a href="https://www.pharmacies-de-garde.ci" target="_blank" rel="noreferrer" className="font-semibold underline">pharmacies-de-garde.ci</a> :
        PHARMA CI en affiche le titre et l'extrait, et renvoie vers l'article d'origine. Ces informations générales ne remplacent pas l'avis d'un professionnel de santé.
      </Notice>
    </div>
  )
}
