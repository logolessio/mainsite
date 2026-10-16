'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PLATFORM_LABEL } from '@/components/brand-icon'
import { useNavUser } from '@/components/shell/nav-user'
import { type Campaign, type Platform, usd } from '@/lib/campaigns'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

type Step = 'link' | 'preview' | 'checking'
type CheckRow = { id: string; label: string; state: 'pass' | 'fail' | 'unknown'; note?: string }
type Result = { id: string; status: 'approved' | 'declined' | 'review'; checks: CheckRow[]; reason: string | null }

const HOSTS: Record<Platform, RegExp> = {
  tiktok: /(^|\.)tiktok\.com$/,
  youtube: /(^|\.)(youtube\.com|youtu\.be)$/,
  instagram: /(^|\.)instagram\.com$/,
}

/** The address of the platform's own player for a link, or null when we cannot build one. */
function embedUrl(platform: Platform, raw: string): string | null {
  try {
    const u = new URL(raw)
    if (platform === 'youtube') {
      const id = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : (u.searchParams.get('v') ?? /\/(?:shorts|live|embed)\/([\w-]+)/.exec(u.pathname)?.[1])
      return id ? `https://www.youtube-nocookie.com/embed/${id.split('/')[0]}` : null
    }
    if (platform === 'tiktok') {
      const id = /\/video\/(\d+)/.exec(u.pathname)?.[1]
      return id ? `https://www.tiktok.com/embed/v2/${id}` : null
    }
    const m = /\/(p|reel|reels|tv)\/([\w-]+)/.exec(u.pathname)
    return m ? `https://www.instagram.com/${m[1] === 'p' ? 'p' : 'reel'}/${m[2]}/embed` : null
  } catch {
    return null
  }
}

const mockResult = (o: 'approved' | 'declined' | 'review'): Result => ({
  id: 'preview',
  status: o,
  reason: o === 'declined' ? 'The link did not lead to a video. This is a preview, nothing was sent.' : null,
  checks: [
    { id: 'link', label: 'The link opens a video', state: o === 'declined' ? 'fail' : 'pass' },
    { id: 'owner', label: 'Posted on your own account', state: o === 'review' ? 'unknown' : 'pass', note: o === 'review' ? 'A person will confirm this.' : undefined },
    { id: 'sound', label: 'Uses the campaign sound', state: 'unknown', note: 'Sound is confirmed by a person.' },
  ],
})

const STEPS: Step[] = ['link', 'preview', 'checking']

/** Which of the campaign's platforms a link belongs to, from its address. */
const detect = (raw: string, allowed: Platform[]): Platform | null => {
  try {
    const host = new URL(raw.trim()).hostname
    return allowed.find((p) => HOSTS[p].test(host)) ?? null
  } catch {
    return null
  }
}

/** Pasting the link (the platform is worked out from it), watching it play, and following the check to the end. */
export function SubmitFlow({ campaign, onBack, onClose, preview }: { campaign: Campaign; onBack: () => void; onClose?: () => void; preview?: 'approved' | 'declined' | 'review' }) {
  const [step, setStep] = useState<Step>('link')
  // someone who is not signed in is asked to sign up or log in first, and comes straight back to this campaign
  const { user } = useNavUser()
  const needsAccount = !preview && user !== null && !user.signedIn
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<0 | 1 | 2>(0)
  const [result, setResult] = useState<Result | null>(null)
  const [asked, setAsked] = useState<'idle' | 'busy' | 'done'>('idle')
  const platform = detect(url, campaign.platforms) ?? campaign.platforms[0]
  const embed = useMemo(() => (url ? embedUrl(platform, url.trim()) : null), [platform, url])
  const idx = STEPS.indexOf(step)

  const back = () => {
    setError('')
    if (step === 'link') return onBack()
    setStep(STEPS[idx - 1])
  }

  const checkLink = () => {
    try {
      new URL(url.trim())
    } catch {
      return setError('Paste the full link to your post, starting with https://')
    }
    if (!detect(url, campaign.platforms)) return setError(`That doesn’t look like a ${campaign.platforms.map((p) => PLATFORM_LABEL[p]).join(', ').replace(/, ([^,]*)$/, ' or $1')} link.`)
    setError('')
    setStep('preview')
  }

  const submit = async () => {
    setBusy(true)
    setError('')
    setStep('checking')
    setPhase(1)
    const started = Date.now()
    if (preview) {
      // an admin's dry run: nothing is sent, the check just plays out the way they picked
      await new Promise((r) => setTimeout(r, 1800))
      setResult(mockResult(preview))
      setPhase(2)
      setBusy(false)
      return
    }
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/submit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ platform, url: url.trim() }) })
      const j = (await res.json().catch(() => ({}))) as Partial<Result> & { error?: string }
      await new Promise((r) => setTimeout(r, Math.max(0, 1800 - (Date.now() - started)))) // let the check be seen
      if (res.status === 401) {
        setStep('preview')
        setPhase(0)
        return setError('Log in to submit a clip.')
      }
      if (!res.ok || !j.status) {
        setStep('preview')
        setPhase(0)
        return setError(j.error ?? 'Could not submit that clip.')
      }
      setResult(j as Result)
      setPhase(2)
    } catch {
      setStep('preview')
      setPhase(0)
      setError('Could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const askForReview = async () => {
    if (!result) return
    setAsked('busy')
    if (preview) {
      await new Promise((r) => setTimeout(r, 600))
      setResult({ ...result, status: 'review' })
      return setAsked('done')
    }
    const res = await fetch(`/api/me/submissions/${result.id}/review`, { method: 'POST' }).catch(() => null)
    if (res?.ok) {
      setResult({ ...result, status: 'review' })
      setAsked('done')
    } else setAsked('idle')
  }

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-center justify-between">
        {step !== 'checking' || phase < 2 ? (
          <button type="button" onClick={back} disabled={step === 'checking'} className="inline-flex items-center gap-2 text-[15px] text-white/60 transition-colors hover:text-white disabled:opacity-0">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s} className={cn('h-1 w-8 rounded-full transition-colors', i <= idx ? 'bg-white' : 'bg-white/20')} />
          ))}
        </div>
        {onClose ? (
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">
            <X className="size-4" />
          </button>
        ) : (
          <span className="w-9" />
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE_OUT }} className="mt-6 flex flex-1 flex-col items-center justify-center text-center">
          {step === 'link' && needsAccount && (
            <>
              <h2 className="font-display text-3xl md:text-4xl">Make a free account first</h2>
              <p className="mt-3 max-w-sm text-white/55">It takes a minute, and you come straight back here to paste your link.</p>
              <div className="mt-8 grid w-full max-w-sm gap-3">
                <Link href={`/onboarding?role=clipper`} className="inline-flex h-14 items-center justify-center rounded-full bg-white text-[16px] font-medium text-black transition-colors hover:bg-white/85">
                  Get started
                </Link>
                <Link href={`/login?next=${encodeURIComponent(`/campaign/${campaign.id}`)}`} className="inline-flex h-14 items-center justify-center rounded-full border border-white/25 text-[16px] transition-colors hover:bg-white/10">
                  I already have an account
                </Link>
              </div>
            </>
          )}

          {step === 'link' && !needsAccount && (
            <>
              <h2 className="font-display text-3xl md:text-4xl">Paste the link</h2>
              <p className="mt-3 text-white/55">The link to your post on {campaign.platforms.map((p) => PLATFORM_LABEL[p]).join(', ').replace(/, ([^,]*)$/, ' or $1')}.</p>
              <form
                className="mt-8 w-full max-w-sm"
                onSubmit={(e) => {
                  e.preventDefault()
                  checkLink()
                }}
              >
                <label htmlFor="clip-link" className="sr-only">
                  Link to your post
                </label>
                <input id="clip-link" autoFocus value={url} onChange={(e) => (setUrl(e.target.value), setError(''))} placeholder="https://" inputMode="url" autoComplete="off" className="h-14 w-full rounded-full border border-white/25 bg-transparent px-6 text-center text-[16px] outline-none placeholder:text-white/35 focus:border-white" />
                {error && (
                  <p role="alert" className="mt-3 text-sm text-red-400">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={!url.trim()} className="mt-5 h-14 w-full rounded-full bg-white text-[16px] font-medium text-black transition-colors hover:bg-white/85 disabled:opacity-40">
                  Preview it
                </button>
              </form>
            </>
          )}

          {step === 'preview' && (
            <>
              <h2 className="font-display text-3xl md:text-4xl">Is this the one?</h2>
              <div className="mt-6 grid w-full gap-6 sm:grid-cols-[minmax(0,11rem)_1fr] sm:text-left">
                <div className="mx-auto w-full max-w-[11rem] overflow-hidden rounded-3xl border border-white/15 bg-black">
                  {embed ? (
                    <iframe src={embed} title={`Your ${PLATFORM_LABEL[platform]} post`} loading="lazy" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-presentation" allow="encrypted-media; picture-in-picture" className="aspect-[9/16] w-full" />
                  ) : (
                    <div className="grid aspect-[9/16] place-items-center p-5 text-sm text-white/55">We can’t show a preview of this link, but you can still submit it.</div>
                  )}
                </div>
                <div className="grid content-start gap-3 text-[15px]">
                  {[
                    ['Campaign', campaign.title],
                    ['Artist', campaign.creator],
                    ['Platform', PLATFORM_LABEL[platform]],
                    ['Rate', `${usd(campaign.ratePer1k, 2)} per 1,000 views`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-white/10 pb-2.5">
                      <span className="text-white/50">{k}</span>
                      <span className="text-right">{v}</span>
                    </div>
                  ))}
                  <p className="break-all pt-1 text-[13px] text-white/45">{url}</p>
                  {campaign.clipThis.length > 0 && <p className="text-[13px] text-white/70">It should: {campaign.clipThis.slice(0, 3).join('; ')}.</p>}
                  {campaign.offLimits.length > 0 && <p className="text-[13px] text-white/55">Not allowed: {campaign.offLimits.slice(0, 2).join('; ')}.</p>}
                </div>
              </div>
              {error && (
                <p role="alert" className="mt-4 text-sm text-red-400">
                  {error}{' '}
                  {error.startsWith('Log in') && (
                    <Link href="/login" className="underline underline-offset-4">
                      Log in
                    </Link>
                  )}
                </p>
              )}
              <button type="button" onClick={submit} disabled={busy} className="mt-7 h-14 w-full max-w-sm rounded-full bg-white text-[16px] font-medium text-black transition-colors hover:bg-white/85 disabled:opacity-50">
                Submit
              </button>
            </>
          )}

          {step === 'checking' && (
            <>
              <h2 className="font-display text-3xl md:text-4xl">{phase < 2 ? 'Checking your clip' : result?.status === 'approved' ? 'Success' : result?.status === 'declined' ? 'We couldn’t approve it' : 'Waiting for a person'}</h2>
              <ol className="relative mt-8 flex w-full max-w-sm items-start justify-between" aria-label="Progress">
                <span aria-hidden="true" className="absolute top-[15px] right-4 left-4 border-t-2 border-dashed border-white/25" />
                <motion.span aria-hidden="true" className="absolute top-[15px] left-4 border-t-2 border-dashed border-white" initial={{ width: '0%' }} animate={{ width: phase === 0 ? '0%' : phase === 1 ? 'calc(50% - 1rem)' : 'calc(100% - 2rem)' }} transition={{ duration: 0.8, ease: EASE_OUT }} />
                {[
                  { label: 'Submitted', done: phase >= 1 },
                  { label: 'Checking metadata', done: phase >= 2, working: phase === 1 },
                  { label: phase === 2 ? (result?.status === 'approved' ? 'Approved' : result?.status === 'declined' ? 'Declined' : 'Human review') : 'Status', done: phase === 2 },
                ].map((n, i) => (
                  <li key={i} className="relative flex w-24 flex-col items-center gap-3 text-[13px]">
                    <span className={cn('grid size-8 place-items-center rounded-full border-2 bg-[#0b0b0d] transition-colors', n.done ? (i === 2 && result?.status === 'declined' ? 'border-red-400 text-red-400' : 'border-white bg-white text-black') : 'border-white/30')}>
                      {n.working ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : n.done ? (i === 2 && result?.status === 'declined' ? <X className="size-4" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />) : null}
                    </span>
                    <span className={cn(n.done || n.working ? 'text-white' : 'text-white/45')}>{n.label}</span>
                  </li>
                ))}
              </ol>

              {phase === 2 && result && (
                <div className="mt-7 w-full max-w-sm">
                  <ul className="grid gap-2 text-left text-[14px]">
                    {result.checks.map((c) => (
                      <li key={c.id} className="flex items-start gap-3">
                        <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', c.state === 'pass' ? 'bg-emerald-400' : c.state === 'fail' ? 'bg-red-400' : 'bg-white/35')} aria-hidden="true" />
                        <span>
                          {c.label}
                          {c.note && <span className="block text-white/45">{c.note}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-[14px] leading-relaxed text-white/70">
                    {result.status === 'approved' && 'Your clip is approved. Our team confirms the views before you are paid. You can follow it in your dashboard.'}
                    {result.status === 'review' && 'Your clip is pending. A person on our team will look at it soon. You can see where it is in your dashboard.'}
                    {result.status === 'declined' && (result.reason ?? 'The link did not lead to a video.')}
                  </p>
                  <div className="mt-4 grid gap-2.5">
                    <Link href="/dashboard/submissions" className="inline-flex h-12 items-center justify-center rounded-full bg-white text-[15px] font-medium text-black hover:bg-white/85">
                      See it in Submissions
                    </Link>
                    {result.status === 'declined' && asked !== 'done' && (
                      <button type="button" onClick={askForReview} disabled={asked === 'busy'} className="h-12 rounded-full border border-white/25 text-[15px] hover:bg-white/10 disabled:opacity-50">
                        {asked === 'busy' ? 'Sending…' : 'Ask a person to look at it'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
