import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bot, RotateCcw, Send } from 'lucide-react'
import { AI_SUGGESTIONS, answer, type AiAnswer } from '../../data/assistant'
import { Button, PageHeader, cx } from '../../components/ui'

type Msg = { id: number; role: 'user' | 'ai'; text: string; links?: AiAnswer['links']; tone?: AiAnswer['tone'] }

const WELCOME: Msg = {
  id: 0,
  role: 'ai',
  text: 'Bonjour 👋 Je suis PHARMA AI, l\'assistant d\'information de PHARMA CI.\n\nJe peux vous renseigner sur un médicament (usage, effets indésirables, conservation, statut CMU, prix, équivalents), sur la lecture d\'une ordonnance, la CMU, les pharmacies de garde ou la livraison.',
}

let nextId = 1

export default function Assistant() {
  const [params, setParams] = useSearchParams()
  const [messages, setMessages] = useState<Msg[]>([WELCOME])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const sentInitial = useRef(false)

  const send = (raw: string) => {
    const text = raw.trim()
    if (!text || typing) return
    setMessages((m) => [...m, { id: nextId++, role: 'user', text }])
    setInput('')
    setTyping(true)
    window.setTimeout(() => {
      const a = answer(text)
      setMessages((m) => [...m, { id: nextId++, role: 'ai', ...a }])
      setTyping(false)
    }, 450)
  }

  useEffect(() => {
    const q = params.get('q')
    if (q && !sentInitial.current) {
      sentInitial.current = true
      send(q)
      setParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, typing])

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageHeader
        title="PHARMA AI"
        subtitle="Assistant d'information sur les médicaments"
        icon={<Bot size={22} />}
        action={<Button variant="ghost" size="sm" onClick={() => setMessages([WELCOME])} aria-label="Nouvelle conversation"><RotateCcw size={16} /></Button>}
      />

      <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-800 sm:text-sm">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>❌ Pas de diagnostic</span>
          <span>❌ Pas de modification d'ordonnance</span>
          <span>❌ Pas de prescription</span>
          <span>❌ Ne remplace pas un professionnel de santé</span>
        </div>
        <p className="mt-1 font-normal text-red-700">Urgence : appelez le <a href="tel:185" className="font-bold underline">185 (SAMU)</a>.</p>
      </div>

      <div className="min-h-[50vh] space-y-3 rounded-3xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
        {messages.map((m) => (
          <div key={m.id} className={cx('flex gap-2', m.role === 'user' && 'justify-end')}>
            {m.role === 'ai' && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500 text-white"><Bot size={16} /></div>}
            <div
              className={cx(
                'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'rounded-br-md bg-brand-500 text-white'
                  : m.tone === 'danger' ? 'rounded-bl-md border border-red-200 bg-red-50 text-red-900'
                    : m.tone === 'warning' ? 'rounded-bl-md border border-amber-200 bg-amber-50 text-amber-950'
                      : 'rounded-bl-md bg-slate-100 text-ink',
              )}
            >
              <p className="whitespace-pre-line break-words">{m.text}</p>
              {m.links && m.links.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {m.links.map((l) => (
                    <Link
                      key={l.to + l.label}
                      to={l.to}
                      className={cx('rounded-full px-3 py-1 text-xs font-semibold', m.tone === 'danger' ? 'bg-red-600 text-white' : 'bg-white text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50')}
                    >
                      {l.label} →
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500 text-white"><Bot size={16} /></div>
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3">
              {[0, 150, 300].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="scrollbar-none -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {AI_SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-700">
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="sticky bottom-2 mt-3 flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez votre question sur un médicament…"
          aria-label="Votre question"
          className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-slate-400"
        />
        <Button type="submit" disabled={!input.trim() || typing} aria-label="Envoyer"><Send size={16} /></Button>
      </form>
      <p className="mt-2 text-center text-[11px] text-slate-400">Réponses générées localement à partir de la base PHARMA MED (prix et liste CMU publics).</p>
    </div>
  )
}
