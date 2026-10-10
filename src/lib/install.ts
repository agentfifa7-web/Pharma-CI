import { useEffect, useState } from 'react'

/** Invite d'installation du navigateur (Chrome Android, Edge…), capturée dès le chargement du site. */
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallPrompt | undefined
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
const INSTALLED_KEY = 'pharma-ci-installed'

export const INSTALL_URL = 'https://www.pharma-ci.org/installer'

/** À appeler une fois au démarrage (main.tsx), avant que le navigateur n'envoie l'invite. */
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPrompt
    // Le navigateur propose l'installation : l'application n'est donc pas (ou plus) installée.
    try { localStorage.removeItem(INSTALLED_KEY) } catch { /* stockage indisponible */ }
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = undefined
    try { localStorage.setItem(INSTALLED_KEY, '1') } catch { /* stockage indisponible */ }
    notify()
  })
}

/** L'application est-elle ouverte depuis l'icône installée ? */
export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function installedHere() {
  if (isStandalone()) return true
  try { return localStorage.getItem(INSTALLED_KEY) === '1' } catch { return false }
}

export type Platform = 'ios' | 'android' | 'desktop'
export function platform(): Platform {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  return /Android/i.test(ua) ? 'android' : 'desktop'
}

/** État de l'installation, mis à jour quand le navigateur propose ou termine l'installation. */
export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  return {
    installed: installedHere(),
    canPrompt: !!deferred,
    platform: platform(),
    /** Ouvre la fenêtre d'installation du navigateur ; false si elle n'est pas disponible. */
    install: async () => {
      const p = deferred
      if (!p) return false
      await p.prompt()
      const { outcome } = await p.userChoice
      if (outcome === 'accepted') {
        deferred = undefined
        try { localStorage.setItem(INSTALLED_KEY, '1') } catch { /* stockage indisponible */ }
        notify()
      }
      return true
    },
  }
}
