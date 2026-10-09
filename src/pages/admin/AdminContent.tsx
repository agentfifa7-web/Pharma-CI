import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BellRing, Download, ExternalLink, Handshake, Newspaper, Pencil, Search } from 'lucide-react'
import { MEDICATIONS, MEDICATION_META } from '../../data/medications'
import { searchMedications } from '../../data/assistant'
import { INSURANCES } from '../../data/insurances'
import { NEWS } from '../../data/news'
import { DRUG_ALERTS, ALERT_KIND } from '../../data/alerts'
import { dateFr, fcfa } from '../../lib/format'
import { Badge, Button, Chips, CmuBadge, EmptyState, Notice, PageHeader, PriceLevelBadge, Stat } from '../../components/ui'
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
const PAGE = 100

const EditBtn = () => (
  <Button size="sm" variant="outline" disabled title="Backend requis"><Pencil size={13} />Modifier</Button>
)

const Src = ({ url, label }: { url?: string; label: string }) =>
  url ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">{label}<ExternalLink size={12} /></a> : <>{label}</>

function MedTable() {
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const rows = useMemo(() => searchMedications(q), [q])
  const shown = rows.slice(0, limit)
  if (MEDICATIONS.length === 0) return <EmptyState icon={<Search />} title="Base médicaments non chargée" text="Lancez la synchronisation (npm run sync:pharmacies)." />
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-60 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }}
            placeholder="Filtrer : nom, DCI, classe, code…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <span className="text-xs text-slate-500">{rows.length.toLocaleString('fr-FR')} / {MEDICATIONS.length.toLocaleString('fr-FR')} produits · {shown.length} affichés</span>
      </div>
      <DataTable head={['Code', 'Médicament', 'DCI', 'Classe', 'CMU', 'Prix', 'Source prix', 'Mis à jour']}>
        {shown.map((m) => (
          <tr key={m.id} className="hover:bg-slate-50">
            <Td className="font-mono text-xs">{m.code ?? '—'}</Td>
            <Td><Link to={`/medicaments/${m.id}`} className="font-semibold hover:text-brand-600">{m.brand}</Link></Td>
            <Td>{m.dci ?? <span className="text-slate-400">—</span>}</Td>
            <Td className="text-xs text-slate-600">{m.therapeuticClass ?? '—'}</Td>
            <Td><CmuBadge status={m.cmu.status} /></Td>
            <Td className="tabular-nums whitespace-nowrap">{m.price ? fcfa(m.price.amount) : '—'}</Td>
            <Td>{m.price ? <PriceLevelBadge level={m.price.level} /> : <span className="text-xs text-slate-400">Non publié</span>}</Td>
            <Td className="whitespace-nowrap text-slate-500">{m.price ? dateFr(m.price.updatedAt) : dateFr(m.cmu.updatedAt)}</Td>
          </tr>
        ))}
      </DataTable>
      {rows.length > shown.length && (
        <div className="text-center"><Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE)}>Afficher {Math.min(PAGE, rows.length - shown.length)} de plus</Button></div>
      )}
    </div>
  )
}

export default function AdminContent() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: Tab = TABS.some((t) => t.value === raw) ? (raw as Tab) : 'medicaments'

  const stats = useMemo(() => {
    let inList = 0, priced = 0, withDci = 0
    for (const m of MEDICATIONS) {
      if (m.cmu.status === 'pris_en_charge') inList++
      if (m.price) priced++
      if (m.dci) withDci++
    }
    return { inList, out: MEDICATIONS.length - inList, priced, withDci }
  }, [])

  return (
    <div>
      <PageHeader title="Contenus" subtitle="Référentiels synchronisés et publications (lecture seule)" icon={<Newspaper />} />
      <div className="mb-4"><Chips<Tab> value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} options={TABS} /></div>

      <Notice tone="blue" className="mb-4">La modification des contenus nécessite le backend (validation éditoriale, traçabilité des versions). Les référentiels sont alimentés par la synchronisation des sources publiques.</Notice>

      {tab === 'medicaments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Produits" value={MEDICATIONS.length.toLocaleString('fr-FR')} />
            <Stat label="Avec prix publié" value={stats.priced.toLocaleString('fr-FR')} tone="accent" />
            <Stat label="Sur la liste CMU" value={stats.inList.toLocaleString('fr-FR')} />
            <Stat label="DCI renseignée" value={stats.withDci.toLocaleString('fr-FR')} tone="slate" />
          </div>
          <Panel title="Sources">
            <ul className="space-y-1 text-sm text-slate-600">
              <li>Prix : <Src url={MEDICATION_META.prixUrl} label="Prix des médicaments en pharmacie" />{MEDICATION_META.prixUpdatedAt && <> · mise à jour du {dateFr(MEDICATION_META.prixUpdatedAt)}</>}</li>
              <li>CMU : <Src url={MEDICATION_META.cmuUrl} label="Liste des médicaments pris en charge par la CMU" />{MEDICATION_META.cmuUpdatedAt && <> · mise à jour du {dateFr(MEDICATION_META.cmuUpdatedAt)}</>}</li>
              {MEDICATION_META.generatedAt && <li>Dernière synchronisation : {dateFr(MEDICATION_META.generatedAt)}</li>}
            </ul>
          </Panel>
          <MedTable />
        </div>
      )}

      {tab === 'cmu' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="✅ Sur la liste CMU publiée" value={stats.inList.toLocaleString('fr-FR')} />
            <Stat label="⚠️ Hors liste (à vérifier)" value={stats.out.toLocaleString('fr-FR')} tone="accent" />
          </div>
          <Panel title="Source de la liste CMU">
            <p className="text-sm text-slate-600">
              Source actuelle : <Src url={MEDICATION_META.cmuUrl} label="Liste des médicaments pris en charge par la CMU" />
              {MEDICATION_META.cmuUpdatedAt && <> — mise à jour du {dateFr(MEDICATION_META.cmuUpdatedAt)}</>}.
              Seule la liste officielle publiée par la CNAM / le ministère de la Santé fait foi.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button disabled><Download size={15} />Importer la liste officielle</Button>
              <span className="text-xs text-slate-500">Disponible avec le backend : import du fichier officiel publié par le ministère de la Santé / CNAM, contrôle et journalisation.</span>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'assurances' && (
        INSURANCES.length === 0 ? (
          <EmptyState icon={<Handshake />} title="Aucun assureur partenaire" text="Les offres seront ajoutées à partir des données vérifiées fournies par les assureurs partenaires." />
        ) : (
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
        )
      )}

      {tab === 'actualites' && (
        NEWS.length === 0 ? (
          <EmptyState icon={<Newspaper />} title="Aucune actualité synchronisée" text="Les articles seront disponibles après la prochaine synchronisation." />
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">{NEWS.length} article{NEWS.length > 1 ? 's' : ''} — source publique</p>
            <DataTable head={['Article', 'Catégorie', 'Date', 'Source']}>
              {[...NEWS].sort((a, b) => b.date.localeCompare(a.date)).map((n) => (
                <tr key={n.id} className="hover:bg-slate-50">
                  <Td><Link to={`/actualites/${n.id}`} className="font-semibold hover:text-brand-600">{n.title}</Link></Td>
                  <Td><Badge tone="blue">{n.category}</Badge></Td>
                  <Td className="whitespace-nowrap text-slate-500">{dateFr(n.date)}</Td>
                  <Td>{n.url ? <Src url={n.url} label="Article d'origine" /> : '—'}</Td>
                </tr>
              ))}
            </DataTable>
          </div>
        )
      )}

      {tab === 'alertes' && (
        DRUG_ALERTS.length === 0 ? (
          <EmptyState icon={<BellRing />} title="Aucune alerte" text="Aucune source officielle (AIRP, ministère de la Santé) n'est encore connectée. Aucune alerte n'est publiée tant qu'elle n'en provient pas." />
        ) : (
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
        )
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
