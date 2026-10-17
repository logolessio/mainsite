'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, ExternalLink, Loader2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { BrandIcon } from '@/components/brand-icon'
import { useDialog } from '@/hooks/use-dialog'
import { useMounted } from '@/hooks/use-motion-prefs'
import type { State } from '@/lib/bio-verify'
import { SPRING_POP } from '@/lib/layout'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type P = State['platform']
const LABEL: Record<P, string> = { tiktok: 'TikTok', youtube: 'YouTube', instagram: 'Instagram' }
const WHERE: Record<P, string> = {
  tiktok: 'In TikTok, open your profile, press Edit profile, and add the code to your Bio.',
  youtube: 'In YouTube Studio, open Customization, then Basic info, and add the code to your Description.',
  instagram: 'In Instagram, open your profile, press Edit profile, and add the code to your Bio.',
}

type Phase = { kind: 'loading' } | { kind: 'ready' } | { kind: 'checking' } | { kind: 'verified' } | { kind: 'not-found'; message: string } | { kind: 'unreadable'; message: string } | { kind: 'waiting' } | { kind: 'error'; message: string }

async function call(action: 'start' | 'check' | 'ask', platform: P) {
  const res = await fetch('/api/me/accounts/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, platform }) })
  const j = (await res.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>
  if (!res.ok) throw new Error(j.error ?? 'Something went wrong. Please try again.')
  return j
}

/** Prove an account is yours: put a short code in its bio, then we look for it. A person on the team can check by hand when a site will not let us read it. */
export function BioVerifyDialog({ platform, handle, open, onClose, onChange }: { platform: P | null; handle: string; open: boolean; onClose: () => void; onChange: () => void }) {
  const mounted = useMounted()
  if (!mounted) return null
  return createPortal(<AnimatePresence>{open && platform && <Dialog key={platform} platform={platform} handle={handle} onClose={onClose} onChange={onChange} />}</AnimatePresence>, document.body)
}

function Dialog({ platform, handle, onClose, onChange }: { platform: P; handle: string; onClose: () => void; onChange: () => void }) {
  const [code, setCode] = useState('')
  const [profileUrl, setProfileUrl] = useState('')
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [copied, setCopied] = useState(false)

  const begin = useCallback(async () => {
    try {
      const j = (await call('start', platform)) as { account?: State }
      const a = j.account
      if (!a) throw new Error('Could not start that.')
      setCode(a.code ?? '')
      setProfileUrl(a.profileUrl)
      setPhase(a.status === 'verified' ? { kind: 'verified' } : a.status === 'waiting' ? { kind: 'waiting' } : { kind: 'ready' })
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : 'Could not start that.' })
    }
  }, [platform])

  const box = useDialog<HTMLDivElement>(true, onClose)
  useEffect(() => {
    void begin()
  }, [begin])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.ok('Code copied')
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* the code is selectable, so it can still be copied by hand */
    }
  }
  const run = async () => {
    setPhase({ kind: 'checking' })
    try {
      const j = (await call('check', platform)) as { result?: { status: string; message?: string } }
      const r = j.result
      if (r?.status === 'verified') {
        setPhase({ kind: 'verified' })
        toast.ok(`${LABEL[platform]} verified`)
        onChange()
      } else if (r?.status === 'unreadable') setPhase({ kind: 'unreadable', message: r.message ?? '' })
      else if (r?.status === 'not-found') setPhase({ kind: 'not-found', message: r.message ?? '' })
      else setPhase({ kind: 'error', message: r?.message ?? 'Could not check that.' })
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : 'Could not check that.' })
    }
  }
  const ask = async () => {
    setPhase({ kind: 'checking' })
    try {
      await call('ask', platform)
      setPhase({ kind: 'waiting' })
      onChange()
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : 'Could not ask the team.' })
    }
  }

  const busy = phase.kind === 'checking' || phase.kind === 'loading'
  const canAsk = phase.kind === 'unreadable' || phase.kind === 'not-found' || (platform === 'instagram' && phase.kind === 'ready')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/75 p-4" onClick={onClose}>
      <motion.div ref={box} role="dialog" aria-modal="true" aria-label={`Verify ${LABEL[platform]}`} initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.16 } }} transition={SPRING_POP} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-[28px] border border-white/12 bg-gradient-to-b from-[#17171b] to-[#0b0b0d] p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full border border-line"><BrandIcon name={platform} className="size-6" /></span>
            <div className="min-w-0">
              <h2 className="font-display text-2xl">Verify {LABEL[platform]}</h2>
              <p className="truncate text-sm text-mute">@{handle}</p>
            </div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-white/10"><X className="size-4" /></button>
        </div>

        {phase.kind === 'verified' ? (
          <div className="mt-8 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-400/15 text-emerald-300"><Check className="size-7" /></span>
            <p className="mt-5 text-lg">@{handle} is verified</p>
            <p className="mx-auto mt-2 max-w-xs text-sm text-mute">Clips from this account can now be checked automatically. You can take the code out of your bio.</p>
            <button type="button" onClick={onClose} className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full bg-paper text-[15px] font-medium text-ink transition-colors hover:bg-paper/85">Done</button>
          </div>
        ) : phase.kind === 'waiting' ? (
          <div className="mt-8 text-center">
            <p className="text-lg">Waiting for the team</p>
            <p className="mx-auto mt-2 max-w-xs text-sm text-mute">Someone will look at your bio and you will get a notification. Leave the code in your bio until then.</p>
            <p className="mt-5 inline-block rounded-xl border border-line-strong bg-ink/70 px-4 py-2 font-mono text-sm select-all">{code}</p>
            <button type="button" onClick={onClose} className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full border border-white/25 text-[15px] transition-colors hover:bg-white/10">Close</button>
          </div>
        ) : (
          <>
            <ol className="mt-6 grid gap-5 text-[15px]">
              <li className="flex gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-xs">1</span>
                <div className="min-w-0 flex-1">
                  <p>Put this code in your bio</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate rounded-2xl border border-line-strong bg-ink/70 px-4 py-3 text-center font-mono text-base tracking-wide select-all">{phase.kind === 'loading' ? '…' : code}</span>
                    <button type="button" onClick={copy} disabled={!code} aria-label="Copy the code" className="grid size-12 shrink-0 place-items-center rounded-2xl border border-line-strong transition-colors hover:bg-white/[0.06] disabled:opacity-40">
                      {copied ? <Check className="size-4 text-emerald-300" /> : <Copy className="size-4" />}
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-mute">{WHERE[platform]}</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-xs">2</span>
                <div className="min-w-0 flex-1">
                  <p>Save it, then check</p>
                  <p className="mt-1 text-sm text-mute">It can take a minute for the platform to show the new bio.</p>
                </div>
              </li>
            </ol>

            {phase.kind === 'not-found' && <p role="alert" className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-100">{phase.message}</p>}
            {phase.kind === 'unreadable' && (
              <p role="alert" className="mt-5 rounded-2xl border border-line-strong px-4 py-3 text-sm text-paper/80">
                {phase.message} {code && 'If the code is in your bio, ask the team to check it by hand.'}
              </p>
            )}
            {phase.kind === 'error' && <p role="alert" className="mt-5 text-sm text-signal">{phase.message}</p>}
            {platform === 'instagram' && phase.kind === 'ready' && <p className="mt-5 text-sm text-mute">Instagram does not let a website read profiles, so a person on our team will check this one. Try the check first, or ask us straight away once the code is in your bio.</p>}

            <div className="mt-6 grid gap-2.5">
              <button type="button" onClick={run} disabled={busy || !code} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-paper text-[15px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40">
                {phase.kind === 'checking' && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} Check my bio
              </button>
              {canAsk && (
                <button type="button" onClick={ask} disabled={busy} className={cn('inline-flex h-12 w-full items-center justify-center rounded-full border border-white/25 text-[15px] transition-colors hover:bg-white/10 disabled:opacity-40')}>
                  Ask the team to check it
                </button>
              )}
              {profileUrl && (
                <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center justify-center gap-1.5 text-sm text-mute transition-colors hover:text-paper">
                  Open my {LABEL[platform]} profile <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
