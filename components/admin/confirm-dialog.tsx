'use client'

import { AlertTriangle, ShieldQuestion } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDialog } from '@/hooks/use-dialog'
import { cn } from '@/lib/utils'

export type ConfirmAsk = {
  /** The question, in a few words: "Delete this account?" */
  title: string
  /** What will happen, one fact per line, so nothing is a surprise. */
  summary?: string[]
  /** For anything that cannot be undone: the exact word (or email, or name) that has to be typed before the button works. */
  word?: string
  /** The words on the button. */
  action?: string
  danger?: boolean
}
type Pending = ConfirmAsk & { resolve: (ok: boolean) => void }
const EVENT = 'logoless:admin-confirm'

/**
 * Asks before an admin action runs, and resolves true only if the admin agreed. It says exactly what will happen, and for anything that
 * cannot be taken back the admin has to type a word first, so a slip of the mouse can never delete, ban or send anything.
 * Needs <ConfirmDialogHost /> on the page (it comes with <SecretDialogHost />).
 */
export function askConfirm(ask: ConfirmAsk | string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  const detail = typeof ask === 'string' ? { title: ask } : ask
  return new Promise((resolve) => {
    let heard = false
    const probe = () => (heard = true)
    window.addEventListener(`${EVENT}:ack`, probe, { once: true })
    window.dispatchEvent(new CustomEvent<Pending>(EVENT, { detail: { ...detail, resolve } }))
    window.removeEventListener(`${EVENT}:ack`, probe)
    // no host on this page: fall back to the browser's own box rather than running the action unasked
    if (!heard) resolve(window.confirm([detail.title, ...(detail.summary ?? [])].join('\n\n')))
  })
}

export function ConfirmDialogHost() {
  const [ask, setAsk] = useState<Pending | null>(null)
  const [typed, setTyped] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const go = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const on = (e: Event) => {
      window.dispatchEvent(new Event(`${EVENT}:ack`))
      setAsk((e as CustomEvent<Pending>).detail)
      setTyped('')
    }
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  useEffect(() => {
    if (ask) window.setTimeout(() => (ask.word ? input.current : go.current)?.focus(), 40)
  }, [ask])

  const close = (ok: boolean) => {
    ask?.resolve(ok)
    setAsk(null)
  }
  const box = useDialog<HTMLFormElement>(Boolean(ask), () => close(false), { initial: 'none' })

  if (!ask || typeof document === 'undefined') return null
  const danger = ask.danger ?? Boolean(ask.word)
  const matches = !ask.word || typed.trim().toLowerCase() === ask.word.toLowerCase()
  const Icon = danger ? AlertTriangle : ShieldQuestion
  return createPortal(
    <div className="fixed inset-0 z-[300] grid place-items-center bg-black/70 px-4 backdrop-blur-[3px]" onMouseDown={() => close(false)} role="presentation">
      <form
        ref={box}
        onSubmit={(e) => {
          e.preventDefault()
          if (matches) close(true)
        }}
        onMouseDown={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-summary"
        className="w-full max-w-md rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-ink p-7 shadow-[0_40px_100px_-30px_rgb(0_0_0/0.95)]"
      >
        <span className={cn('grid size-11 place-items-center rounded-pill', danger ? 'bg-signal/15 text-signal' : 'bg-paper text-ink')}>
          <Icon className="size-5" />
        </span>
        <p id="confirm-title" className="mt-5 font-display text-3xl leading-tight">
          {ask.title}
        </p>
        <div id="confirm-summary">
          {ask.summary && ask.summary.length > 0 && (
            <ul className="mt-4 grid gap-2 rounded-2xl border border-line bg-white/[0.025] p-4 text-sm leading-relaxed text-paper/75">
              {ask.summary.map((s) => (
                <li key={s} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-[0.6em] size-1 shrink-0 rounded-full bg-paper/40" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
          {ask.word && (
            <p className="mt-4 text-sm text-mute">
              This cannot be undone. Type <b className="font-mono font-medium text-paper">{ask.word}</b> to continue.
            </p>
          )}
        </div>
        {ask.word && (
          <input
            ref={input}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-label={`Type ${ask.word} to continue`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={ask.word}
            className={cn('mt-3 h-12 w-full rounded-pill border bg-transparent px-5 font-mono text-sm outline-none transition-colors', matches ? 'border-signal/70' : 'border-line-strong focus:border-paper')}
          />
        )}
        <div className="mt-6 flex items-center gap-3">
          <button
            ref={go}
            type="submit"
            disabled={!matches}
            className={cn('inline-flex h-12 flex-1 items-center justify-center rounded-pill px-5 text-[15px] font-medium transition-colors disabled:opacity-35', danger ? 'bg-signal text-ink hover:bg-signal/85' : 'bg-paper text-ink hover:bg-paper/85')}
          >
            {ask.action ?? 'Yes, do it'}
          </button>
          <button type="button" onClick={() => close(false)} className="h-12 px-4 text-sm text-mute hover:text-paper">
            Cancel
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
