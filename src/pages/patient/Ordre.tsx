import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, ChevronDown, Landmark, Store } from 'lucide-react'
import { ButtonLink, Notice, PageHeader, cx } from '../../components/ui'

type Block = { id: string; emoji: string; title: string; intro: string; points: string[] }

const BLOCKS: Block[] = [
  {
    id: 'presentation', emoji: '🏛️', title: 'Présentation',
    intro: 'L\'Ordre National des Pharmaciens de Côte d\'Ivoire est l\'instance professionnelle qui regroupe les pharmaciens habilités à exercer dans le pays.',
    points: [
      'Il veille au respect des principes de moralité, de probité et de compétence indispensables à l\'exercice de la pharmacie.',
      'L\'inscription au tableau de l\'Ordre est une condition d\'exercice de la profession.',
      'Il représente la profession auprès des pouvoirs publics.',
    ],
  },
  {
    id: 'missions', emoji: '🎯', title: 'Missions',
    intro: 'De manière générale, un Ordre des pharmaciens assure plusieurs missions de service public :',
    points: [
      'Tenir le tableau des pharmaciens autorisés à exercer.',
      'Veiller au respect du code de déontologie et des règles professionnelles.',
      'Exercer le pouvoir disciplinaire à l\'égard de ses membres.',
      'Contribuer à la qualité de la dispensation et à la sécurité des patients.',
      'Donner des avis aux autorités sur les questions relatives à la profession.',
    ],
  },
  {
    id: 'organisation', emoji: '🧩', title: 'Organisation',
    intro: 'L\'Ordre est organisé en instances élues par les pharmaciens inscrits.',
    points: [
      'Un conseil national et, le cas échéant, des sections ou conseils représentant les différents modes d\'exercice (officine, hôpital, industrie, distribution, biologie…).',
      'Des instances disciplinaires chargées d\'examiner les manquements aux règles professionnelles.',
      'La composition et les responsables en exercice sont à consulter auprès des sources officielles de l\'Ordre.',
    ],
  },
  {
    id: 'textes', emoji: '📜', title: 'Textes',
    intro: 'L\'activité de l\'Ordre s\'inscrit dans un cadre législatif et réglementaire.',
    points: [
      'Code de déontologie des pharmaciens.',
      'Textes relatifs à l\'exercice de la pharmacie et à l\'organisation de l\'Ordre.',
      'Les références exactes sont à consulter dans PHARMA LEGAL et sur les portails officiels.',
    ],
  },
  {
    id: 'actualites', emoji: '📰', title: 'Actualités',
    intro: 'Communiqués, informations professionnelles et annonces de l\'Ordre.',
    points: [
      'Les actualités officielles de l\'Ordre seront intégrées depuis ses canaux de publication.',
      'Aucune actualité n\'est publiée ici sans source vérifiée.',
    ],
  },
  {
    id: 'pro', emoji: '🩺', title: 'Informations professionnelles',
    intro: 'Ressources destinées aux pharmaciens :',
    points: [
      'Inscription au tableau et formalités.',
      'Règles relatives à l\'organisation des services de garde.',
      'Formation continue et bonnes pratiques.',
      'Déclarations de pharmacovigilance auprès de l\'AIRP.',
    ],
  },
]

export default function Ordre() {
  const [open, setOpen] = useState<string>('presentation')
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Ordre des pharmaciens" subtitle="Ordre National des Pharmaciens de Côte d'Ivoire" icon={<Landmark size={22} />} />

      <div className="mb-5 rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-ink p-6 text-white shadow-lg">
        <p className="text-3xl">⚕️</p>
        <p className="mt-2 text-xl font-extrabold">La profession pharmaceutique</p>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/80">
          Présentation générale du rôle de l'Ordre des pharmaciens. Les informations officielles (responsables, adresses, communiqués) seront intégrées depuis les sources de l'Ordre.
        </p>
      </div>

      <div className="space-y-2">
        {BLOCKS.map((b) => {
          const isOpen = open === b.id
          return (
            <div key={b.id} className={cx('overflow-hidden rounded-2xl border bg-white shadow-sm', isOpen ? 'border-brand-200' : 'border-slate-200/80')}>
              <button onClick={() => setOpen(isOpen ? '' : b.id)} className="flex w-full items-center gap-3 p-4 text-left" aria-expanded={isOpen}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-xl">{b.emoji}</span>
                <span className="flex-1 font-bold">{b.title}</span>
                <ChevronDown size={18} className={cx('text-slate-400 transition', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-sm leading-relaxed text-slate-700">
                  <p>{b.intro}</p>
                  <ul className="mt-2 space-y-1.5">
                    {b.points.map((p) => <li key={p} className="flex gap-2"><BadgeCheck size={16} className="mt-0.5 shrink-0 text-brand-600" />{p}</li>)}
                  </ul>
                  {b.id === 'textes' && <Link to="/reglementation" className="mt-3 inline-block font-semibold text-brand-600 hover:underline">Ouvrir PHARMA LEGAL →</Link>}
                </div>
              )}
            </div>
          )
        })}

        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4">
          <p className="flex items-center gap-2 font-bold">📞 Contacts officiels</p>
          <p className="mt-1 text-sm text-slate-600">Contacts officiels : à intégrer depuis les sources de l'Ordre. PHARMA CI ne publie aucune coordonnée non vérifiée.</p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-r from-accent-500 to-accent-600 p-5 text-white shadow-lg shadow-accent-500/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20"><Store /></div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold">Pharmacies : revendiquez votre fiche</p>
            <p className="text-sm text-white/90">
              Les pharmacies sont référencées à partir de données publiques. Prochainement, chaque pharmacien titulaire pourra revendiquer sa fiche pour mettre à jour ses horaires, services, assurances acceptées et statut CMU.
            </p>
          </div>
          <ButtonLink to="/pharmacies" className="shrink-0 bg-white text-accent-600 hover:bg-accent-50">Voir l'annuaire</ButtonLink>
        </div>
      </div>

      <Notice tone="blue" className="mt-5">
        Page d'information générale. PHARMA CI est un service indépendant et ne s'exprime pas au nom de l'Ordre National des Pharmaciens de Côte d'Ivoire.
      </Notice>
    </div>
  )
}
