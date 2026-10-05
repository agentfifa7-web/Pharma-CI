import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'
import { loadAllData } from './services/pharmacyProvider'

// L'annuaire synchronisé est chargé avant le premier rendu (toutes les données proviennent des fichiers synchronisés).
void loadAllData().finally(() =>
  createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
  ),
)
