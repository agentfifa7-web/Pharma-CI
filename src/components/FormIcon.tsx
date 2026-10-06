import type { ReactNode } from 'react'
import type { Medication } from '../types'
import { FORM_FAMILY_LABEL, formFamily, guessForm, type FormFamily } from '../lib/dosageForm'
import { cx } from './ui'

/** Pictogrammes de forme galénique (illustrations, pas des photos de produits). */
const GLYPH: Record<FormFamily, ReactNode> = {
  comprime: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M5.5 14.5l9-9" />
      <circle cx="17.5" cy="17.5" r="3.5" />
    </>
  ),
  gelule: (
    <g transform="rotate(-45 12 12)">
      <rect x="3.5" y="8.25" width="17" height="7.5" rx="3.75" />
      <path d="M12 8.25h4.75a3.75 3.75 0 0 1 0 7.5H12z" fill="currentColor" fillOpacity=".3" />
    </g>
  ),
  liquide: (
    <>
      <path d="M9.5 2.5h5v3h-5z" />
      <path d="M9.5 5.5 7 9v10.5A2 2 0 0 0 9 21.5h6a2 2 0 0 0 2-2V9l-2.5-3.5" />
      <path d="M7 12.5h10v5H7z" fill="currentColor" fillOpacity=".3" stroke="none" />
    </>
  ),
  injectable: (
    <g transform="rotate(-45 12 12)">
      <rect x="7" y="9" width="9.5" height="6" rx="1" />
      <path d="M16.5 12h3M19.5 9v6M2.5 12H7M10 9v2M13 9v2" />
      <path d="M7 10h4v4H7z" fill="currentColor" fillOpacity=".3" stroke="none" />
    </g>
  ),
  topique: (
    <>
      <path d="M5.5 3.5h13" />
      <path d="M6 3.5h12l-2.5 12h-7z" />
      <rect x="9.5" y="15.5" width="5" height="5" rx="1" fill="currentColor" fillOpacity=".3" />
      <path d="M9 8h6" />
    </>
  ),
  gouttes: (
    <>
      <path d="M10 2.5h4v3h-4z" fill="currentColor" fillOpacity=".3" />
      <path d="M8.5 5.5h7l-1.5 3h-4z" />
      <path d="M11 8.5h2v4.5l-1 1.5-1-1.5z" />
      <path d="M12 16.5c-1.7 2.1-2.3 3-2.3 3.7a2.3 2.3 0 0 0 4.6 0c0-.7-.6-1.6-2.3-3.7z" fill="currentColor" fillOpacity=".3" />
    </>
  ),
  suppositoire: (
    <>
      <path d="M12 2.5c-3 2.8-4.5 6-4.5 9.5v8.5h9V12c0-3.5-1.5-6.7-4.5-9.5z" />
      <path d="M7.5 15.5h9v5h-9z" fill="currentColor" fillOpacity=".3" stroke="none" />
    </>
  ),
  inhalation: (
    <>
      <rect x="8" y="2.5" width="5" height="9" rx="1" fill="currentColor" fillOpacity=".3" />
      <path d="M6 11.5h9a2 2 0 0 1 2 2V16h3.5v4H8a2 2 0 0 1-2-2z" />
      <path d="M21 9.5h.01M19 7h.01M21.5 5h.01" strokeWidth="2.4" />
    </>
  ),
  sachet: (
    <>
      <path d="M5 4.5l1.75-1 1.75 1 1.75-1 1.75 1 1.75-1 1.75 1 1.75-1 1.75 1V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20z" />
      <path d="M5 8h14" strokeDasharray="1.5 1.5" />
      <path d="M8 13.5h8v4H8z" fill="currentColor" fillOpacity=".3" stroke="none" />
    </>
  ),
  autre: (
    <>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </>
  ),
}

const TONE: Record<FormFamily, string> = {
  comprime: 'bg-brand-50 text-brand-700',
  gelule: 'bg-violet-50 text-violet-600',
  liquide: 'bg-sky-50 text-sky-600',
  injectable: 'bg-rose-50 text-rose-600',
  topique: 'bg-amber-50 text-amber-600',
  gouttes: 'bg-cyan-50 text-cyan-600',
  suppositoire: 'bg-orange-50 text-orange-600',
  inhalation: 'bg-teal-50 text-teal-600',
  sachet: 'bg-lime-50 text-lime-700',
  autre: 'bg-slate-100 text-slate-500',
}

/**
 * Famille de forme d'un médicament : le libellé commercial (« SUSP INJ », « CY FL/5 ML »…) est
 * plus précis que la forme générique parfois fournie par la source (« Suspension », « Solution »).
 */
export const medFormFamily = (m: Pick<Medication, 'brand' | 'form'>) => formFamily(guessForm(m.brand) ?? m.form)

export function FormIcon({ m, className, inverted }: { m: Pick<Medication, 'brand' | 'form'>; className?: string; inverted?: boolean }) {
  const family = medFormFamily(m)
  const label = `Illustration : ${FORM_FAMILY_LABEL[family].toLowerCase()}`
  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className={cx('grid shrink-0 place-items-center rounded-xl', inverted ? 'bg-white/15 text-white' : TONE[family], className ?? 'h-11 w-11')}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[62%] w-[62%]" aria-hidden>
        {GLYPH[family]}
      </svg>
    </div>
  )
}
