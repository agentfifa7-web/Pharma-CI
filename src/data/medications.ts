import type { Medication } from '../types'

/**
 * Base PHARMA MED — extrait de DÉMONSTRATION.
 * Les informations sont générales et ne remplacent pas la notice officielle ni l'avis d'un professionnel.
 * Prix et statut CMU : valeurs d'exemple à remplacer par les sources officielles
 * (liste CMU publiée par le ministère — sante.gouv.ci ; prix publics fixés réglementairement).
 */

const CMU_SRC = 'Démonstration — à vérifier sur la liste officielle (sante.gouv.ci)'
const PRICE_SRC = 'Relevé communiqué (démo)'

type Base = Omit<Medication, 'equivalents' | 'cmu' | 'price' | 'lots' | 'leaflet' | 'regulatoryStatus'> &
  Partial<Pick<Medication, 'leaflet' | 'regulatoryStatus' | 'lots'>> & {
    cmu: Medication['cmu']['status']
    cmuRef?: string
    cmuConditions?: string
    price: number
    priceLevel: Medication['price']['level']
  }

const RAW: Base[] = [
  {
    id: 'med-paracetamol-500', brand: 'Paracétamol 500 mg (générique)', dci: 'Paracétamol', dosage: '500 mg', form: 'Comprimé',
    presentation: 'Boîte de 16 comprimés', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Antalgique / antipyrétique',
    indications: 'Douleurs d\'intensité légère à modérée et états fébriles.',
    precautions: 'Respecter un intervalle d\'au moins 4 heures entre deux prises. Attention aux associations contenant déjà du paracétamol.',
    contraindications: 'Insuffisance hépatocellulaire sévère, allergie au paracétamol.',
    sideEffects: 'Rares : réactions cutanées allergiques, atteinte hépatique en cas de surdosage.',
    storage: 'À conserver à température ambiante, à l\'abri de l\'humidité.', prescriptionRequired: false,
    cmu: 'pris_en_charge', cmuRef: 'CMU-DEMO-0001', price: 600, priceLevel: 'confirme',
    lots: [{ lot: 'PCM24A118', expiry: '2027-03', status: 'conforme' }],
  },
  {
    id: 'med-doliprane-1000', brand: 'Doliprane 1000 mg', dci: 'Paracétamol', dosage: '1000 mg', form: 'Comprimé',
    presentation: 'Boîte de 8 comprimés', lab: 'Sanofi', therapeuticClass: 'Antalgique / antipyrétique',
    indications: 'Douleurs et fièvre chez l\'adulte et l\'enfant de plus de 50 kg.',
    precautions: 'Ne pas dépasser la dose indiquée sur l\'ordonnance ou la notice.',
    contraindications: 'Insuffisance hépatique sévère.', sideEffects: 'Rares réactions allergiques.',
    storage: 'Température ambiante.', prescriptionRequired: false,
    cmu: 'non_pris_en_charge', price: 1450, priceLevel: 'communique',
    lots: [{ lot: 'DLP1000X77', expiry: '2026-12', status: 'conforme' }],
  },
  {
    id: 'med-paracetamol-1000', brand: 'Paracétamol 1000 mg (générique)', dci: 'Paracétamol', dosage: '1000 mg', form: 'Comprimé',
    presentation: 'Boîte de 8 comprimés', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Antalgique / antipyrétique',
    indications: 'Douleurs et fièvre de l\'adulte.', precautions: 'Respecter les doses prescrites.',
    contraindications: 'Insuffisance hépatique sévère.', sideEffects: 'Rares réactions allergiques.',
    storage: 'Température ambiante.', prescriptionRequired: false,
    cmu: 'pris_en_charge', cmuRef: 'CMU-DEMO-0002', price: 900, priceLevel: 'indicatif',
  },
  {
    id: 'med-amoxicilline-500', brand: 'Amoxicilline 500 mg (générique)', dci: 'Amoxicilline', dosage: '500 mg', form: 'Gélule',
    presentation: 'Boîte de 12 gélules', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Antibiotique — pénicilline',
    indications: 'Infections bactériennes sensibles, sur prescription médicale.',
    precautions: 'Prendre le traitement jusqu\'au bout, même si les symptômes disparaissent. Signaler toute allergie aux pénicillines.',
    contraindications: 'Allergie aux pénicillines ou aux bêta-lactamines.',
    sideEffects: 'Troubles digestifs (diarrhée, nausées), éruptions cutanées.',
    storage: 'À conserver à moins de 25 °C.', prescriptionRequired: true,
    cmu: 'pris_en_charge', cmuRef: 'CMU-DEMO-0014', price: 1500, priceLevel: 'confirme',
    lots: [{ lot: 'AMX500B204', expiry: '2026-11', status: 'conforme' }, { lot: 'AMX500B199', expiry: '2026-06', status: 'rappele' }],
  },
  {
    id: 'med-amox-clav', brand: 'Amoxicilline / Acide clavulanique 1 g', dci: 'Amoxicilline + acide clavulanique', dosage: '1 g / 125 mg', form: 'Comprimé',
    presentation: 'Boîte de 8 comprimés', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Antibiotique — pénicilline associée',
    indications: 'Infections bactériennes, sur prescription.', precautions: 'Prendre en début de repas. Respecter la durée prescrite.',
    contraindications: 'Allergie aux pénicillines, antécédent d\'atteinte hépatique liée à cette association.',
    sideEffects: 'Diarrhée, candidose, nausées.', storage: 'À l\'abri de l\'humidité, < 25 °C.', prescriptionRequired: true,
    cmu: 'a_verifier', price: 4200, priceLevel: 'indicatif',
  },
  {
    id: 'med-artemether-lumefantrine', brand: 'Artéméther / Luméfantrine 20/120 mg', dci: 'Artéméther + Luméfantrine', dosage: '20 mg / 120 mg', form: 'Comprimé',
    presentation: 'Boîte de 24 comprimés', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Antipaludique (CTA)',
    indications: 'Traitement du paludisme simple, après confirmation (TDR ou goutte épaisse), sur prescription.',
    precautions: 'À prendre avec un aliment contenant des graisses (lait, repas) pour une meilleure absorption. Respecter les 6 prises.',
    contraindications: 'Paludisme grave (relève de l\'urgence hospitalière), allergie connue, 1er trimestre de grossesse sauf avis médical.',
    sideEffects: 'Maux de tête, vertiges, troubles digestifs.', storage: 'Température ambiante, à l\'abri de l\'humidité.',
    prescriptionRequired: true, cmu: 'pris_en_charge', cmuRef: 'CMU-DEMO-0031', cmuConditions: 'Selon protocole national (démo)',
    price: 2000, priceLevel: 'confirme',
    lots: [{ lot: 'ALU24K502', expiry: '2027-01', status: 'conforme' }],
  },
  {
    id: 'med-coartem', brand: 'Coartem 20/120', dci: 'Artéméther + Luméfantrine', dosage: '20 mg / 120 mg', form: 'Comprimé',
    presentation: 'Boîte de 24 comprimés', lab: 'Novartis', therapeuticClass: 'Antipaludique (CTA)',
    indications: 'Paludisme simple confirmé, sur prescription.', precautions: 'Prendre avec un aliment gras.',
    contraindications: 'Paludisme grave, allergie.', sideEffects: 'Céphalées, vertiges.', storage: 'Température ambiante.',
    prescriptionRequired: true, cmu: 'non_pris_en_charge', price: 4900, priceLevel: 'communique',
  },
  {
    id: 'med-artesunate-amodiaquine', brand: 'Artésunate / Amodiaquine 100/270 mg', dci: 'Artésunate + Amodiaquine', dosage: '100 mg / 270 mg', form: 'Comprimé',
    presentation: 'Boîte de 3 comprimés', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Antipaludique (CTA)',
    indications: 'Paludisme simple confirmé, sur prescription.', precautions: 'Respecter la durée de 3 jours.',
    contraindications: 'Atteinte hépatique, troubles hématologiques connus.', sideEffects: 'Nausées, fatigue, troubles du sommeil.',
    storage: 'Température ambiante.', prescriptionRequired: true, cmu: 'pris_en_charge', cmuRef: 'CMU-DEMO-0032', price: 1500, priceLevel: 'indicatif',
  },
  {
    id: 'med-metformine-850', brand: 'Metformine 850 mg (générique)', dci: 'Metformine', dosage: '850 mg', form: 'Comprimé pelliculé',
    presentation: 'Boîte de 30 comprimés', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Antidiabétique oral',
    indications: 'Diabète de type 2, sur prescription médicale.', precautions: 'Prendre pendant ou à la fin des repas. Suivi régulier de la fonction rénale.',
    contraindications: 'Insuffisance rénale sévère, acidose, déshydratation sévère.', sideEffects: 'Troubles digestifs en début de traitement, goût métallique.',
    storage: 'Température ambiante.', prescriptionRequired: true, cmu: 'pris_en_charge', cmuRef: 'CMU-DEMO-0058', price: 2100, priceLevel: 'confirme',
  },
  {
    id: 'med-glibenclamide-5', brand: 'Glibenclamide 5 mg (générique)', dci: 'Glibenclamide', dosage: '5 mg', form: 'Comprimé',
    presentation: 'Boîte de 30 comprimés', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Antidiabétique oral (sulfamide)',
    indications: 'Diabète de type 2, sur prescription.', precautions: 'Risque d\'hypoglycémie : ne pas sauter de repas.',
    contraindications: 'Diabète de type 1, insuffisance rénale ou hépatique sévère.', sideEffects: 'Hypoglycémie, troubles digestifs.',
    storage: 'Température ambiante.', prescriptionRequired: true, cmu: 'pris_en_charge', cmuRef: 'CMU-DEMO-0059', price: 1200, priceLevel: 'indicatif',
  },
  {
    id: 'med-amlodipine-5', brand: 'Amlodipine 5 mg (générique)', dci: 'Amlodipine', dosage: '5 mg', form: 'Comprimé',
    presentation: 'Boîte de 30 comprimés', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Antihypertenseur (inhibiteur calcique)',
    indications: 'Hypertension artérielle, angor, sur prescription.', precautions: 'Ne pas arrêter brutalement sans avis médical.',
    contraindications: 'Hypotension sévère, choc cardiogénique.', sideEffects: 'Œdèmes des chevilles, bouffées de chaleur, maux de tête.',
    storage: 'Température ambiante.', prescriptionRequired: true, cmu: 'pris_en_charge', cmuRef: 'CMU-DEMO-0071', price: 2500, priceLevel: 'communique',
  },
  {
    id: 'med-losartan-50', brand: 'Losartan 50 mg (générique)', dci: 'Losartan', dosage: '50 mg', form: 'Comprimé',
    presentation: 'Boîte de 30 comprimés', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Antihypertenseur (ARA II)',
    indications: 'Hypertension artérielle, sur prescription.', precautions: 'Surveillance de la kaliémie et de la fonction rénale.',
    contraindications: 'Grossesse (2e et 3e trimestres), insuffisance hépatique sévère.', sideEffects: 'Vertiges, fatigue.',
    storage: 'Température ambiante.', prescriptionRequired: true, cmu: 'a_verifier', price: 3500, priceLevel: 'indicatif',
  },
  {
    id: 'med-ibuprofene-400', brand: 'Ibuprofène 400 mg (générique)', dci: 'Ibuprofène', dosage: '400 mg', form: 'Comprimé',
    presentation: 'Boîte de 20 comprimés', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Anti-inflammatoire non stéroïdien (AINS)',
    indications: 'Douleurs, fièvre, inflammation.', precautions: 'Prendre au cours d\'un repas. Éviter en cas de suspicion de dengue.',
    contraindications: 'Ulcère gastroduodénal, grossesse à partir du 6e mois, insuffisance rénale sévère, allergie aux AINS.',
    sideEffects: 'Douleurs d\'estomac, nausées, risque hémorragique.', storage: 'Température ambiante.', prescriptionRequired: false,
    cmu: 'pris_en_charge', cmuRef: 'CMU-DEMO-0005', price: 800, priceLevel: 'confirme',
  },
  {
    id: 'med-omeprazole-20', brand: 'Oméprazole 20 mg (générique)', dci: 'Oméprazole', dosage: '20 mg', form: 'Gélule gastro-résistante',
    presentation: 'Boîte de 14 gélules', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Inhibiteur de la pompe à protons',
    indications: 'Reflux gastro-œsophagien, ulcère, sur avis médical.', precautions: 'Avaler sans croquer, de préférence le matin à jeun.',
    contraindications: 'Allergie à l\'oméprazole.', sideEffects: 'Maux de tête, troubles digestifs.', storage: 'Température ambiante.',
    prescriptionRequired: false, cmu: 'a_verifier', price: 1800, priceLevel: 'indicatif',
  },
  {
    id: 'med-salbutamol', brand: 'Salbutamol 100 µg/dose', dci: 'Salbutamol', dosage: '100 µg / dose', form: 'Suspension pour inhalation',
    presentation: 'Flacon pressurisé de 200 doses', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Bronchodilatateur',
    indications: 'Crise d\'asthme, bronchospasme, sur prescription.', precautions: 'Bien agiter avant usage. Consulter si l\'usage devient plus fréquent.',
    contraindications: 'Allergie au salbutamol.', sideEffects: 'Tremblements, palpitations.', storage: 'Ne pas exposer à la chaleur ni percer le flacon.',
    prescriptionRequired: true, cmu: 'pris_en_charge', cmuRef: 'CMU-DEMO-0090', price: 3200, priceLevel: 'communique',
  },
  {
    id: 'med-sro-zinc', brand: 'SRO + Zinc (kit)', dci: 'Sels de réhydratation orale + Zinc', dosage: '20 mg (zinc)', form: 'Poudre + comprimé dispersible',
    presentation: 'Kit 2 sachets + 10 comprimés', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Réhydratation',
    indications: 'Diarrhée aiguë de l\'enfant, en complément de l\'avis médical.', precautions: 'Dissoudre dans le volume d\'eau potable indiqué. Consulter en cas de signes de gravité.',
    contraindications: 'Vomissements incoercibles, déshydratation sévère (urgence).', sideEffects: 'Nausées possibles.', storage: 'Lieu sec.',
    prescriptionRequired: false, cmu: 'pris_en_charge', cmuRef: 'CMU-DEMO-0102', price: 700, priceLevel: 'indicatif',
  },
  {
    id: 'med-cotrimoxazole', brand: 'Cotrimoxazole 960 mg (générique)', dci: 'Sulfaméthoxazole + Triméthoprime', dosage: '800 mg / 160 mg', form: 'Comprimé',
    presentation: 'Boîte de 20 comprimés', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Antibiotique (sulfamide)',
    indications: 'Infections bactériennes sensibles, prophylaxie selon protocole, sur prescription.', precautions: 'Boire abondamment.',
    contraindications: 'Allergie aux sulfamides, déficit en G6PD (avis médical), grossesse en fin de terme.', sideEffects: 'Éruptions cutanées (à signaler immédiatement), nausées.',
    storage: 'Température ambiante.', prescriptionRequired: true, cmu: 'pris_en_charge', cmuRef: 'CMU-DEMO-0018', price: 900, priceLevel: 'confirme',
  },
  {
    id: 'med-metronidazole-500', brand: 'Métronidazole 500 mg (générique)', dci: 'Métronidazole', dosage: '500 mg', form: 'Comprimé',
    presentation: 'Boîte de 20 comprimés', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Anti-infectieux (nitro-imidazolé)',
    indications: 'Infections parasitaires et bactériennes, sur prescription.', precautions: 'Éviter l\'alcool pendant et 48 h après le traitement.',
    contraindications: 'Allergie aux imidazolés.', sideEffects: 'Goût métallique, nausées, urines foncées.', storage: 'Température ambiante.',
    prescriptionRequired: true, cmu: 'pris_en_charge', cmuRef: 'CMU-DEMO-0021', price: 1000, priceLevel: 'indicatif',
  },
  {
    id: 'med-ciprofloxacine-500', brand: 'Ciprofloxacine 500 mg (générique)', dci: 'Ciprofloxacine', dosage: '500 mg', form: 'Comprimé',
    presentation: 'Boîte de 10 comprimés', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Antibiotique (fluoroquinolone)',
    indications: 'Infections bactériennes, sur prescription.', precautions: 'Éviter l\'exposition au soleil. Signaler toute douleur tendineuse.',
    contraindications: 'Enfant en croissance (sauf avis spécialisé), grossesse, antécédent de tendinopathie aux quinolones.',
    sideEffects: 'Troubles digestifs, tendinites, photosensibilisation.', storage: 'Température ambiante.',
    prescriptionRequired: true, cmu: 'a_verifier', price: 2300, priceLevel: 'indicatif',
  },
  {
    id: 'med-fer-folique', brand: 'Fer + Acide folique', dci: 'Sulfate ferreux + Acide folique', dosage: '200 mg / 0,4 mg', form: 'Comprimé',
    presentation: 'Boîte de 30 comprimés', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Antianémique',
    indications: 'Prévention et traitement de l\'anémie, notamment pendant la grossesse selon avis médical.', precautions: 'Peut colorer les selles en noir. À distance du thé et du café.',
    contraindications: 'Surcharge en fer.', sideEffects: 'Troubles digestifs, constipation.', storage: 'Lieu sec.',
    prescriptionRequired: false, cmu: 'pris_en_charge', cmuRef: 'CMU-DEMO-0120', price: 500, priceLevel: 'confirme',
  },
  {
    id: 'med-vitamine-c', brand: 'Vitamine C 500 mg', dci: 'Acide ascorbique', dosage: '500 mg', form: 'Comprimé à croquer',
    presentation: 'Boîte de 20 comprimés', lab: 'Laboratoire générique (démo)', therapeuticClass: 'Vitamine',
    indications: 'Carence en vitamine C, fatigue passagère.', precautions: 'Éviter la prise en fin de journée.',
    contraindications: 'Lithiase urinaire oxalocalcique.', sideEffects: 'Troubles digestifs à forte dose.', storage: 'Lieu sec.',
    prescriptionRequired: false, cmu: 'non_pris_en_charge', price: 1000, priceLevel: 'indicatif',
  },
]

const sameMolecule = (a: Base, b: Base) => a.id !== b.id && a.dci === b.dci && a.dosage === b.dosage

export const MEDICATIONS: Medication[] = RAW.map((m) => {
  const { cmu, cmuRef, cmuConditions, price, priceLevel, ...rest } = m
  return {
    ...rest,
    leaflet: m.leaflet ?? 'Lire attentivement la notice présente dans la boîte. En cas de doute, demandez conseil à votre pharmacien.',
    regulatoryStatus: m.regulatoryStatus ?? (m.prescriptionRequired ? 'Médicament soumis à prescription' : 'Médicament disponible sans ordonnance (conseil du pharmacien recommandé)'),
    lots: m.lots ?? [],
    cmu: { status: cmu, reference: cmuRef, conditions: cmuConditions, source: CMU_SRC, updatedAt: '2026-09-15' },
    price: { amount: price, level: priceLevel, updatedAt: priceLevel === 'confirme' ? '2026-09-28' : '2026-08-30', source: priceLevel === 'confirme' ? 'Confirmé par facture pharmacie (démo)' : PRICE_SRC },
    equivalents: RAW.filter((o) => sameMolecule(m, o)).map((o) => o.id),
  }
})

export const medById = (id?: string) => MEDICATIONS.find((m) => m.id === id)
