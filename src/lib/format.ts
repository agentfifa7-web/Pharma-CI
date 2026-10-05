export const fcfa = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n)).replace(/ /g, ' ') + ' FCFA'

export const dateFr = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Date(iso).toLocaleDateString('fr-FR', opts)

export const timeFr = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export const dateTimeFr = (iso: string) => `${dateFr(iso, { day: 'numeric', month: 'short' })} · ${timeFr(iso)}`

export const relativeFr = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
  if (Math.abs(diff) < 60) return "à l'instant"
  if (Math.abs(diff) < 3600) return rtf.format(-Math.round(diff / 60), 'minute')
  if (Math.abs(diff) < 86400) return rtf.format(-Math.round(diff / 3600), 'hour')
  return rtf.format(-Math.round(diff / 86400), 'day')
}

export const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
