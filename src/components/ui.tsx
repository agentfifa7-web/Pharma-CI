import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Star } from 'lucide-react'
import type { CmuStatus, OpenState, PriceLevel } from '../types'
import { PHARMACY_META } from '../data/pharmacyMeta'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'soft'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/20',
  accent: 'bg-accent-500 text-white hover:bg-accent-600 shadow-sm shadow-accent-500/20',
  outline: 'border border-slate-200 bg-white text-ink hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
}

export function Button({ variant = 'primary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-5 py-3.5 text-base' : 'px-4 py-2.5 text-sm',
        VARIANTS[variant],
        className,
      )}
    />
  )
}

export function ButtonLink({ to, variant = 'primary', className, children }: { to: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={cx('inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[.98]', VARIANTS[variant], className)}>
      {children}
    </Link>
  )
}

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cx('rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm', onClick && 'cursor-pointer transition hover:border-brand-200 hover:shadow-md', className)}>
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, icon, back, action }: { title: string; subtitle?: string; icon?: ReactNode; back?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      {back && (
        <Link to={back} className="mt-1 rounded-full p-1.5 text-slate-500 hover:bg-slate-200" aria-label="Retour">
          <ArrowLeft size={20} />
        </Link>
      )}
      {icon && <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>}
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('mb-6', className)}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

type Tone = 'green' | 'orange' | 'red' | 'slate' | 'blue' | 'violet'
const TONES: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  orange: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/15',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/15',
}

export function Badge({ tone = 'slate', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', TONES[tone], className)}>{children}</span>
}

export function OpenBadge({ state, label }: { state: OpenState; label: string }) {
  const tone = state === 'open' ? 'green' : state === 'soon' ? 'orange' : 'red'
  const dot = state === 'open' ? 'bg-emerald-500' : state === 'soon' ? 'bg-amber-500' : 'bg-red-500'
  return (
    <Badge tone={tone}>
      <span className={cx('h-1.5 w-1.5 rounded-full', dot)} />
      {label}
    </Badge>
  )
}

export const PRICE_LEVEL: Record<PriceLevel, { label: string; tone: Tone; help: string }> = {
  indicatif: { label: 'Prix indicatif', tone: 'slate', help: 'Ordre de grandeur non vérifié. Peut varier selon la pharmacie.' },
  communique: { label: 'Prix communiqué', tone: 'blue', help: 'Prix communiqué/actualisé par une source, non confirmé par facture.' },
  confirme: { label: 'Prix confirmé', tone: 'green', help: 'Prix confirmé par une facture pharmacie récente.' },
}

export function PriceLevelBadge({ level }: { level: PriceLevel }) {
  const p = PRICE_LEVEL[level]
  return <Badge tone={p.tone}>{p.label}</Badge>
}

export const CMU_LABEL: Record<CmuStatus, { label: string; tone: Tone; icon: string }> = {
  pris_en_charge: { label: 'CMU : pris en charge', tone: 'green', icon: '✅' },
  non_pris_en_charge: { label: 'CMU : non pris en charge', tone: 'red', icon: '❌' },
  a_verifier: { label: 'CMU : vérification nécessaire', tone: 'orange', icon: '⚠️' },
}

export function CmuBadge({ status }: { status: CmuStatus }) {
  const c = CMU_LABEL[status]
  return <Badge tone={c.tone}>{c.icon} {c.label}</Badge>
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">{icon}</div>
      <p className="font-bold">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Notice({ tone = 'orange', icon, children, className }: { tone?: 'orange' | 'blue' | 'red' | 'green'; icon?: ReactNode; children: ReactNode; className?: string }) {
  const t = {
    orange: 'border-amber-200 bg-amber-50 text-amber-900',
    blue: 'border-sky-200 bg-sky-50 text-sky-900',
    red: 'border-red-200 bg-red-50 text-red-900',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }[tone]
  return <div className={cx('flex gap-2.5 rounded-xl border p-3 text-sm leading-relaxed', t, className)}>{icon && <span className="mt-0.5 shrink-0">{icon}</span>}<div>{children}</div></div>
}

export function Input({ label, className, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>}
      <input {...p} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10" />
    </label>
  )
}

export function Select({ label, className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>}
      <select {...p} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10">
        {children}
      </select>
    </label>
  )
}

export function Textarea({ label, className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>}
      <textarea {...p} className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10" />
    </label>
  )
}

/** Barre de filtres horizontale (chips). */
export function Chips<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[] }) {
  return (
    <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
            value === o.value ? 'bg-ink text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stars({ value, onChange, size = 22 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" disabled={!onChange} onClick={() => onChange?.(i)} aria-label={`${i} étoile${i > 1 ? 's' : ''}`} className="disabled:cursor-default">
          <Star size={size} className={i <= value ? 'fill-accent-400 text-accent-400' : 'text-slate-300'} />
        </button>
      ))}
    </div>
  )
}

export function Stat({ label, value, hint, icon, tone = 'brand' }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: 'brand' | 'accent' | 'red' | 'slate' }) {
  const t = { brand: 'bg-brand-50 text-brand-600', accent: 'bg-accent-50 text-accent-600', red: 'bg-red-50 text-red-600', slate: 'bg-slate-100 text-slate-600' }[tone]
  return (
    <Card className="flex items-start gap-3">
      {icon && <div className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', t)}>{icon}</div>}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-extrabold tabular-nums">{value}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    </Card>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-full px-2 py-1 text-slate-400 hover:bg-slate-100" aria-label="Fermer">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function DemoBanner() {
  return (
    <div className="bg-ink px-4 py-1.5 text-center text-[11px] font-medium text-white/80">
      {PHARMACY_META.live
        ? `Pharmacies et gardes : ${PHARMACY_META.label} — à confirmer par téléphone. Prix et statuts CMU : données d'exemple.`
        : "Version de démonstration — pharmacies, prix et statuts CMU sont des données d'exemple à vérifier auprès des sources officielles."}
    </div>
  )
}
