import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Download, X } from 'lucide-react'
import { useInstall } from '../lib/install'

const DISMISS_KEY = 'pharma-ci-install-later'

function dismissedThisVisit() {
  try { return sessionStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
}

/**
 * Proposé à chaque visite tant que l'application n'est pas installée sur l'appareil.
 * « Plus tard » ne le masque que jusqu'à la prochaine visite.
 */
export default function InstallBanner() {
  const { installed, canPrompt, install } = useInstall()
  const [hidden, setHidden] = useState(dismissedThisVisit)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  if (installed || hidden || pathname === '/installer') return null

  const later = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* stockage indisponible */ }
    setHidden(true)
  }
  const go = async () => {
    if (canPrompt && (await install())) return
    navigate('/installer')
  }

  return (
    <div role="dialog" aria-label="Installer l'application" className="fixed inset-x-3 bottom-20 z-[1150] mx-auto max-w-md rounded-2xl border border-brand-200 bg-white p-4 shadow-2xl shadow-ink/20 lg:bottom-6">
      <button onClick={later} className="absolute top-2 right-2 rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="Fermer"><X size={18} /></button>
      <div className="flex items-center gap-3 pr-6">
        <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <p className="font-bold">Installez l'application PHARMA CI</p>
          <p className="text-sm text-slate-600">Gratuite, sur votre écran d'accueil, même avec peu de connexion.</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => void go()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600"><Download size={16} /> Installer</button>
        <button onClick={later} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200">Plus tard</button>
      </div>
    </div>
  )
}
