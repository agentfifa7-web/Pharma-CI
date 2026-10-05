import { useState } from 'react'
import { ChevronDown, Lightbulb } from 'lucide-react'
import { Notice, PageHeader, cx } from '../../components/ui'

type Tip = { id: string; emoji: string; title: string; summary: string; points: string[]; color: string }

const TIPS: Tip[] = [
  {
    id: 'bon-usage', emoji: '💊', title: 'Bon usage du médicament', color: 'from-brand-50',
    summary: 'Respecter la dose, l\'horaire et la durée prescrits.',
    points: [
      'Suivez exactement l\'ordonnance : dose, nombre de prises, durée.',
      'Lisez la notice et conservez-la avec la boîte.',
      'Signalez à votre pharmacien tous les médicaments que vous prenez, y compris les plantes et compléments.',
      'Ne partagez jamais vos médicaments et n\'utilisez pas ceux d\'une autre personne.',
      'En cas d\'oubli d\'une prise, ne doublez pas la dose suivante : demandez conseil.',
    ],
  },
  {
    id: 'conservation', emoji: '🌡️', title: 'Conserver ses médicaments au chaud et à l\'humidité', color: 'from-accent-50',
    summary: 'Chaleur et humidité peuvent altérer un médicament.',
    points: [
      'Gardez les médicaments dans leur boîte d\'origine, dans un endroit sec, à l\'abri du soleil.',
      'Évitez la salle de bains, la cuisine et la voiture, où la température monte vite.',
      'Respectez les mentions « à conserver au réfrigérateur » ou « à moins de 25 °C ».',
      'Un comprimé qui a changé de couleur, d\'odeur ou d\'aspect ne doit pas être pris.',
      'Rangez-les hors de portée et de vue des enfants.',
    ],
  },
  {
    id: 'automedication', emoji: '🤔', title: 'Automédication : prudence', color: 'from-sky-50',
    summary: 'Même sans ordonnance, un médicament n\'est jamais anodin.',
    points: [
      'Demandez toujours conseil à votre pharmacien avant de prendre un médicament sans ordonnance.',
      'Limitez la durée : si les symptômes persistent ou s\'aggravent, consultez.',
      'Attention aux associations : plusieurs produits peuvent contenir la même substance (ex. paracétamol).',
      'Enfants, femmes enceintes, personnes âgées et malades chroniques : avis professionnel indispensable.',
    ],
  },
  {
    id: 'antibiotiques', emoji: '🦠', title: 'Antibiotiques', color: 'from-violet-50',
    summary: 'Uniquement sur prescription, et jusqu\'au bout.',
    points: [
      'Les antibiotiques n\'agissent pas sur les virus (rhume, grippe, la plupart des angines).',
      'Respectez la dose et la durée prescrites, sans arrêter de vous-même.',
      'Ne gardez pas les restes pour une prochaine fois et ne les donnez pas à un proche.',
      'Le mauvais usage favorise les résistances, qui rendent les infections plus difficiles à soigner.',
    ],
  },
  {
    id: 'paludisme', emoji: '🦟', title: 'Paludisme', color: 'from-emerald-50',
    summary: 'Moustiquaire chaque nuit, test avant traitement.',
    points: [
      'Dormez sous une moustiquaire imprégnée, en priorité les enfants et les femmes enceintes.',
      'Supprimez les eaux stagnantes autour de la maison.',
      'Toute fièvre doit faire consulter : faites un test (TDR ou goutte épaisse) avant tout traitement.',
      'Prenez le traitement prescrit en entier, même si la fièvre disparaît.',
      'Convulsions, somnolence, vomissements répétés : urgence, appelez le 185.',
    ],
  },
  {
    id: 'hydratation', emoji: '💧', title: 'Hydratation', color: 'from-cyan-50',
    summary: 'Boire régulièrement, surtout par forte chaleur.',
    points: [
      'Buvez de l\'eau potable régulièrement, sans attendre d\'avoir soif.',
      'Enfants et personnes âgées se déshydratent plus vite : proposez-leur à boire souvent.',
      'En cas de diarrhée, utilisez une solution de réhydratation orale (SRO) préparée selon la notice.',
      'Bouche sèche, urines rares et foncées, fatigue : signes de déshydratation à surveiller.',
    ],
  },
  {
    id: 'rue', emoji: '⚠️', title: 'Médicaments de la rue et faux médicaments', color: 'from-red-50',
    summary: 'Origine inconnue = danger pour votre santé.',
    points: [
      'Achetez vos médicaments uniquement en pharmacie.',
      'Les produits vendus dans la rue sont souvent mal conservés et peuvent être falsifiés.',
      'Un faux médicament peut ne contenir aucun principe actif, ou des substances toxiques.',
      'Vérifiez l\'emballage, le lot et la date de péremption ; utilisez SCAN PHARMA.',
      'En cas de doute, ne prenez pas le produit et signalez-le.',
    ],
  },
  {
    id: 'voyage', emoji: '🧳', title: 'En voyage', color: 'from-amber-50',
    summary: 'Préparez votre trousse et vos traitements.',
    points: [
      'Emportez vos traitements en quantité suffisante, avec vos ordonnances.',
      'Gardez les médicaments dans votre bagage à main, dans leur emballage d\'origine.',
      'Renseignez-vous à l\'avance sur les vaccinations et la prévention du paludisme selon la destination.',
      'Protégez les médicaments de la chaleur pendant le trajet.',
    ],
  },
  {
    id: 'grossesse', emoji: '🤰', title: 'Grossesse et allaitement', color: 'from-pink-50',
    summary: 'Aucun médicament sans avis professionnel.',
    points: [
      'Signalez votre grossesse à chaque consultation et en pharmacie.',
      'Même les produits « naturels » ou sans ordonnance peuvent être déconseillés.',
      'Suivez les consultations prénatales et les mesures de prévention recommandées.',
      'Saignements, fortes douleurs, fièvre : consultez en urgence.',
    ],
  },
  {
    id: 'enfants', emoji: '🧒🏾', title: 'Médicaments et enfants', color: 'from-lime-50',
    summary: 'Formes et doses adaptées à l\'âge et au poids.',
    points: [
      'Utilisez des médicaments et dosages adaptés aux enfants, selon l\'avis d\'un professionnel.',
      'Utilisez le dispositif doseur fourni avec le médicament, pas une cuillère de cuisine.',
      'Ne donnez jamais un médicament d\'adulte en « coupant » un comprimé sans avis.',
      'Rangez tous les médicaments hors de portée ; en cas d\'ingestion accidentelle, appelez le 185.',
    ],
  },
]

export default function Tips() {
  const [open, setOpen] = useState<string | null>(TIPS[0]!.id)
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Conseils santé" subtitle="Les bons réflexes au quotidien" icon={<Lightbulb size={22} />} />

      <div className="grid items-start gap-3 sm:grid-cols-2">
        {TIPS.map((t) => {
          const isOpen = open === t.id
          return (
            <div key={t.id} className={cx('overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br to-white shadow-sm transition', t.color, isOpen && 'shadow-md ring-1 ring-brand-200')}>
              <button onClick={() => setOpen(isOpen ? null : t.id)} className="flex w-full items-start gap-3 p-4 text-left" aria-expanded={isOpen}>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-sm">{t.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold leading-snug">{t.title}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">{t.summary}</span>
                </span>
                <ChevronDown size={18} className={cx('mt-1 shrink-0 text-slate-400 transition', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <ul className="space-y-2 px-4 pb-4">
                  {t.points.map((p) => (
                    <li key={p} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />{p}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <Notice tone="blue" className="mt-6">
        Conseils généraux de prévention. Ils ne remplacent pas l'avis de votre pharmacien ou de votre médecin. En cas d'urgence : <b>185</b> (SAMU).
      </Notice>
    </div>
  )
}
