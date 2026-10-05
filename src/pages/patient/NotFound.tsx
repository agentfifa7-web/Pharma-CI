import { Compass, Home, Search } from 'lucide-react'
import { ButtonLink, PageHeader } from '../../components/ui'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Page introuvable" subtitle="Erreur 404" icon={<Compass size={22} />} />
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-6xl">🧭</p>
        <p className="mt-4 text-5xl font-extrabold tracking-tight text-brand-500">404</p>
        <p className="mt-2 text-lg font-bold">Oups, cette page n'existe pas.</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Le lien est peut-être erroné ou la page a été déplacée. Reprenons depuis l'accueil.</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <ButtonLink to="/"><Home size={16} /> Retour à l'accueil</ButtonLink>
          <ButtonLink to="/medicaments" variant="outline"><Search size={16} /> Rechercher un médicament</ButtonLink>
        </div>
      </div>
    </div>
  )
}
