import { Link } from 'react-router-dom'
import { Heart, MapPin, Navigation, Phone, ShieldCheck, Share2, Truck } from 'lucide-react'
import type { PharmacyView } from '../lib/usePharmacies'
import { formatDistance, pharmacyDirectionsUrl } from '../lib/geo'
import { useStore } from '../store/useStore'
import { Badge, OpenBadge, cx } from './ui'

export async function sharePharmacy(p: Parameters<typeof pharmacyDirectionsUrl>[0] & { address: string; phone: string }) {
  const text = `${p.name}\n${p.address}\n📞 ${p.phone}\n${pharmacyDirectionsUrl(p)}`
  try {
    if (navigator.share) await navigator.share({ title: p.name, text })
    else { await navigator.clipboard.writeText(text); alert('Coordonnées copiées dans le presse-papiers.') }
  } catch { /* partage annulé */ }
}

export default function PharmacyCard({ p, compact }: { p: PharmacyView; compact?: boolean }) {
  const fav = useStore((s) => s.favorites.includes(p.id))
  const toggle = useStore((s) => s.toggleFavorite)
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg', p.onGarde ? 'bg-red-50' : 'bg-brand-50')}>{p.onGarde ? '🚨' : '💊'}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/pharmacies/${p.id}`} className="font-bold leading-tight hover:text-brand-600">{p.name}</Link>
            <button onClick={() => toggle(p.id)} aria-label="Favori" className="shrink-0 text-slate-300 hover:text-red-500">
              <Heart size={18} className={fav ? 'fill-red-500 text-red-500' : ''} />
            </button>
          </div>
          <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-slate-500"><MapPin size={13} className="shrink-0" />{p.address} · {formatDistance(p.km)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <OpenBadge state={p.open.state} label={p.open.label} />
            <span className="text-xs text-slate-500">{p.open.detail}</span>
          </div>
          {!compact && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.cmuVerified && <Badge tone="green"><ShieldCheck size={12} />CMU vérifiée</Badge>}
              {p.insurances.length > 0 && <Badge tone="blue">{p.insurances.length} assurance{p.insurances.length > 1 ? 's' : ''}</Badge>}
              {p.deliveryAvailable && <Badge tone="violet"><Truck size={12} />Livraison PHARMA CI</Badge>}
              {p.positionApprox && <Badge tone="orange">📍 Position approximative</Badge>}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <a href={`tel:${p.phone.replace(/\s/g, '')}`} className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-50 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"><Phone size={15} />Appeler</a>
        <a href={pharmacyDirectionsUrl(p)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"><Navigation size={15} />Itinéraire</a>
        <button onClick={() => sharePharmacy(p)} className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"><Share2 size={15} />Partager</button>
      </div>
    </div>
  )
}
