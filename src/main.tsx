import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'
import { loadAllData } from './services/pharmacyProvider'
import { captureInstallPrompt } from './lib/install'

captureInstallPrompt()

// L'annuaire synchronisé est chargé avant le premier rendu (toutes les données proviennent des fichiers synchronisés).
void loadAllData().finally(() =>
  createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
  ),
)

// Application installable (PWA) : le service worker n'est actif qu'en production.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
  })
}
