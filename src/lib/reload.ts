export const RELOAD_KEY = 'pharma-ci-reloaded'

/** Recharge la page une seule fois (évite une boucle si l'erreur persiste). */
export function reloadOnce() {
  try {
    if (sessionStorage.getItem(RELOAD_KEY)) return false
    sessionStorage.setItem(RELOAD_KEY, '1')
  } catch {
    return false
  }
  window.location.reload()
  return true
}
