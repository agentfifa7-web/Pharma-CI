import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Bell, CheckCircle2, ChevronRight, Info, XCircle } from 'lucide-react'
import type { Notification } from '../../store/useStore'
import { useStore } from '../../store/useStore'
import { EmptyState, PageHeader, cx } from '../../components/ui'
import { relativeFr } from '../../lib/format'

const TONE: Record<NonNullable<Notification['tone']>, { icon: React.ReactNode; cls: string }> = {
  info: { icon: <Info size={18} />, cls: 'bg-sky-50 text-sky-600' },
  success: { icon: <CheckCircle2 size={18} />, cls: 'bg-emerald-50 text-emerald-600' },
  warning: { icon: <AlertTriangle size={18} />, cls: 'bg-amber-50 text-amber-600' },
  danger: { icon: <XCircle size={18} />, cls: 'bg-red-50 text-red-600' },
}

export default function Notifications() {
  const notifications = useStore((s) => s.notifications)
  const markNotificationsRead = useStore((s) => s.markNotificationsRead)
  // Mémorise les non-lues à l'ouverture pour les mettre en évidence, puis marque tout comme lu.
  const [fresh] = useState(() => new Set(useStore.getState().notifications.filter((n) => !n.read).map((n) => n.id)))
  useEffect(() => {
    markNotificationsRead()
  }, [markNotificationsRead, notifications.length])

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifications" subtitle="Suivi de vos missions, ordonnances et alertes." icon={<Bell size={22} />} />
      {notifications.length === 0 ? (
        <EmptyState icon={<Bell size={26} />} title="Aucune notification" />
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const t = TONE[n.tone ?? 'info']
            const body = (
              <div className={cx('flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm transition', fresh.has(n.id) ? 'border-brand-200 ring-2 ring-brand-500/10' : 'border-slate-200/80', n.link && 'hover:shadow-md')}>
                <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', t.cls)}>{t.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold leading-snug">{n.title}</p>
                    {fresh.has(n.id) && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-500" aria-label="Nouveau" />}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
                  <p className="mt-1 text-xs text-slate-400">{relativeFr(n.at)}</p>
                </div>
                {n.link && <ChevronRight size={16} className="mt-3 shrink-0 text-slate-300" />}
              </div>
            )
            return <li key={n.id}>{n.link ? <Link to={n.link} className="block">{body}</Link> : body}</li>
          })}
        </ul>
      )}
    </div>
  )
}
