import type { ReactNode } from 'react'
import { cx } from '../../components/ui'

/** Tableau responsive (défilement horizontal interne, jamais de la page). */
export function DataTable({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={cx('overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm', className)}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>{head.map((h, i) => <th key={i} className="px-3 py-2.5 whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  )
}

export const Td = ({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) => (
  <td colSpan={colSpan} className={cx('px-3 py-2.5 align-middle', className)}>{children}</td>
)

export type BarDatum = { label: string; value: number; display?: string; color?: string; hint?: string }

/**
 * Barres horizontales (une seule série → une seule teinte, pas de légende ; valeurs en texte encre).
 * Chaque ligne a une infobulle native (title) avec la valeur exacte.
 */
export function BarList({ data, color = '#009e60', empty = 'Aucune donnée pour le moment.', max }: { data: BarDatum[]; color?: string; empty?: string; max?: number }) {
  if (!data.length) return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>
  const top = max ?? Math.max(...data.map((d) => d.value), 1)
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} title={`${d.label} : ${d.display ?? d.value}${d.hint ? ` — ${d.hint}` : ''}`} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{d.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-ink">{d.display ?? d.value}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full transition-[width] group-hover:opacity-80"
              style={{ width: `${Math.max(2, (d.value / top) * 100)}%`, background: d.color ?? color }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Carte de module (lien) pour le Command Center. */
export function Panel({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
