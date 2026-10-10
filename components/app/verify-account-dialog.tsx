'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Loader2, ShieldCheck, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BrandIcon } from '@/components/brand-icon'
import { useMounted } from '@/hooks/use-motion-prefs'
import {
  BIO_WHERE,
  CODE_TTL_MIN,
  type SocialPlatform,
  type VerificationRequest,
  checkVerification,
  requestVerification,
} from '@/lib/accounts'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

const LABEL: Record<SocialPlatform, string> = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube' }

type Phase = 'handle' | 'code' | 'checking' | 'verified'

export function VerifyAccountDialog({
  platform,
  open,
  onClose,
  onVerified,
}: {
  platform: SocialPlatform | null
  open: boolean
  onClose: () => void
  onVerified: (platform: SocialPlatform, handle: string) => void
}) {
  const mounted = useMounted()
  if (!mounted) return null
  return createPortal(
    <AnimatePresence>{open && platform && <Dialog key={platform} platform={platform} onClose={onClose} onVerified={onVerified} />}</AnimatePresence>,
    document.body,
  )
}

function Dialog({
  platform,
  onClose,
  onVerified,
}: {
  platform: SocialPlatform
  onClose: () => void
  onVerified: (platform: SocialPlatform, handle: string) => void
}) {
  const [phase, setPhase] = useState<Phase>('handle')
  const [handle, setHandle] = useState('')
  const [req, setReq] = useState<VerificationRequest | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [left, setLeft] = useState(CODE_TTL_MIN * 60)
  const input = useRef<HTMLInputElement>(null)
  const where = BIO_WHERE[platform]

  useEffect(() => {
    input.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = prev
    }
  }, [onClose])

  useEffect(() => {
    if (!req) return
    const tick = () => setLeft(Math.max(0, Math.round((req.expiresAt - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [req])

  const clean = handle.trim().replace(/^@/, '')
  const validHandle = /^[A-Za-z0-9._-]{2,40}$/.test(clean)

  const start = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validHandle) return setError('Enter just your username, without spaces or a link.')
    setError('')
    try {
      setReq(await requestVerification(platform, clean))
      setPhase('code')
    } catch {
      setError('Could not create a code. Please try again.')
    }
  }

  const copy = async () => {
    if (!req) return
    try {
      await navigator.clipboard.writeText(req.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked: the code is selectable on screen */
    }
  }

  const verify = async () => {
    if (!req) return
    setPhase('checking')
    setError('')
    const result = await checkVerification(platform, clean, req)
    if (result === 'verified') {
      setPhase('verified')
      onVerified(platform, clean)
      return
    }
    setPhase('code')
    setError(
      result === 'not_found'
        ? `We could not find the code in your ${where.place} yet. Make sure you saved it and the profile is public, then try again in a minute.`
        : result === 'expired'
          ? 'This code has expired. Start again to get a new one.'
          : 'That account is already linked to another logoless user. Contact support if it is yours.',
    )
  }

  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-title"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[28px] border border-white/12 bg-gradient-to-b from-[#17171b] to-[#0b0b0d] p-6 shadow-[0_40px_100px_-30px_rgb(0_0_0/0.9)] md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full border border-line-strong">
              <BrandIcon name={platform} className="size-5" />
            </span>
            <div>
              <h2 id="verify-title" className="font-display text-2xl leading-none">
                Link {LABEL[platform]}
              </h2>
              <p className="mt-1 text-xs text-mute">
                {phase === 'handle' ? 'Step 1 of 2' : phase === 'verified' ? 'Done' : 'Step 2 of 2'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full text-mute transition-colors hover:text-paper">
            <X className="size-4" />
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {phase === 'handle' && (
            <motion.form key="handle" onSubmit={start} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-7">
              <p className="text-sm leading-relaxed text-mute">
                Enter the {LABEL[platform]} account you post from. We will give you a code to paste into your {where.place} to prove it is yours.
              </p>
              <label htmlFor="verify-handle" className="mt-5 block font-mono text-xs text-mute">
                Username
              </label>
              <div className="mt-2 flex h-12 items-center rounded-full border border-line-strong bg-ink/60 px-4 focus-within:border-paper/60">
                <span className="mr-1 text-mute">@</span>
                <input
                  id="verify-handle"
                  ref={input}
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="yourhandle"
                  className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-mute focus:outline-none"
                />
              </div>
              <p role="alert" className="mt-2 min-h-5 text-xs text-signal">
                {error}
              </p>
              <button type="submit" className="mt-3 h-12 w-full rounded-full bg-paper text-sm font-medium text-ink transition-colors hover:bg-paper/85">
                Get my code
              </button>
            </motion.form>
          )}

          {(phase === 'code' || phase === 'checking') && req && (
            <motion.div key="code" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-7">
              <ol className="space-y-3 text-sm leading-relaxed text-mute">
                <li className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line-strong font-mono text-[11px] text-paper">1</span>
                  Copy this code.
                </li>
                <li className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line-strong font-mono text-[11px] text-paper">2</span>
                  <span>
                    Paste it anywhere in your <span className="text-paper">@{clean}</span> {where.place} and save. <span className="text-mute/80">({where.steps})</span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line-strong font-mono text-[11px] text-paper">3</span>
                  Come back and press Verify.
                </li>
              </ol>

              <div className="mt-5 flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] p-1.5 pl-5">
                <code className="flex-1 select-all font-mono text-lg tracking-wider">{req.code}</code>
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-paper px-4 text-sm font-medium text-ink transition-colors hover:bg-paper/85"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="mt-2 text-center font-mono text-[11px] text-mute">
                {left > 0 ? `Code expires in ${mm}:${ss}` : 'Code expired'}
              </p>

              <p role="alert" className={cn('mt-3 min-h-5 text-xs leading-relaxed text-signal', !error && 'sr-only')}>
                {error}
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPhase('handle')
                    setReq(null)
                    setError('')
                  }}
                  className="h-12 rounded-full border border-line-strong px-5 text-sm transition-colors hover:bg-paper/10"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={verify}
                  disabled={phase === 'checking' || left === 0}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-paper text-sm font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-60"
                >
                  {phase === 'checking' ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Checking your {where.place}
                    </>
                  ) : (
                    'Verify'
                  )}
                </button>
              </div>
              <p className="mt-4 text-center text-[11px] leading-relaxed text-mute">
                We only read your public {where.place}. We never ask for your password.
              </p>
            </motion.div>
          )}

          {phase === 'verified' && (
            <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-center" role="status">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-paper text-ink">
                <ShieldCheck className="size-7" />
              </span>
              <p className="mt-5 font-display text-3xl">@{clean} is verified</p>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-mute">
                You can submit clips from this account now. You can remove the code from your {where.place}.
              </p>
              <button type="button" onClick={onClose} className="mt-6 h-12 w-full rounded-full bg-paper text-sm font-medium text-ink transition-colors hover:bg-paper/85">
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
