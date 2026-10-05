import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Navigation, Phone, Siren } from 'lucide-react'
import { EMERGENCY_NUMBERS, HEALTH_KIND, HEALTH_PLACES } from '../../data/health'
import { useStore } from '../../store/useStore'
import { usePharmacies } from '../../lib/usePharmacies'
import { distanceKm, formatDistance, pharmacyDirectionsUrl } from '../../lib/geo'
import PharmacyCard from '../../components/PharmacyCard'
import { EmptyState, Notice, PageHeader, Section } from '../../components/ui'

const WARNING_SIGNS = [
  { emoji: '😵', text: 'Perte de connaissance, personne qui ne répond pas' },
  { emoji: '🫁', text: 'Difficulté à respirer, étouffement' },
  { emoji: '⚡', text: 'Convulsions' },
  { emoji: '💔', text: 'Douleur dans la poitrine, intense ou persistante' },
  { emoji: '👶🏾', text: 'Forte fièvre chez un nourrisson' },
  { emoji: '🩸', text: 'Saignement abondant qui ne s\'arrête pas' },
  { emoji: '🗣️', text: 'Paralysie ou difficulté soudaine à parler' },
  { emoji: '☠️', text: 'Intoxication ou ingestion accidentelle de médicaments' },
]

export default function Emergency() {
  const position = useStore((s) => s.user.position)
  const pharmacies = usePharmacies()
  const garde = useMemo(() => pharmacies.filter((p) => p.onGarde).slice(0, 3), [pharmacies])
  const urgences = useMemo(() => HEALTH_PLACES
    .filter((p) => p.kind === 'urgence' || p.kind === 'clinique' || p.kind === 'centre_sante')
    .map((p) => ({ ...p, km: distanceKm(position, p.position) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 5), [position])
  const [main, ...others] = EMERGENCY_NUMBERS

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="URGENCE" subtitle="Appelez immédiatement les secours en cas de danger" icon={<Siren size={22} className="text-red-600" />} />

      {main && (
        <a href={`tel:${main.number}`} className="relative mb-3 flex items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 to-red-700 p-5 text-white shadow-xl shadow-red-600/30 active:scale-[.99]">
          <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white/20 text-red-50">
            <span className="pulse-ring absolute inset-0 rounded-full text-white/40" />
            <Phone size={30} className="relative" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold uppercase tracking-wide text-white/80">{main.emoji} {main.label}</span>
            <span className="block text-5xl font-black leading-none tabular-nums">{main.number}</span>
            <span className="mt-1 block text-sm text-white/85">{main.description}</span>
          </span>
        </a>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {others.map((e) => (
          <a key={e.number} href={`tel:${e.number}`} className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 ring-1 ring-red-200 hover:bg-red-100 active:scale-[.99]">
            <span className="text-3xl">{e.emoji}</span>
            <span className="min-w-0">
              <span className="block text-2xl font-black leading-none text-red-700 tabular-nums">{e.number}</span>
              <span className="block text-sm font-bold text-red-900">{e.label}</span>
              <span className="block text-xs text-red-800/80">{e.description}</span>
            </span>
          </a>
        ))}
      </div>
      <p className="mt-2 text-center text-xs font-semibold text-slate-500">Numéros à vérifier — en cas de doute composez le 185.</p>

      <Section title="Appelez immédiatement si…" className="mt-6">
        <div className="grid gap-2 sm:grid-cols-2">
          {WARNING_SIGNS.map((s) => (
            <div key={s.text} className="flex items-center gap-3 rounded-2xl border border-red-100 bg-white p-3 shadow-sm">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-xl">{s.emoji}</span>
              <span className="text-sm font-semibold">{s.text}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Pharmacies de garde les plus proches" action={<Link to="/garde" className="text-sm font-semibold text-brand-600">Toutes les gardes</Link>}>
        {garde.length === 0 ? (
          <EmptyState icon={<MapPin />} title="Aucune pharmacie de garde trouvée" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {garde.map((p) => <PharmacyCard key={p.id} p={p} compact />)}
          </div>
        )}
      </Section>

      <Section title="Urgences, cliniques et centres de santé les plus proches" action={<Link to="/sante" className="text-sm font-semibold text-brand-600">Tous les services</Link>}>
        {urgences.length === 0 ? (
          <EmptyState icon={<MapPin />} title="Annuaire bientôt disponible" text="L'annuaire des établissements sera disponible après la prochaine synchronisation." />
        ) : (
          <div className="space-y-2">
            {urgences.map((p) => {
              const tel = p.phone.replace(/[^\d+]/g, '')
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-xl">{HEALTH_KIND[p.kind].emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.category ?? HEALTH_KIND[p.kind].label} · {p.commune} · {formatDistance(p.km)}{p.positionApprox ? ' (position approximative)' : ''}
                    </p>
                  </div>
                  {tel && <a href={`tel:${tel}`} aria-label="Appeler" className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700"><Phone size={16} /></a>}
                  <a href={pharmacyDirectionsUrl(p)} target="_blank" rel="noreferrer" aria-label="Itinéraire" className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-700"><Navigation size={16} /></a>
                </div>
              )
            })}
            <p className="text-xs text-slate-500">Horaires et service d'urgence non garantis : appelez l'établissement avant de vous déplacer.</p>
          </div>
        )}
      </Section>

      <Notice tone="red" icon={<Siren size={16} />}>
        PHARMA CI n'est pas un service d'urgence. Les établissements listés proviennent de l'annuaire public pharmacies-de-garde.ci. En cas de danger, appelez le <a href="tel:185" className="font-bold underline">185</a> sans attendre.
      </Notice>
    </div>
  )
}
