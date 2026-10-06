import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import type { Medication } from '../types'
import { medImage } from '../data/medications'
import { cx } from './ui'

/** Vignette du médicament : illustration libre de la substance active, sinon 💊. */
export function MedThumb({ m, className }: { m: Medication; className?: string }) {
  const img = medImage(m)
  const [failed, setFailed] = useState(false)
  return (
    <div className={cx('grid shrink-0 place-items-center overflow-hidden', className)}>
      {img && !failed ? (
        <img
          src={img.src}
          alt={`Illustration : ${img.dci.toLowerCase()}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={cx('h-full w-full', img.kind === 'structure' ? 'bg-white object-contain p-1' : 'object-cover')}
        />
      ) : (
        '💊'
      )}
    </div>
  )
}

/** Illustration en grand, avec le crédit et la licence exigés par Wikimedia Commons. */
export function MedIllustration({ m }: { m: Medication }) {
  const img = medImage(m)
  const [failed, setFailed] = useState(false)
  if (!img || failed) return null
  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <img
        src={img.src}
        alt={`Illustration : ${img.dci.toLowerCase()}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cx('max-h-56 w-full', img.kind === 'structure' ? 'object-contain p-4' : 'object-cover')}
      />
      <figcaption className="space-y-1 border-t border-slate-100 p-3 text-xs text-slate-500">
        <p>
          {img.kind === 'structure' ? 'Formule chimique' : 'Illustration'} de la substance active <b>{img.dci.toLowerCase()}</b>.
          Ce n'est pas forcément la boîte vendue en Côte d'Ivoire.
        </p>
        <p>
          {img.credit} ·{' '}
          {img.licenseUrl ? <a href={img.licenseUrl} target="_blank" rel="noreferrer" className="underline">{img.license}</a> : img.license} ·{' '}
          <a href={img.page} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline">
            Wikimedia Commons<ExternalLink size={10} />
          </a>
        </p>
      </figcaption>
    </figure>
  )
}
