import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BadgeCheck, Clock, Database, Heart, Info, MapPin, Navigation, Phone, Share2, ShieldCheck, ShieldQuestion, ShoppingBag, Siren, Store, Truck,
} from 'lucide-react'
import { usePharmacies } from '../../lib/usePharmacies'
import { DAYS, formatHours, gardePeriod } from '../../lib/hours'
import { directionsUrl, formatDistance } from '../../lib/geo'
import { dateFr } from '../../lib/format'
import { insurerName } from '../../data/insurances'
import { useStore } from '../../store/useStore'
import { sharePharmacy } from '../../components/PharmacyCard'
import MapView from '../../components/MapView'
import { Badge, Button, ButtonLink, Card, EmptyState, Input, Modal, Notice, OpenBadge, PageHeader, Section, Textarea, cx } from '../../components/ui'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}

export default function PharmacyDetail() {
  const { id } = useParams()
  const all = usePharmacies()
  const p = all.find((x) => x.id === id)
  const fav = useStore((s) => (id ? s.favorites.includes(id) : false))
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const position = useStore((s) => s.user.position)
  const [claimOpen, setClaimOpen] = useState(false)
  const [claimSent, setClaimSent] = useState(false)

  if (!p) {
    return (
      <div>
        <PageHeader title="Pharmacie introuvable" back="/pharmacies" />
        <EmptyState icon={<Store />} title="Cette fiche n'existe pas ou plus" action={<ButtonLink to="/pharmacies">Retour à l'annuaire</ButtonLink>} />
      </div>
    )
  }

  const today = new Date().getDay()
  const { start, end } = gardePeriod()
  const submitClaim = (e: FormEvent) => {
    e.preventDefault()
    setClaimSent(true)
  }

  return (
    <div>
      <PageHeader title={p.name} subtitle={`${p.commune} · ${p.city}`} back="/pharmacies" icon={p.onGarde ? <Siren /> : <Store />} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <OpenBadge state={p.open.state} label={p.open.label} />
        <span className="text-sm text-slate-500">{p.open.detail}</span>
        {p.claimed
          ? <Badge tone="green"><BadgeCheck size={12} />Fiche revendiquée</Badge>
          : <Badge tone="slate"><Database size={12} />Référencée à partir de données publiques</Badge>}
      </div>

      {/* Actions */}
      <div className="mb-5 grid grid-cols-4 gap-2">
        <a href={`tel:${p.phone.replace(/\s/g, '')}`} className="flex flex-col items-center gap-1 rounded-2xl bg-brand-500 py-3 text-xs font-semibold text-white shadow-sm hover:bg-brand-600"><Phone size={20} />Appeler</a>
        <a href={directionsUrl(p.position)} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 rounded-2xl bg-white py-3 text-xs font-semibold ring-1 ring-slate-200 hover:bg-slate-50"><Navigation size={20} />Itinéraire</a>
        <button onClick={() => sharePharmacy(p)} className="flex flex-col items-center gap-1 rounded-2xl bg-white py-3 text-xs font-semibold ring-1 ring-slate-200 hover:bg-slate-50"><Share2 size={20} />Partager</button>
        <button onClick={() => toggleFavorite(p.id)} className={cx('flex flex-col items-center gap-1 rounded-2xl py-3 text-xs font-semibold ring-1', fav ? 'bg-red-50 text-red-600 ring-red-200' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
          <Heart size={20} className={fav ? 'fill-red-500' : ''} />{fav ? 'Favori' : 'Ajouter'}
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div>
          {p.onGarde && (
            <Notice tone="red" icon={<Siren size={16} />} className="mb-4">
              <strong>De garde cette semaine</strong> — du samedi {dateFr(start.toISOString(), { day: 'numeric', month: 'long' })} au samedi {dateFr(end.toISOString(), { day: 'numeric', month: 'long' })}. À confirmer par téléphone avant de vous déplacer.
            </Notice>
          )}

          <Card className="mb-5 overflow-hidden bg-gradient-to-br from-accent-50 to-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-500 text-white"><ShoppingBag size={22} /></span>
              <div className="flex-1">
                <p className="font-bold">Pas le temps de vous déplacer ?</p>
                <p className="text-sm text-slate-600">Envoyez votre ordonnance : un agent PHARMA CI achète vos médicaments dans une pharmacie agréée et vous les livre.</p>
              </div>
              <ButtonLink to="/ordonnance" variant="accent" className="shrink-0">Demander une mission d'achat</ButtonLink>
            </div>
          </Card>

          <Section title="Coordonnées">
            <Card>
              <dl>
                <Row label="Adresse">{p.address}</Row>
                <Row label="Commune">{p.commune}</Row>
                <Row label="Ville">{p.city}</Row>
                <Row label="Région">{p.region}</Row>
                <Row label="Coordonnées GPS"><span className="tabular-nums">{p.position.lat.toFixed(5)}, {p.position.lng.toFixed(5)}</span></Row>
                <Row label="Téléphone"><a href={`tel:${p.phone.replace(/\s/g, '')}`} className="text-brand-600">{p.phone}</a></Row>
                <Row label="Distance"><span className="flex items-center justify-end gap-1"><MapPin size={13} />{formatDistance(p.km)}</span></Row>
              </dl>
            </Card>
          </Section>

          <Section title="Horaires">
            <Card className="p-0">
              <table className="w-full text-sm">
                <tbody>
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <tr key={d} className={cx('border-b border-slate-100 last:border-0', d === today && 'bg-brand-50 font-bold text-brand-800')}>
                      <td className="px-4 py-2.5">{DAYS[d]}{d === today && <span className="ml-2 text-xs font-semibold">(aujourd'hui)</span>}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{p.onGarde ? '24h/24 (garde)' : formatHours(p.hours[d] ?? null)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Clock size={12} />Horaires indicatifs, susceptibles de varier (jours fériés, garde).</p>
          </Section>

          <Section title="Services">
            {p.services.length ? (
              <div className="flex flex-wrap gap-2">{p.services.map((s) => <Badge key={s} tone="blue" className="px-3 py-1 text-sm">{s}</Badge>)}</div>
            ) : <p className="text-sm text-slate-500">Services non communiqués.</p>}
          </Section>

          <Section title="CMU & assurances">
            <Card className="space-y-3">
              <div className="flex items-start gap-3">
                {p.cmuVerified ? <ShieldCheck className="shrink-0 text-emerald-600" /> : <ShieldQuestion className="shrink-0 text-amber-600" />}
                <div>
                  <p className="font-semibold">{p.cmuVerified ? 'CMU : conventionnement vérifié' : 'CMU : non vérifiée'}</p>
                  <p className="text-sm text-slate-500">{p.cmuVerified ? 'Présentez votre carte CMU au comptoir.' : 'Renseignez-vous auprès de la pharmacie avant de vous déplacer.'}</p>
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-sm font-semibold">Assurances acceptées</p>
                {p.insurances.length ? (
                  <div className="flex flex-wrap gap-1.5">{p.insurances.map((i) => <Badge key={i} tone="violet">{insurerName(i)}</Badge>)}</div>
                ) : <p className="text-sm text-slate-500">Aucune assurance communiquée.</p>}
              </div>
            </Card>
          </Section>
        </div>

        <aside className="space-y-4">
          <MapView
            markers={[
              { id: p.id, position: p.position, color: p.onGarde ? '#dc2626' : '#009e60', glyph: p.onGarde ? '🚨' : '✚', size: 36, popup: <b>{p.name}</b> },
              { id: 'me', position, color: '#0f1f1a', glyph: '🧍', size: 28, popup: <b>Vous</b> },
            ]}
            route={[position, p.position]}
            className="h-72 overflow-hidden rounded-2xl border border-slate-200"
          />
          <a href={directionsUrl(p.position)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-ink py-3 text-sm font-semibold text-white hover:bg-ink/90"><Navigation size={16} />Itinéraire ({formatDistance(p.km)})</a>

          {p.deliveryAvailable && (
            <Card className="flex items-start gap-3 border-violet-200 bg-violet-50/50">
              <Truck className="shrink-0 text-violet-600" />
              <div>
                <p className="font-semibold">Livraison PHARMA CI disponible à proximité</p>
                <p className="text-sm text-slate-600">Des agents opèrent dans la zone de {p.commune}.</p>
              </div>
            </Card>
          )}

          <Card className="text-sm">
            <p className="flex items-center gap-1.5 font-semibold"><Info size={15} />Source des données</p>
            <p className="mt-1 text-slate-500">{p.source}. Informations à confirmer auprès de la pharmacie.</p>
            {!p.claimed && (
              <button onClick={() => { setClaimOpen(true); setClaimSent(false) }} className="mt-3 w-full rounded-xl bg-brand-50 px-3 py-2.5 font-semibold text-brand-700 hover:bg-brand-100">
                Vous êtes le pharmacien ? Revendiquer cette fiche
              </button>
            )}
          </Card>
        </aside>
      </div>

      <Modal open={claimOpen} onClose={() => setClaimOpen(false)} title="Revendiquer cette fiche">
        {claimSent ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-3xl">✅</div>
            <p className="font-bold">Demande enregistrée (démo)</p>
            <p className="mt-1 text-sm text-slate-500">En production, l'équipe PHARMA CI vérifie votre inscription à l'Ordre des pharmaciens avant d'activer la gestion de la fiche.</p>
            <Button className="mt-4" onClick={() => setClaimOpen(false)}>Fermer</Button>
          </div>
        ) : (
          <form onSubmit={submitClaim} className="space-y-3">
            <p className="text-sm text-slate-500">Mettez à jour horaires, services, assurances et statut CMU de <strong>{p.name}</strong>.</p>
            <Input label="Nom du pharmacien titulaire" required />
            <Input label="N° d'inscription à l'Ordre" required />
            <Input label="Téléphone professionnel" type="tel" required />
            <Input label="E-mail" type="email" />
            <Textarea label="Message (facultatif)" />
            <Notice tone="blue">Démonstration : aucune donnée n'est transmise.</Notice>
            <Button type="submit" className="w-full">Envoyer la demande</Button>
          </form>
        )}
      </Modal>

      <p className="mt-4 text-center text-xs text-slate-400"><Link to="/pharmacies" className="hover:underline">← Retour à l'annuaire</Link></p>
    </div>
  )
}
