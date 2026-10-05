import type { NewsArticle } from '../types'

/**
 * PHARMA NEWS CI — contenu éditorial de DÉMONSTRATION.
 * Articles d'éducation à la santé, généraux et intemporels : aucun événement,
 * chiffre officiel, décision ou citation n'est rapporté ici.
 */

export const NEWS_CATEGORIES = [
  'Médicaments', 'Maladies infectieuses', 'Cardiologie', 'Diabète', 'Santé mentale', 'Santé maternelle',
  'Santé infantile', 'Vaccination', 'Santé publique', 'Santé en Côte d\'Ivoire', 'Réglementation',
] as const

export const NEWS: NewsArticle[] = [
  {
    id: 'paludisme-prevention',
    category: 'Maladies infectieuses',
    title: 'Paludisme : les gestes simples qui protègent toute la famille',
    excerpt: 'Moustiquaire imprégnée, élimination des eaux stagnantes, consultation rapide en cas de fièvre : les bases de la prévention.',
    emoji: '🦟',
    date: '2026-09-30',
    readMinutes: 4,
    body: `Le paludisme est transmis par la piqûre de moustiques du genre Anophèles, qui piquent surtout entre le coucher et le lever du soleil. La prévention repose sur des gestes simples, à appliquer toute l'année et en particulier pendant la saison des pluies.

Dormir chaque nuit sous une moustiquaire imprégnée d'insecticide à longue durée d'action reste l'une des mesures les plus efficaces. Vérifiez qu'elle n'est pas trouée et qu'elle est bien bordée sous le matelas. Les enfants de moins de cinq ans et les femmes enceintes sont prioritaires.

Autour de la maison, videz régulièrement les récipients qui retiennent l'eau (pneus, boîtes, pots de fleurs, gouttières bouchées) : les moustiques s'y reproduisent. Les répulsifs cutanés et les vêtements couvrants le soir complètent la protection.

Toute fièvre doit faire penser au paludisme. Le bon réflexe est de consulter rapidement pour réaliser un test de diagnostic rapide (TDR) ou une goutte épaisse. Le traitement ne doit être pris qu'après confirmation et selon la prescription : l'automédication peut retarder un diagnostic et favoriser les résistances.

Certains signes imposent une prise en charge en urgence : convulsions, somnolence ou perte de connaissance, vomissements répétés empêchant de boire, difficulté à respirer, urines très foncées. Dans ce cas, rendez-vous immédiatement dans un centre de santé ou appelez le SAMU.`,
  },
  {
    id: 'hypertension-silencieuse',
    category: 'Cardiologie',
    title: 'Hypertension artérielle : une maladie silencieuse à surveiller',
    excerpt: 'Souvent sans symptôme, l\'hypertension se dépiste facilement. Mesurer sa tension régulièrement est un geste de prévention essentiel.',
    emoji: '❤️',
    date: '2026-09-24',
    readMinutes: 5,
    body: `L'hypertension artérielle correspond à une pression trop élevée du sang dans les artères. Elle est souvent appelée « tueur silencieux » car elle peut évoluer pendant des années sans aucun signe, tout en abîmant le cœur, le cerveau, les reins et les yeux.

Le dépistage est simple : une mesure de la tension, au repos, réalisée par un professionnel de santé ou avec un appareil validé. De nombreuses pharmacies proposent la prise de tension. Une seule mesure élevée ne suffit pas à poser un diagnostic : c'est le médecin qui interprète plusieurs mesures.

L'hygiène de vie joue un rôle majeur : réduire le sel (bouillons cubes, plats salés, charcuterie), pratiquer une activité physique régulière, limiter l'alcool, arrêter le tabac, maintenir un poids adapté et privilégier fruits, légumes et céréales complètes.

Lorsqu'un traitement est prescrit, il doit être pris tous les jours, même quand on se sent bien. Ne l'arrêtez jamais et ne modifiez pas la dose sans avis médical. Si vous oubliez une prise ou ressentez un effet gênant, parlez-en à votre pharmacien ou à votre médecin.

Maux de tête intenses et inhabituels, troubles de la vue, faiblesse d'un côté du corps, difficulté à parler ou douleur dans la poitrine sont des signes d'alerte : appelez immédiatement les secours.`,
  },
  {
    id: 'diabete-comprendre',
    category: 'Diabète',
    title: 'Diabète de type 2 : comprendre pour mieux vivre avec',
    excerpt: 'Alimentation, activité physique, suivi régulier et bon usage des traitements : les piliers de l\'équilibre glycémique.',
    emoji: '🩸',
    date: '2026-09-18',
    readMinutes: 5,
    body: `Le diabète de type 2 se caractérise par un excès durable de sucre dans le sang. Il s'installe souvent progressivement et peut rester longtemps sans symptôme. Soif importante, envies fréquentes d'uriner, fatigue ou plaies qui cicatrisent mal doivent amener à consulter.

Le dépistage repose sur une mesure de la glycémie, interprétée par un professionnel de santé. Les personnes en surpoids, sédentaires, ayant des antécédents familiaux ou une hypertension ont intérêt à se faire dépister régulièrement.

L'alimentation est un pilier de la prise en charge : réduire les boissons sucrées, répartir les repas dans la journée, privilégier légumes, légumineuses et féculents complets, en quantités adaptées. Trente minutes de marche par jour améliorent déjà l'équilibre.

Les médicaments prescrits doivent être pris selon l'ordonnance. Certains peuvent provoquer des hypoglycémies (sueurs, tremblements, faim brutale, malaise) : il est utile de savoir les reconnaître et d'avoir toujours sur soi un peu de sucre. Votre pharmacien peut vous expliquer comment agir.

Le suivi régulier des pieds, des yeux, des reins et du cœur permet de prévenir les complications. Un pied blessé chez une personne diabétique doit être montré rapidement à un professionnel.`,
  },
  {
    id: 'sante-mentale-parler',
    category: 'Santé mentale',
    title: 'Santé mentale : en parler, c\'est déjà prendre soin de soi',
    excerpt: 'Stress, tristesse persistante, troubles du sommeil : reconnaître les signaux et savoir vers qui se tourner.',
    emoji: '🧠',
    date: '2026-09-12',
    readMinutes: 4,
    body: `La santé mentale fait partie intégrante de la santé. Tout le monde peut traverser des périodes difficiles : deuil, difficultés professionnelles, isolement, maladie. Ressentir du stress ou de la tristesse est humain ; c'est leur intensité et leur durée qui doivent alerter.

Certains signaux méritent attention lorsqu'ils durent plusieurs semaines : tristesse ou irritabilité permanentes, perte d'intérêt pour les activités habituelles, troubles du sommeil ou de l'appétit, fatigue intense, difficultés de concentration, repli sur soi.

En parler à une personne de confiance est un premier pas important. Un médecin, un psychologue ou un professionnel de santé peut ensuite évaluer la situation et proposer un accompagnement adapté. Demander de l'aide n'est pas un signe de faiblesse.

Au quotidien, un rythme de sommeil régulier, une activité physique, des liens sociaux et la limitation de l'alcool et des substances contribuent au bien-être. Les médicaments agissant sur le psychisme ne doivent jamais être pris sans prescription ni arrêtés brutalement.

Si une personne exprime des idées de mort ou se met en danger, ne la laissez pas seule et contactez immédiatement les secours ou un service d'urgence.`,
  },
  {
    id: 'grossesse-suivi',
    category: 'Santé maternelle',
    title: 'Grossesse : l\'importance des consultations prénatales',
    excerpt: 'Un suivi régulier dès le début de la grossesse permet de protéger la santé de la mère et de l\'enfant.',
    emoji: '🤰',
    date: '2026-09-05',
    readMinutes: 4,
    body: `Les consultations prénatales permettent de suivre l'évolution de la grossesse, de dépister et prévenir certaines complications et de préparer l'accouchement. Il est recommandé de consulter dès que l'on pense être enceinte.

Au cours du suivi, le professionnel de santé peut proposer des examens, des compléments (comme le fer et l'acide folique) et des mesures de prévention adaptées, notamment contre le paludisme, particulièrement dangereux pendant la grossesse.

Pendant la grossesse, aucun médicament ne devrait être pris sans avis d'un médecin, d'une sage-femme ou d'un pharmacien, y compris les produits « naturels » ou les médicaments habituellement pris sans ordonnance.

Certains signes nécessitent de consulter en urgence : saignements, pertes de liquide, fortes douleurs au ventre, maux de tête intenses avec troubles de la vue, gonflement brutal du visage et des mains, fièvre, diminution des mouvements du bébé.

Préparer à l'avance le lieu d'accouchement, le moyen de transport et une personne accompagnante permet de réagir sereinement le moment venu.`,
  },
  {
    id: 'diarrhee-enfant',
    category: 'Santé infantile',
    title: 'Diarrhée de l\'enfant : prévenir la déshydratation',
    excerpt: 'Solution de réhydratation orale, poursuite de l\'alimentation et signes d\'alerte : les bons réflexes des parents.',
    emoji: '👶',
    date: '2026-08-28',
    readMinutes: 4,
    body: `Chez le jeune enfant, la diarrhée peut rapidement entraîner une déshydratation. Le premier réflexe est de compenser les pertes en eau et en sels minéraux grâce à une solution de réhydratation orale (SRO), préparée exactement selon les instructions.

Il est important de continuer à alimenter l'enfant : poursuivre l'allaitement maternel et proposer des repas adaptés. Selon les recommandations, le zinc peut être associé ; demandez conseil à un professionnel de santé.

Les antibiotiques et les médicaments anti-diarrhéiques ne doivent pas être donnés à un enfant sans avis médical.

Consultez rapidement si l'enfant refuse de boire, vomit tout ce qu'il prend, présente du sang dans les selles, une fièvre élevée, s'il est très somnolent, si ses yeux sont creusés ou s'il urine très peu.

Le lavage des mains au savon, l'eau potable et l'hygiène des aliments restent les meilleurs moyens de prévention.`,
  },
  {
    id: 'vaccination-calendrier',
    category: 'Vaccination',
    title: 'Vaccination : pourquoi respecter le calendrier vaccinal',
    excerpt: 'Les vaccins protègent l\'enfant et la communauté. Le carnet de vaccination est un document précieux à conserver.',
    emoji: '💉',
    date: '2026-08-20',
    readMinutes: 3,
    body: `La vaccination protège contre des maladies graves, parfois mortelles. En se faisant vacciner, on se protège soi-même et on contribue à protéger les personnes les plus fragiles de son entourage.

Le calendrier vaccinal national précise les vaccins recommandés et l'âge auquel ils doivent être administrés, en particulier au cours des premières années de vie. Respecter ces rendez-vous permet à l'enfant d'être protégé au bon moment.

Le carnet de vaccination doit être conservé avec soin et présenté à chaque consultation. En cas de retard, il n'est généralement pas nécessaire de tout recommencer : un professionnel de santé indiquera comment rattraper les doses manquantes.

Une légère fièvre ou une douleur au point d'injection peuvent survenir après un vaccin ; elles sont habituellement passagères. Toute réaction inhabituelle doit être signalée à un professionnel de santé.

Pour connaître le calendrier en vigueur, renseignez-vous auprès de votre centre de santé ou des sources officielles du ministère de la Santé.`,
  },
  {
    id: 'dengue-precautions',
    category: 'Santé publique',
    title: 'Dengue : reconnaître les signes et éviter les piqûres',
    excerpt: 'Transmise par le moustique tigre qui pique le jour, la dengue se prévient en supprimant les gîtes larvaires.',
    emoji: '🌧️',
    date: '2026-08-12',
    readMinutes: 4,
    body: `La dengue est une infection virale transmise par des moustiques du genre Aedes, qui piquent principalement en journée. Elle se manifeste souvent par une forte fièvre, des maux de tête, des douleurs musculaires et articulaires, parfois une éruption cutanée.

Il n'existe pas de traitement spécifique : la prise en charge vise à soulager les symptômes et à surveiller l'évolution. En cas de suspicion, il est recommandé d'éviter l'aspirine et les anti-inflammatoires sauf avis médical, et de consulter un professionnel de santé.

Certains signes doivent conduire à consulter en urgence : douleurs abdominales intenses, vomissements persistants, saignements (gencives, nez), grande fatigue ou agitation.

La prévention repose sur la suppression des eaux stagnantes autour du domicile (soucoupes, pneus, récipients), l'utilisation de répulsifs et le port de vêtements couvrants, y compris la journée.

Comme pour le paludisme, une fièvre ne doit jamais être négligée : consultez pour obtenir un diagnostic.`,
  },
  {
    id: 'antibiotiques-bon-usage',
    category: 'Médicaments',
    title: 'Antibiotiques : bien les utiliser pour qu\'ils restent efficaces',
    excerpt: 'Les antibiotiques n\'agissent pas sur les virus. Mal utilisés, ils favorisent l\'apparition de bactéries résistantes.',
    emoji: '💊',
    date: '2026-08-04',
    readMinutes: 4,
    body: `Les antibiotiques sont des médicaments précieux pour traiter les infections bactériennes. Ils sont en revanche inefficaces contre les virus responsables de la plupart des rhumes, grippes et nombreuses angines.

Chaque utilisation inappropriée contribue au développement de la résistance aux antibiotiques : les bactéries s'adaptent et les traitements deviennent moins efficaces, pour soi comme pour les autres.

Un antibiotique doit être pris uniquement sur prescription, à la dose et pendant la durée indiquées. Il ne faut pas arrêter le traitement de soi-même dès que l'on se sent mieux, sauf indication du prescripteur.

Ne réutilisez pas un reste d'antibiotique d'un traitement précédent et ne le donnez pas à un proche : le médicament, la dose et la durée dépendent de chaque situation.

En cas d'effet indésirable (éruption cutanée, diarrhée importante, gonflement du visage), contactez votre pharmacien ou votre médecin, et signalez-le.`,
  },
  {
    id: 'faux-medicaments',
    category: 'Santé en Côte d\'Ivoire',
    title: 'Médicaments de la rue : un risque réel pour la santé',
    excerpt: 'Conservation inadaptée, origine inconnue, produits falsifiés : pourquoi acheter ses médicaments en pharmacie.',
    emoji: '⚠️',
    date: '2026-07-27',
    readMinutes: 4,
    body: `Les médicaments vendus en dehors du circuit pharmaceutique autorisé présentent des risques importants : leur origine est inconnue, leurs conditions de conservation (chaleur, soleil, humidité) sont rarement adaptées, et ils peuvent être falsifiés.

Un médicament falsifié peut ne contenir aucune substance active, une dose incorrecte, ou des substances toxiques. Il expose à un échec du traitement, à des complications et, dans le cas des antibiotiques et antipaludiques, à l'apparition de résistances.

Acheter en pharmacie, c'est bénéficier d'un circuit contrôlé et du conseil d'un pharmacien, professionnel de santé formé au bon usage du médicament.

Quelques réflexes : vérifier l'emballage (impression, langue, date de péremption, numéro de lot), conserver la boîte et la notice, et demander conseil en cas de doute sur l'aspect d'un médicament.

Si vous suspectez un médicament falsifié ou de mauvaise qualité, ne le consommez pas et signalez-le à un pharmacien. Le module SCAN PHARMA et le formulaire de signalement de PHARMA CI peuvent vous aider.`,
  },
  {
    id: 'cmu-comprendre',
    category: 'Santé en Côte d\'Ivoire',
    title: 'CMU : comprendre la prise en charge des médicaments',
    excerpt: 'La Couverture Maladie Universelle prend en charge une liste de médicaments. Comment savoir si votre traitement est concerné ?',
    emoji: '🛡️',
    date: '2026-07-19',
    readMinutes: 3,
    body: `La Couverture Maladie Universelle (CMU) est un dispositif d'assurance maladie destiné à faciliter l'accès aux soins. Pour les médicaments, la prise en charge s'applique à une liste définie par les autorités.

Le fait qu'un médicament soit pris en charge dépend notamment de sa dénomination commune (DCI), de son dosage et de sa forme. Deux produits contenant la même molécule ne sont donc pas forcément dans la même situation.

Pour bénéficier de la prise en charge, il faut en général présenter sa carte CMU et une ordonnance, dans une pharmacie conventionnée. Les conditions précises sont fixées par les textes et les organismes compétents.

Le module PHARMA CMU vous aide à vous repérer, mais seule la liste officielle publiée par les autorités fait foi. En cas de doute, renseignez-vous auprès de votre pharmacien.`,
  },
  {
    id: 'ordonnance-lire',
    category: 'Réglementation',
    title: 'Lire son ordonnance : ce qu\'il faut savoir',
    excerpt: 'Nom du médicament, dosage, posologie, durée : les éléments clés d\'une ordonnance et les bons réflexes.',
    emoji: '📄',
    date: '2026-07-10',
    readMinutes: 3,
    body: `L'ordonnance est un document médical qui engage la responsabilité du prescripteur. Elle comporte en principe l'identification du prescripteur et du patient, la date, et pour chaque médicament : le nom, le dosage, la forme, la posologie et la durée du traitement.

Seul le prescripteur peut modifier une ordonnance. Le pharmacien vérifie la prescription, peut vous conseiller et, dans le cadre prévu par la réglementation, proposer certaines adaptations ; il ne faut jamais modifier soi-même les doses ou remplacer un médicament.

Conservez vos ordonnances : elles sont utiles pour le suivi, les renouvellements éventuels et les remboursements. Une ordonnance déjà exécutée ne doit pas être présentée à nouveau pour obtenir les mêmes médicaments.

En cas de doute sur la lecture d'une ordonnance (écriture, posologie, interactions), demandez conseil à votre pharmacien : c'est son rôle.`,
  },
]

export const newsById = (id?: string) => NEWS.find((n) => n.id === id)
