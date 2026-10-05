import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, Newspaper, Pencil } from 'lucide-react'
import { MEDICATIONS } from '../../data/medications'
import { INSURANCES } from '../../data/insurances'
import { NEWS } from '../../data/news'
import { DRUG_ALERTS, ALERT_KIND } from '../../data/alerts'
import { dateFr, fcfa } from '../../lib/format'
import { Badge, Button, Chips, CmuBadge, Notice, PageHeader, PriceLevelBadge, Stat } from '../../components/ui'
import { DataTable, Panel, Td } from './adminKit'

type Tab = 'medicaments' | 'cmu' | 'assurances' | 'actualites' | 'alertes' | 'reglementation'
const TABS: { value: Tab; label: string }[] = [
  { value: 'medicaments', label: '💊 Médicaments' },
  { value: 'cmu', label: '🛡️ CMU' },
  { value: 'assurances', label: '🏦 Assurances' },
  { value: 'actualites', label: '📰 Actualités' },
  { value: 'alertes', label: '🚨 Alertes' },
  { value: 'reglementation', label: '⚖️ Réglementation' },
]

const EditBtn = () => (
  <Button size="sm" variant="outline" disabled title="Backend requis"><Pencil size={13} />Modifier</Button>
)

export default function AdminContent() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: Tab = TABS.some((t) => t.value === raw) ? (raw as Tab) : 'medicaments'

  const cmu = useMemo(() => ({
    pris: MEDICATIONS.filter((m) => m.cmu.status === 'pris_en_charge').length,
    non: MEDICATIONS.filter((m) => m.cmu.status === 'non_pris_en_charge').length,
    verif: MEDICATIONS.filter((m) => m.cmu.status === 'a_verifier').length,
  }), [])

  return (
    <div>
      <PageHeader title="Contenus" subtitle="Référentiels et publications (lecture seule en démo)" icon={<Newspaper />} />
      <div className="mb-4"><Chips<Tab> value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} options={TABS} /></div>

      <Notice tone="blue" className="mb-4">La modification des contenus nécessite le backend (validation éditoriale, traçabilité des versions). Les boutons « Modifier » sont désactivés dans cette démo.</Notice>

      {tab === 'medicaments' && (
        <DataTable head={['Médicament', 'DCI', 'Forme', 'CMU', 'Prix', 'Niveau', 'Mis à jour', '']}>
          {MEDICATIONS.map((m) => (
            <tr key={m.id} className="hover:bg-slate-50">
              <Td><Link to={`/medicaments/${m.id}`} className="font-semibold hover:text-brand-600">{m.brand}</Link></Td>
              <Td>{m.dci}</Td>
              <Td className="whitespace-nowrap">{m.form} {m.dosage}</Td>
              <Td><CmuBadge status={m.cmu.status} /></Td>
              <Td className="tabular-nums whitespace-nowrap">{fcfa(m.price.amount)}</Td>
              <Td><PriceLevelBadge level={m.price.level} /></Td>
              <Td className="whitespace-nowrap text-slate-500">{dateFr(m.price.updatedAt)}</Td>
              <Td><EditBtn /></Td>
            </tr>
          ))}
        </DataTable>
      )}

      {tab === 'cmu' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="✅ Pris en charge" value={cmu.pris} />
            <Stat label="❌ Non pris en charge" value={cmu.non} tone="red" />
            <Stat label="⚠️ À vérifier" value={cmu.verif} tone="accent" />
          </div>
          <Panel title="Source de la liste CMU">
            <p className="text-sm text-slate-600">Source actuelle : <strong>{MEDICATIONS[0]?.cmu.source}</strong> — mise à jour {MEDICATIONS[0] ? dateFr(MEDICATIONS[0].cmu.updatedAt) : '—'}.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button disabled><Download size={15} />Importer la liste officielle</Button>
              <span className="text-xs text-slate-500">Disponible avec le backend : import du fichier officiel publié par le ministère de la Santé / CNAM, contrôle et journalisation.</span>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'assurances' && (
        <DataTable head={['Assureur', 'Couverture', 'Taux', 'Plafond / an', 'Réseau', 'Services', '']}>
          {INSURANCES.map((i) => (
            <tr key={i.id} className="hover:bg-slate-50">
              <Td className="font-semibold">{i.name}</Td>
              <Td>{i.coverage}</Td>
              <Td className="tabular-nums">{i.rate} %</Td>
              <Td className="tabular-nums whitespace-nowrap">{fcfa(i.ceiling)}</Td>
              <Td>{i.network}</Td>
              <Td><div className="flex flex-wrap gap-1">{i.services.map((s) => <Badge key={s}>{s}</Badge>)}</div></Td>
              <Td><EditBtn /></Td>
            </tr>
          ))}
        </DataTable>
      )}

      {tab === 'actualites' && (
        <DataTable head={['Article', 'Catégorie', 'Date', 'Lecture', '']}>
          {NEWS.map((n) => (
            <tr key={n.id} className="hover:bg-slate-50">
              <Td><Link to={`/actualites/${n.id}`} className="font-semibold hover:text-brand-600">{n.emoji} {n.title}</Link></Td>
              <Td><Badge tone="blue">{n.category}</Badge></Td>
              <Td className="whitespace-nowrap text-slate-500">{dateFr(n.date)}</Td>
              <Td className="tabular-nums">{n.readMinutes} min</Td>
              <Td><EditBtn /></Td>
            </tr>
          ))}
        </DataTable>
      )}

      {tab === 'alertes' && (
        <DataTable head={['Alerte', 'Type', 'Médicament', 'Lots', 'Date', 'Source', '']}>
          {DRUG_ALERTS.map((a) => (
            <tr key={a.id} className="hover:bg-slate-50">
              <Td className="font-semibold">{a.title}</Td>
              <Td><Badge tone={ALERT_KIND[a.kind].tone}>{ALERT_KIND[a.kind].emoji} {ALERT_KIND[a.kind].label}</Badge></Td>
              <Td>{a.medication ?? '—'}</Td>
              <Td className="font-mono text-xs">{a.lots?.join(', ') || '—'}</Td>
              <Td className="whitespace-nowrap text-slate-500">{dateFr(a.date)}</Td>
              <Td className="max-w-48 text-xs text-slate-500">{a.source}</Td>
              <Td><EditBtn /></Td>
            </tr>
          ))}
        </DataTable>
      )}

      {tab === 'reglementation' && (
        <Panel title="Réglementation">
          <p className="text-sm text-slate-600">
            La page publique <Link to="/reglementation" className="font-semibold text-brand-600">Réglementation</Link> présente le cadre général (exercice de la pharmacie, rôle de l'AIRP, Ordre des pharmaciens, protection des données).
            Toute évolution doit être validée par un juriste et reposer sur les textes officiels publiés.
          </p>
          <div className="mt-3"><EditBtn /></div>
        </Panel>
      )}
    </div>
  )
}
