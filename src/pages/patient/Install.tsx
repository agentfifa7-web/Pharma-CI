import { useState } from 'react'
import { CheckCircle2, Download, QrCode, Share2, Smartphone } from 'lucide-react'
import { Card, Notice, PageHeader } from '../../components/ui'
import { INSTALL_URL, isStandalone, useInstall, type Platform } from '../../lib/install'

const STEPS: Record<Platform, { title: string; steps: string[] }> = {
  android: {
    title: 'Sur Android (Chrome)',
    steps: ['Ouvrez www.pharma-ci.org dans Chrome.', 'Touchez le menu ⋮ en haut à droite.', 'Choisissez « Installer l’application » (ou « Ajouter à l’écran d’accueil »).', 'Confirmez : l’icône PHARMA CI apparaît sur votre écran d’accueil.'],
  },
  ios: {
    title: 'Sur iPhone (Safari)',
    steps: ['Ouvrez www.pharma-ci.org dans Safari.', 'Touchez le bouton Partager (carré avec une flèche vers le haut).', 'Choisissez « Sur l’écran d’accueil ».', 'Touchez « Ajouter » : l’icône PHARMA CI apparaît sur votre écran d’accueil.'],
  },
  desktop: {
    title: 'Sur ordinateur (Chrome ou Edge)',
    steps: ['Ouvrez www.pharma-ci.org.', 'Cliquez sur l’icône d’installation à droite de la barre d’adresse.', 'Cliquez sur « Installer ».'],
  },
}

export default function Install() {
  const { installed, canPrompt, install, platform } = useInstall()
  const [copied, setCopied] = useState(false)
  const base = import.meta.env.BASE_URL
  const order: Platform[] = [platform, ...(['android', 'ios', 'desktop'] as Platform[]).filter((p) => p !== platform)]

  const share = async () => {
    const data = { title: 'PHARMA CI', text: 'Installez l’application PHARMA CI : pharmacies, médicaments et ordonnances en Côte d’Ivoire.', url: INSTALL_URL }
    try {
      if (navigator.share) return await navigator.share(data)
      await navigator.clipboard.writeText(INSTALL_URL)
      setCopied(true)
    } catch { /* partage annulé */ }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Télécharger l'application" subtitle="PHARMA CI sur votre téléphone, gratuitement" icon={<Smartphone size={22} />} />

      <Card className="mb-5 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <img src={`${base}icons/icon-192.png`} alt="" className="h-20 w-20 rounded-2xl" />
        <div className="flex-1">
          <p className="text-lg font-bold">PHARMA CI</p>
          <p className="text-sm text-slate-600">Pharmacies de garde, médicaments, ordonnances et livraison, depuis l'icône de votre écran d'accueil.</p>
        </div>
        {isStandalone() || installed ? (
          <span className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"><CheckCircle2 size={18} /> Application installée</span>
        ) : canPrompt ? (
          <button onClick={() => void install()} className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600"><Download size={18} /> Installer maintenant</button>
        ) : null}
      </Card>

      {!canPrompt && !installed && !isStandalone() && (
        <Notice tone="blue" icon={<Download size={16} />} className="mb-5">
          Suivez les étapes ci-dessous pour votre téléphone : l'installation prend quelques secondes et ne passe pas par une boutique d'applications.
        </Notice>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        {order.map((p) => (
          <Card key={p} className={p === platform ? 'border-brand-300' : ''}>
            <p className="font-bold">{STEPS[p].title}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
              {STEPS[p].steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col items-center gap-5 sm:flex-row">
        <img src={`${base}qr-pharma-ci.svg`} alt="QR code vers www.pharma-ci.org/installer" className="h-48 w-48 shrink-0 rounded-xl border border-slate-200 bg-white p-2" />
        <div className="text-center sm:text-left">
          <p className="flex items-center justify-center gap-2 font-bold sm:justify-start"><QrCode size={18} className="text-brand-600" /> Scannez pour installer</p>
          <p className="mt-1 text-sm text-slate-600">Avec l'appareil photo d'un autre téléphone, scannez ce code : il ouvre cette page pour installer PHARMA CI. Imprimez-le pour vos affiches et flyers.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <a href={`${base}qr-pharma-ci.png`} download="qr-pharma-ci.png" className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold hover:bg-slate-200"><Download size={15} /> QR code (image)</a>
            <a href={`${base}qr-pharma-ci.svg`} download="qr-pharma-ci.svg" className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold hover:bg-slate-200"><Download size={15} /> QR code (impression)</a>
            <button onClick={() => void share()} className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold hover:bg-slate-200"><Share2 size={15} /> {copied ? 'Lien copié' : 'Partager le lien'}</button>
          </div>
        </div>
      </Card>
    </div>
  )
}
