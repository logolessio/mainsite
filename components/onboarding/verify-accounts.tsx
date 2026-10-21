'use client'

import { Check, Copy, ExternalLink, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BioVerifyDialog, TIKTOK_SLOW, WHERE } from '@/components/app/bio-verify-dialog'
import { BrandIcon } from '@/components/brand-icon'
import type { State } from '@/lib/bio-verify'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type P = State['platform']
const ORDER: P[] = ['tiktok', 'youtube', 'instagram']
const LABEL: Record<P, string> = { tiktok: 'TikTok', youtube: 'YouTube', instagram: 'Instagram' }
const bare = (h: string) => h.replace(/^@/, '').trim()

/**
 * The last question in onboarding: prove the accounts that were just added by putting a short code in their bios. Each account
 * can be done now or left for later (it stays in the dashboard). `preview` is an admin's dry run: nothing is requested or saved.
 */
export function VerifyAccounts({ inline = false, quietClass = '', ...rest }: { linked: Record<string, string>; preview: boolean; onDone: () => void; buttonClass: string; quietClass?: string; inline?: boolean }) {
  return inline ? <VerifyInline {...rest} quietClass={quietClass} /> : <VerifyLater {...rest} />
}

/** Each account as a row with a Verify button that opens the dialog (how it works while `onboarding-checks` is off). */
function VerifyLater({ linked, preview, onDone, buttonClass }: { linked: Record<string, string>; preview: boolean; onDone: () => void; buttonClass: string }) {
  const mine = ORDER.filter((p) => bare(linked[p] ?? '') !== '')
  const [states, setStates] = useState<Partial<Record<P, State>>>({})
  const [fake, setFake] = useState<Partial<Record<P, boolean>>>({})
  const [open, setOpen] = useState<P | null>(null)

  const load = useCallback(async () => {
    if (preview) return
    try {
      const res = await fetch('/api/me/accounts/verify', { cache: 'no-store' })
      if (!res.ok) return
      const j = (await res.json()) as { accounts?: State[] }
      const next: Partial<Record<P, State>> = {}
      for (const a of j.accounts ?? []) next[a.platform] = a
      setStates(next)
    } catch {
      /* the rows still work: pressing Verify asks the server again */
    }
  }, [preview])
  useEffect(() => {
    void load()
  }, [load])

  const statusOf = (p: P): 'verified' | 'waiting' | 'open' => (preview ? (fake[p] ? 'verified' : 'open') : states[p]?.status === 'verified' ? 'verified' : states[p]?.status === 'waiting' ? 'waiting' : 'open')
  const done = mine.filter((p) => statusOf(p) === 'verified').length

  return (
    <>
      <ul className="grid w-full max-w-sm gap-3 text-left">
        {mine.map((p) => {
          const st = statusOf(p)
          const handle = bare(states[p]?.handle ?? linked[p] ?? '')
          return (
            <li key={p} className="flex h-14 items-center gap-3 rounded-pill border border-line-strong pr-2 pl-5">
              <BrandIcon name={p} className="size-5 shrink-0 text-mute" />
              <span className="min-w-0 flex-1 truncate text-[16px]">
                <span className="sr-only">{LABEL[p]} </span>@{handle}
              </span>
              {st === 'verified' ? (
                <span className="inline-flex h-10 items-center gap-1.5 rounded-pill bg-emerald-400/15 px-4 text-[14px] text-emerald-300">
                  <Check aria-hidden="true" className="size-4" /> Verified
                </span>
              ) : st === 'waiting' ? (
                <span className="inline-flex h-10 items-center rounded-pill px-4 text-[14px] text-mute">Waiting for the team</span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (preview) {
                      setFake((f) => ({ ...f, [p]: true }))
                      toast.ok('Preview: a real sign-up shows a code to put in your bio here')
                    } else setOpen(p)
                  }}
                  className={cn('inline-flex h-10 items-center rounded-pill bg-paper px-5 text-[14px] font-medium text-ink transition-colors hover:bg-paper/85')}
                >
                  Verify
                </button>
              )}
            </li>
          )
        })}
      </ul>
      <div className="mt-8 flex flex-col items-center gap-4">
        <button type="button" className={buttonClass} onClick={onDone}>
          {done > 0 || mine.some((p) => statusOf(p) === 'waiting') ? 'Continue' : 'Do this later'}
        </button>
        {done === 0 && <p className={cn('max-w-sm text-sm text-mute')}>Unverified accounts still work. Their submissions just wait for a person to check them. You can verify any time in Accounts.</p>}
        {done > 0 && <span className="max-w-sm text-sm text-mute">{done === mine.length ? 'All set. You can take the codes out of your bios.' : 'You can verify the rest later in Accounts.'}</span>}
      </div>
      <BioVerifyDialog platform={open} handle={open ? bare(states[open]?.handle ?? linked[open] ?? '') : ''} open={open !== null} onClose={() => setOpen(null)} onChange={() => void load()} />
    </>
  )
}

// ---------- inline, with `onboarding-checks` on ----------

type Phase = 'loading' | 'ready' | 'checking' | 'verified' | 'not-found' | 'unreadable' | 'waiting' | 'error'
type Row = { phase: Phase; code: string; profileUrl: string; handle: string; message: string }

/**
 * TikTok's website can lag behind a new bio, so after a miss we look again on our own every half minute, a few times. The verify
 * route allows 20 requests per 10 minutes per person: up to 3 codes, 5 automatic looks and the person's own presses stay inside it.
 */
const AUTO_EVERY_MS = 30_000
const AUTO_MAX = 5

async function post(action: 'start' | 'check' | 'ask', platform: P) {
  const res = await fetch('/api/me/accounts/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, platform }) })
  const j = (await res.json().catch(() => ({}))) as { error?: string; account?: State; result?: { status: string; message?: string } }
  if (!res.ok) throw Object.assign(new Error(j.error ?? 'Something went wrong. Please try again.'), { status: res.status })
  return j
}

const rowFrom = (s: State, fallbackHandle: string): Row => ({
  phase: s.status === 'verified' ? 'verified' : s.status === 'waiting' ? 'waiting' : s.status === 'code' ? 'ready' : s.note ? 'error' : 'loading',
  code: s.code ?? '',
  profileUrl: s.profileUrl,
  handle: s.handle || fallbackHandle,
  message: s.status === 'none' && s.note ? s.note : '',
})

/**
 * Every account that was just added gets its code right here: copy it, put it in the bio, press Check. Each row says plainly where
 * it stands. Unverified accounts still work, their submissions just wait for a person. `preview` (an admin's dry run) never calls
 * the server: the codes are made up and the checks are pretended.
 */
function VerifyInline({ linked, preview, onDone, buttonClass, quietClass }: { linked: Record<string, string>; preview: boolean; onDone: () => void; buttonClass: string; quietClass: string }) {
  const mine = ORDER.filter((p) => bare(linked[p] ?? '') !== '')
  const [rows, setRows] = useState<Partial<Record<P, Row>>>({})
  const [copied, setCopied] = useState<P | null>(null)
  const [nextAuto, setNextAuto] = useState<number | null>(null) // when TikTok is looked at again on its own (ms)
  const [now, setNow] = useState(() => Date.now())
  const autoRuns = useRef(0)
  const fakeTries = useRef<Partial<Record<P, number>>>({})
  // one request at a time: the server keeps all of a person's codes in one record, so two at once could undo each other
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const enqueue = <T,>(fn: () => Promise<T>) => {
    const next = queue.current.then(fn, fn)
    queue.current = next.catch(() => null)
    return next
  }
  const setRow = (p: P, r: Partial<Row>) => setRows((all) => ({ ...all, [p]: { phase: 'loading', code: '', profileUrl: '', handle: bare(linked[p] ?? ''), message: '', ...all[p], ...r } }))
  const mineKey = mine.join(',')
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  /** Asks the server for this account's code (the same one again while it is still good). */
  const begin = (p: P) => {
    const fallback = bare(linked[p] ?? '')
    setRow(p, { phase: 'loading', handle: fallback, message: '' })
    return enqueue(async () => {
      try {
        const j = await post('start', p)
        if (alive.current && j.account) setRow(p, rowFrom(j.account, fallback))
      } catch (e) {
        if (alive.current) setRow(p, { phase: 'error', message: e instanceof Error ? e.message : 'Could not get a code. Please try again.' })
      }
    })
  }

  // Load where each account stands, and get a code for any that has none yet.
  useEffect(() => {
    let live = true
    if (preview) {
      const fake: Partial<Record<P, Row>> = {}
      for (const p of mine) fake[p] = { phase: 'ready', code: `logoless-${{ tiktok: 'K7QX2M', youtube: 'R4HN8P', instagram: 'W2ZD6T' }[p]}`, profileUrl: '', handle: bare(linked[p] ?? ''), message: '' }
      setRows(fake)
      return
    }
    void (async () => {
      let states: State[] = []
      try {
        const res = await fetch('/api/me/accounts/verify', { cache: 'no-store' })
        if (res.ok) states = ((await res.json()) as { accounts?: State[] }).accounts ?? []
      } catch {
        /* each row asks for its own code below */
      }
      if (!live) return
      for (const p of mine) {
        const s = states.find((x) => x.platform === p)
        const fallback = bare(linked[p] ?? '')
        if (s && s.status !== 'none') setRow(p, rowFrom(s, fallback))
        else if (s?.note) setRow(p, rowFrom(s, fallback))
        else void begin(p)
      }
    })()
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, mineKey])

  const scheduleAuto = () => {
    if (autoRuns.current >= AUTO_MAX) return setNextAuto(null)
    setNow(Date.now())
    setNextAuto(Date.now() + AUTO_EVERY_MS)
  }

  const check = (p: P, auto = false) => {
    if (auto) autoRuns.current++
    if (p === 'tiktok') setNextAuto(null)
    setRow(p, { phase: 'checking', message: '' })
    return enqueue(async () => {
      let r: { status: string; message?: string } | undefined
      try {
        if (preview) {
          await new Promise((ok) => window.setTimeout(ok, 700))
          const n = (fakeTries.current[p] = (fakeTries.current[p] ?? 0) + 1)
          r =
            p === 'instagram'
              ? { status: 'unreadable', message: 'Instagram does not show profiles to automatic readers, so we cannot read it from here.' }
              : p === 'tiktok' && n === 1
                ? { status: 'not-found', message: 'We read your profile but the code is not in the bio yet.' }
                : { status: 'verified' }
        } else r = (await post('check', p)).result
      } catch (e) {
        if ((e as { status?: number }).status === 429) autoRuns.current = AUTO_MAX // too many tries: stop looking on our own
        setRow(p, { phase: 'error', message: e instanceof Error ? e.message : 'Could not check that. Please try again.' })
        if (p === 'tiktok') setNextAuto(null)
        return
      }
      if (r?.status === 'verified') {
        setRow(p, { phase: 'verified', message: '' })
        toast.ok(`${LABEL[p]} verified`)
        if (p === 'tiktok') setNextAuto(null)
        return
      }
      const phase: Phase = r?.status === 'not-found' ? 'not-found' : r?.status === 'unreadable' ? 'unreadable' : 'error'
      setRow(p, { phase, message: r?.message ?? 'Could not check that. Please try again.' })
      if (p === 'tiktok' && phase !== 'error') scheduleAuto()
    })
  }

  const ask = (p: P) => {
    setRow(p, { phase: 'checking', message: '' })
    return enqueue(async () => {
      try {
        if (preview) await new Promise((ok) => window.setTimeout(ok, 500))
        else await post('ask', p)
        setRow(p, { phase: 'waiting', message: '' })
        if (p === 'tiktok') setNextAuto(null)
      } catch (e) {
        setRow(p, { phase: 'error', message: e instanceof Error ? e.message : 'Could not ask the team. Please try again.' })
      }
    })
  }

  // the countdown to TikTok's next automatic look
  useEffect(() => {
    if (nextAuto === null) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [nextAuto])
  useEffect(() => {
    if (nextAuto !== null && now >= nextAuto) void check('tiktok', true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, nextAuto])

  const copy = async (p: P, code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(p)
      window.setTimeout(() => setCopied((c) => (c === p ? null : c)), 1600)
    } catch {
      /* the code can be selected and copied by hand */
    }
  }

  const settled = (p: P) => rows[p]?.phase === 'verified' || rows[p]?.phase === 'waiting'
  const allSettled = mine.length > 0 && mine.every(settled)
  const someSettled = mine.some(settled)
  const secondsLeft = nextAuto === null ? null : Math.max(0, Math.ceil((nextAuto - now) / 1000))

  return (
    <>
      <ul className="grid w-full max-w-md gap-3 text-left">
        {mine.map((p) => {
          const r = rows[p] ?? { phase: 'loading' as Phase, code: '', profileUrl: '', handle: bare(linked[p] ?? ''), message: '' }
          const open = r.phase !== 'verified' && r.phase !== 'waiting'
          const busy = r.phase === 'checking' || r.phase === 'loading'
          const tried = r.phase === 'not-found' || r.phase === 'unreadable'
          const waitingOnAuto = p === 'tiktok' && secondsLeft !== null
          const canAsk = Boolean(r.code) && (p === 'instagram' || r.phase === 'unreadable' || (r.phase === 'not-found' && !waitingOnAuto))
          return (
            <li key={p} className="rounded-card border border-line-strong p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <BrandIcon name={p} className="size-5 shrink-0 text-mute" />
                <span className="min-w-0 flex-1 truncate text-[16px]">
                  <span className="sr-only">{LABEL[p]} </span>@{r.handle}
                </span>
                <StatusPill phase={r.phase} platform={p} />
              </div>

              {r.phase === 'verified' && <p className="mt-2 text-sm text-mute">Yours, proven. You can take the code out of your bio.</p>}
              {r.phase === 'waiting' && (
                <p className="mt-2 text-sm text-mute">
                  Someone on the team will look at your bio and you will get a notification. Leave <span className="font-mono text-paper">{r.code}</span> in it until then.
                </p>
              )}

              {open && (
                <>
                  {r.code || r.phase === 'loading' ? (
                    <>
                      <p className="mt-3 text-sm text-mute">{WHERE[p]}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate rounded-2xl border border-line-strong px-4 py-2.5 text-center font-mono text-[15px] tracking-wide select-all">{r.code || '…'}</span>
                        <button type="button" onClick={() => void copy(p, r.code)} disabled={!r.code} aria-label={`Copy the ${LABEL[p]} code`} className="grid size-11 shrink-0 place-items-center rounded-2xl border border-line-strong transition-colors hover:bg-paper/[0.06] disabled:opacity-40">
                          {copied === p ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                        </button>
                      </div>
                    </>
                  ) : null}

                  {p === 'tiktok' && r.code && <p className="mt-3 text-sm text-mute">{TIKTOK_SLOW}</p>}
                  {p === 'instagram' && r.code && !tried && <p className="mt-3 text-sm text-mute">Instagram does not let websites read profiles, so once the code is in your bio, ask the team to check it. You can try the check first.</p>}

                  {r.message && (
                    <p role="alert" className={cn('mt-3 text-sm', r.phase === 'error' ? 'text-red-400' : r.phase === 'not-found' ? 'text-amber-300' : 'text-paper/80')}>
                      {r.message}
                      {r.phase === 'unreadable' && r.code ? ' If the code is in your bio, ask the team to check it by hand.' : ''}
                    </p>
                  )}

                  {(r.code || r.phase === 'error') && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => void (r.code ? check(p) : begin(p))} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-pill bg-paper px-5 text-[15px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40">
                        {r.phase === 'checking' && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
                        {!r.code ? 'Get a code' : tried ? 'Check again' : 'Check'}
                      </button>
                      {canAsk && (
                        <button type="button" onClick={() => void ask(p)} disabled={busy} className="inline-flex h-11 items-center rounded-pill border border-line-strong px-5 text-[15px] transition-colors hover:bg-paper/10 disabled:opacity-40">
                          Ask the team
                        </button>
                      )}
                      {r.profileUrl && (
                        <a href={r.profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-1.5 px-2 text-sm text-mute transition-colors hover:text-paper">
                          Open {LABEL[p]} <ExternalLink aria-hidden="true" className="size-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                  {waitingOnAuto && r.phase !== 'checking' && (
                    <p role="status" aria-live="polite" className="mt-3 text-sm text-mute">
                      Checking again on its own in {secondsLeft}s
                    </p>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>
      <div className="mt-8 flex flex-col items-center gap-4">
        {allSettled || someSettled ? (
          <button type="button" className={buttonClass} onClick={onDone}>
            Continue
          </button>
        ) : (
          <button type="button" className={quietClass} onClick={onDone}>
            Continue without verifying
          </button>
        )}
        {!allSettled && (
          <p className="max-w-sm text-sm leading-relaxed text-mute">
            {someSettled ? 'The rest can be verified later in Accounts.' : 'Accounts you do not verify still work.'} Submissions from an unverified account wait for a manual check by the team.
          </p>
        )}
        {allSettled && <p className="max-w-sm text-sm text-mute">{mine.every((p) => rows[p]?.phase === 'verified') ? 'All set. You can take the codes out of your bios.' : 'All set. Leave the code in any bio the team is still checking.'}</p>}
      </div>
    </>
  )
}

function StatusPill({ phase, platform }: { phase: Phase; platform: P }) {
  const base = 'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill px-3 text-[13px]'
  if (phase === 'verified')
    return (
      <span className={cn(base, 'bg-emerald-400/15 text-emerald-300')}>
        <Check aria-hidden="true" className="size-3.5" /> Verified
      </span>
    )
  if (phase === 'loading' || phase === 'checking')
    return (
      <span className={cn(base, 'text-mute')}>
        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> {phase === 'checking' ? 'Checking' : 'Getting a code'}
      </span>
    )
  if (phase === 'waiting') return <span className={cn(base, 'border border-line-strong text-mute')}>With the team</span>
  if (phase === 'not-found') return <span className={cn(base, 'bg-amber-400/15 text-amber-200')}>Not found yet</span>
  if (phase === 'unreadable') return <span className={cn(base, 'border border-line-strong text-paper/80')}>{platform === 'instagram' ? 'Ask the team' : 'We can’t read it'}</span>
  if (phase === 'error') return <span className={cn(base, 'bg-red-500/15 text-red-300')}>Not checked</span>
  return <span className={cn(base, 'border border-line-strong text-mute')}>Not verified</span>
}
