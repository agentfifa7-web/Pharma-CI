import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Bell, Bot, ChevronRight, ClipboardList, FileText, Map, Pill, ScanLine, Search, Siren, Stethoscope, Truck, Clock,
} from 'lucide-react'
import { useActiveProfile, useStore, MISSION_LABEL } from '../../store/useStore'
import { usePharmacies } from '../../lib/usePharmacies'
import PharmacyCard from '../../components/PharmacyCard'
import { Badge, Card, Section, cx } from '../../components/ui'
import { fcfa, relativeFr } from '../../lib/format'

const TILES: { to: string; emoji: string; label: string; hint: string; tone: string }[] = [
  { to: '/medicaments', emoji: '🔎', label: 'Rechercher un médicament', hint: 'Prix, CMU, équivalents', tone: 'from-emerald-50 to-white' },
  { to: '/pharmacies', emoji: '📍', label: 'Trouver une pharmacie', hint: 'Annuaire national', tone: 'from-sky-50 to-white' },
  { to: '/garde', emoji: '🚨', label: 'Pharmacies de garde', hint: 'Ouvertes cette semaine', tone: 'from-red-50 to-white' },
  { to: '/ordonnance', emoji: '📷', label: 'Envoyer une ordonnance', hint: 'Un agent achète pour vous', tone: 'from-amber-50 to-white' },
  { to: '/missions', emoji: '🚚', label: 'Suivre ma commande', hint: 'Mission en temps réel', tone: 'from-violet-50 to-white' },
  { to: '/traitements', emoji: '💊', label: 'Mes médicaments', hint: 'Rappels de prise', tone: 'from-emerald-50 to-white' },
  { to: '/cmu', emoji: '🛡️', label: 'CMU & assurances', hint: 'Prise en charge', tone: 'from-sky-50 to-white' },
  { to: '/actualites', emoji: '📰', label: 'Actualités santé', hint: 'Informations vérifiées', tone: 'from-slate-100 to-white' },
  { to: '/conseils', emoji: '👨🏾‍⚕️', label: 'Conseils santé', hint: 'Prévention au quotidien', tone: 'from-amber-50 to-white' },
  { to: '/reglementation', emoji: '⚖️', label: 'Réglementation', hint: 'Vos droits, les règles', tone: 'from-violet-50 to-white' },
]

const STEPS = [
  { emoji: '🧑🏾', title: 'Vous', text: 'Photographiez votre ordonnance et payez le service en toute sécurité.' },
  { emoji: '📲', title: 'PHARMA CI', text: 'Vérifie l\'ordonnance, la verrouille et affecte l\'agent le plus proche.' },
  { emoji: '🛵', title: 'L\'agent', text: 'Se rend dans une pharmacie agréée avec votre ordonnance.' },
  { emoji: '🏥', title: 'La pharmacie', text: 'Le pharmacien délivre les médicaments et remet la facture originale.' },
  { emoji: '🏠', title: 'Chez vous', text: 'L\'agent vous livre ; vous confirmez la remise avec votre code.' },
]

const QUICK = [
  { to: '/assistant', label: 'PHARMA AI', icon: <Bot size={18} /> },
  { to: '/scan', label: 'SCAN PHARMA', icon: <ScanLine size={18} /> },
  { to: '/alertes', label: 'Alertes', icon: <Bell size={18} /> },
  { to: '/carte', label: 'Carte', icon: <Map size={18} /> },
  { to: '/sante', label: 'Autres services', icon: <Stethoscope size={18} /> },
]

function SeniorHome({ firstName }: { firstName: string }) {
  const big = [
    { to: '/traitements', emoji: '💊', label: 'Mes traitements', tone: 'bg-brand-500 text-white' },
    { to: '/traitements', emoji: '⏰', label: 'Mes rappels', tone: 'bg-white text-ink ring-2 ring-slate-200' },
    { to: '/ordonnance', emoji: '📷', label: 'Envoyer une ordonnance', tone: 'bg-accent-500 text-white' },
    { to: '/missions', emoji: '🚚', label: 'Ma livraison', tone: 'bg-white text-ink ring-2 ring-slate-200' },
    { to: '/historique', emoji: '📋', label: 'Mon historique', tone: 'bg-white text-ink ring-2 ring-slate-200' },
    { to: '/urgences', emoji: '🚑', label: 'URGENCE', tone: 'bg-red-600 text-white' },
  ]
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-extrabold tracking-tight">Bonjour {firstName} 👋</h1>
      <p className="mt-1 text-lg text-slate-600">Que souhaitez-vous faire ?</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {big.map((b) => (
          <Link key={b.label} to={b.to} className={cx('flex min-h-28 items-center gap-4 rounded-3xl px-6 py-5 text-2xl font-extrabold shadow-sm transition active:scale-[.98]', b.tone)}>
            <span className="text-5xl" aria-hidden>{b.emoji}</span>
            {b.label}
          </Link>
        ))}
      </div>
      <p className="mt-6 text-center text-base text-slate-500">Espace senior activé — désactivable dans <Link to="/profil" className="font-semibold text-brand-600 underline">Profil & paramètres</Link>.</p>
    </div>
  )
}

export default function Home() {
  const profile = useActiveProfile()
  const seniorMode = useStore((s) => s.seniorMode)
  const missions = useStore((s) => s.missions)
  const pharmacies = usePharmacies()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const firstName = profile.name.split(' ')[0] ?? profile.name

  const active = useMemo(() => missions.filter((m) => m.status !== 'livree' && m.status !== 'annulee'), [missions])
  const garde = useMemo(() => pharmacies.filter((p) => p.onGarde).slice(0, 3), [pharmacies])

  if (seniorMode) return <SeniorHome firstName={firstName} />

  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/medicaments?q=${encodeURIComponent(q.trim())}` : '/medicaments')
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 px-5 pt-7 pb-6 text-white shadow-lg shadow-brand-600/20 sm:px-8 sm:pt-10 sm:pb-8">
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-accent-500/25 blur-2xl" />
        <div className="relative">
          <p className="text-sm font-semibold text-white/80">Bonjour {firstName} 👋</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-4xl">Que recherchez-vous ?</h1>
          <form onSubmit={submit} className="mt-5 flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-xl shadow-brand-900/20">
            <Search size={20} className="ml-2 shrink-0 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Médicament, molécule (ex. paracétamol)…"
              className="min-w-0 flex-1 bg-transparent py-2 text-base text-ink outline-none placeholder:text-slate-400"
              aria-label="Rechercher un médicament"
            />
            <button className="shrink-0 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-accent-600">Rechercher</button>
          </form>
          <p className="mt-5 text-sm font-medium italic text-white/90 sm:text-base">« Votre ordonnance. Notre mission. Vos médicaments chez vous. »</p>
        </div>
      </section>

      {/* Mission active */}
      {active.length > 0 && (
        <Section title="Votre mission en cours" action={active.length > 1 ? <Link to="/missions" className="text-sm font-semibold text-brand-600">Tout voir ({active.length})</Link> : undefined}>
          {active.slice(0, 1).map((m) => (
            <Link key={m.id} to={`/missions/${m.id}`} className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-accent-50 to-white p-4 shadow-sm transition hover:shadow-md">
              <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-500 text-white">
                <Truck size={22} />
                <span className="absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-brand-500" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-bold">{m.id}<Badge tone="orange">{MISSION_LABEL[m.status]}</Badge></p>
                <p className="mt-0.5 truncate text-sm text-slate-500">
                  {m.patientName} · {fcfa(m.estimate.total)} · {relativeFr(m.createdAt)}
                  {m.eta ? <> · <Clock size={12} className="inline" /> ~{m.eta} min</> : null}
                </p>
              </div>
              <ChevronRight className="shrink-0 text-slate-400" />
            </Link>
          ))}
        </Section>
      )}

      {/* Tuiles */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to} className={cx('group flex min-h-32 flex-col justify-between rounded-2xl border border-slate-200/80 bg-gradient-to-br p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md', t.tone)}>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-2xl shadow-sm ring-1 ring-slate-100" aria-hidden>{t.emoji}</span>
            <span>
              <span className="block text-sm leading-tight font-bold group-hover:text-brand-700">{t.label}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{t.hint}</span>
            </span>
          </Link>
        ))}
      </section>

      {/* Garde */}
      <Section title="🚨 Pharmacies de garde près de vous" action={<Link to="/garde" className="flex items-center gap-1 text-sm font-semibold text-brand-600">Voir tout <ArrowRight size={14} /></Link>}>
        {garde.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{garde.map((p) => <PharmacyCard key={p.id} p={p} compact />)}</div>
        ) : (
          <Card className="text-sm text-slate-500">Aucune pharmacie de garde référencée à proximité. <Link to="/garde" className="font-semibold text-brand-600">Consulter la liste complète</Link></Card>
        )}
      </Section>

      {/* Comment ça marche */}
      <Section title="Comment ça marche ?">
        <Card className="p-5">
          <ol className="grid gap-4 sm:grid-cols-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative flex gap-3 sm:flex-col sm:items-center sm:text-center">
                {i < STEPS.length - 1 && <span className="absolute top-6 left-[calc(50%+28px)] hidden h-0.5 w-[calc(100%-56px)] bg-gradient-to-r from-brand-200 to-accent-100 sm:block" />}
                <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-2xl ring-4 ring-white">
                  {s.emoji}
                  <span className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent-500 text-[10px] font-bold text-white">{i + 1}</span>
                </span>
                <div>
                  <p className="font-bold">{s.title}</p>
                  <p className="text-sm text-slate-500">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-col gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p><strong className="text-ink">PHARMA CI n'est pas une pharmacie en ligne.</strong> Les médicaments sont toujours délivrés par une pharmacie agréée, sous la responsabilité du pharmacien.</p>
            <Link to="/ordonnance" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 font-semibold text-white hover:bg-accent-600"><FileText size={16} />Envoyer une ordonnance</Link>
          </div>
        </Card>
      </Section>

      {/* Liens rapides */}
      <Section title="Accès rapide">
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {QUICK.map((l) => (
            <Link key={l.to} to={l.to} className="flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:text-brand-700 hover:ring-brand-200">
              <span className="text-brand-600">{l.icon}</span>{l.label}
            </Link>
          ))}
          <Link to="/historique" className="flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:text-brand-700"><ClipboardList size={18} className="text-brand-600" />Historique</Link>
          <Link to="/urgences" className="flex shrink-0 items-center gap-2 rounded-full bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 ring-1 ring-red-200"><Siren size={18} />Urgences</Link>
          <Link to="/medicaments" className="flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:text-brand-700"><Pill size={18} className="text-brand-600" />PHARMA MED</Link>
        </div>
      </Section>
    </div>
  )
}
