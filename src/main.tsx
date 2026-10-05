import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'
import { loadPharmacies } from './services/pharmacyProvider'

// L'annuaire synchronisé est chargé avant le premier rendu (repli automatique sur la démo).
void loadPharmacies().finally(() =>
  createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
  ),
)
