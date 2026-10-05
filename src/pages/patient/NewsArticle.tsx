import { Link, useParams } from 'react-router-dom'
import { Clock, Newspaper, Share2 } from 'lucide-react'
import { NEWS, newsById } from '../../data/news'
import { dateFr } from '../../lib/format'
import { Badge, Button, ButtonLink, EmptyState, Notice, PageHeader } from '../../components/ui'

export default function NewsArticle() {
  const { id } = useParams()
  const a = newsById(id)

  if (!a) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Article introuvable" back="/actualites" />
        <EmptyState icon={<Newspaper />} title="Cet article n'existe pas ou plus" action={<ButtonLink to="/actualites">Toutes les actualités</ButtonLink>} />
      </div>
    )
  }

  const related = NEWS.filter((n) => n.id !== a.id && n.category === a.category).concat(NEWS.filter((n) => n.id !== a.id && n.category !== a.category)).slice(0, 3)

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: a.title, text: a.excerpt, url })
      else { await navigator.clipboard.writeText(url); alert('Lien copié dans le presse-papiers.') }
    } catch { /* partage annulé */ }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="PHARMA NEWS CI" subtitle={a.category} back="/actualites" action={<Button variant="outline" size="sm" onClick={share}><Share2 size={15} />Partager</Button>} />

      <article>
        <div className="rounded-3xl bg-gradient-to-br from-brand-50 via-white to-accent-50 p-6 ring-1 ring-slate-200/70">
          <span className="text-5xl">{a.emoji}</span>
          <div className="mt-3"><Badge tone="green">{a.category}</Badge></div>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{a.title}</h1>
          <p className="mt-2 text-base leading-relaxed text-slate-600">{a.excerpt}</p>
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Clock size={13} />{a.readMinutes} min de lecture · {dateFr(a.date, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="mt-6 space-y-4 px-1 text-[15px] leading-7 text-slate-700">
          {a.body.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </article>

      <Notice tone="blue" className="mt-6">
        <b>Contenu éditorial de démonstration.</b> Article d'information générale : il ne remplace pas une consultation. En cas d'urgence, composez le <b>185</b> (SAMU).
      </Notice>

      {related.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-base font-bold">À lire aussi</h2>
          <div className="space-y-2">
            {related.map((n) => (
              <Link key={n.id} to={`/actualites/${n.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm hover:border-brand-200">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-2xl">{n.emoji}</span>
                <div className="min-w-0"><p className="truncate text-sm font-bold">{n.title}</p><p className="text-xs text-slate-500">{n.category}</p></div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
