import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'
import { loadAllData } from './services/pharmacyProvider'
import { captureInstallPrompt } from './lib/install'
import { ErrorBoundary } from './components/ErrorBoundary'
import { RELOAD_KEY, reloadOnce } from './lib/reload'

captureInstallPrompt()

// Après une mise à jour du site, un fichier de l'ancienne version peut ne plus exister : on recharge une fois.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnce()) event.preventDefault()
})
// L'application s'est affichée correctement : un prochain problème pourra de nouveau déclencher un rechargement.
window.addEventListener('load', () => setTimeout(() => {
  try { sessionStorage.removeItem(RELOAD_KEY) } catch { /* stockage indisponible */ }
}, 10000))

// L'annuaire synchronisé est chargé avant le premier rendu (toutes les données proviennent des fichiers synchronisés).
void loadAllData().finally(() =>
  createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
  ),
)

// Application installable (PWA) : le service worker n'est actif qu'en production.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
  })
}
