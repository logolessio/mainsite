'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Copy, ExternalLink, Loader2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TIKTOK_SLOW, WHERE } from '@/components/app/bio-verify-dialog'
import { BrandIcon } from '@/components/brand-icon'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import type { State } from '@/lib/bio-verify'
import { buildLink, USERNAME_LINKS, usernameOf } from '@/lib/profile-style'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type P = State['platform']
const ORDER: P[] = ['tiktok', 'youtube', 'instagram']
const LABEL: Record<P, string> = { tiktok: 'TikTok', youtube: 'YouTube', instagram: 'Instagram' }
const MINE = new Set<string>(ORDER)
const bare = (h: string) => h.replace(/^@+/, '').trim()
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

/**
 * empty: nothing added. adding: saved and being looked up. ready: the code is waiting to be put in the bio. checking: we are reading the bio.
 * verified / waiting (the team will look): both count as done. not-found, unreadable and error say what went wrong and offer another try.
 */
type Phase = 'empty' | 'adding' | 'ready' | 'checking' | 'verified' | 'not-found' | 'unreadable' | 'waiting' | 'error'
type Row = { phase: Phase; handle: string; code: string; profileUrl: string; message: string }
const blank: Row = { phase: 'empty', handle: '', code: '', profileUrl: '', message: '' }

export type AccountsStatus = { added: number; settled: number; loaded: boolean }

/** TikTok's website can lag behind a new bio, so after a miss we look again on our own every half minute, a few times (the route allows 40 requests per 10 minutes). */
const AUTO_EVERY_MS = 30_000
const AUTO_MAX = 5

async function post(action: 'lookup' | 'start' | 'check' | 'ask', platform: P) {
  const res = await fetch('/api/me/accounts/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, platform }) })
  const j = (await res.json().catch(() => ({}))) as { error?: string; account?: State; lookup?: { status: string; message?: string }; result?: { status: string; message?: string } }
  if (!res.ok) throw Object.assign(new Error(j.error ?? 'Something went wrong. Please try again.'), { status: res.status })
  return j
}

const rowFromState = (s: State): Row => ({
  phase: s.status === 'verified' ? 'verified' : s.status === 'waiting' ? 'waiting' : s.status === 'code' ? 'ready' : 'error',
  handle: s.handle,
  code: s.code ?? '',
  profileUrl: s.profileUrl,
  message: s.status === 'none' ? (s.note ?? '') : '',
})

/**
 * Adding an account and proving it are one thing here. Type the username and press the arrow: the account is saved and looked up (a mistyped
 * name is caught on the spot), then its code appears right in the same card. Put the code in the bio, press Check, and the card turns into a
 * verified row. Instagram cannot be read by a website, so there the team checks it by hand. `preview` (an admin's dry run) never calls the server.
 */
export function AccountsStep({ preview, onLinked, onStatus }: { preview: boolean; onLinked: (platform: P, handle: string | null) => void; onStatus: (s: AccountsStatus) => void }) {
  const { reduced } = useMotionPrefs()
  const [rows, setRows] = useState<Record<P, Row>>({ tiktok: blank, youtube: blank, instagram: blank })
  const [drafts, setDrafts] = useState<Record<P, string>>({ tiktok: '', youtube: '', instagram: '' })
  const [errors, setErrors] = useState<Partial<Record<P, string>>>({})
  const [copied, setCopied] = useState<P | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [nextAuto, setNextAuto] = useState<number | null>(null) // when TikTok is looked at again on its own (ms)
  const [now, setNow] = useState(() => Date.now())
  const autoRuns = useRef(0)
  const fakeTries = useRef<Partial<Record<P, number>>>({})
  const others = useRef<{ platform: string; url: string }[]>([]) // links that are not these three, kept as they are when the list is saved
  const urls = useRef<Partial<Record<P, string>>>({}) // the saved link of each account added here
  const onLinkedRef = useRef(onLinked)
  onLinkedRef.current = onLinked
  const onStatusRef = useRef(onStatus)
  onStatusRef.current = onStatus
  // one request at a time: the server keeps all of a person's codes in one record, and saving links replaces the whole list
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const enqueue = <T,>(fn: () => Promise<T>) => {
    const next = queue.current.then(fn, fn)
    queue.current = next.catch(() => null)
    return next
  }
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const setRow = useCallback((p: P, r: Partial<Row>) => setRows((all) => ({ ...all, [p]: { ...all[p], ...r } })), [])
  const setError = (p: P, message?: string) => setErrors((e) => ({ ...e, [p]: message }))

  /** Saves the whole list of links (the server replaces it). Returns a message when it could not. */
  const putLinks = async (): Promise<string | null> => {
    if (preview) {
      await sleep(250)
      return null
    }
    const mine = ORDER.filter((p) => urls.current[p]).map((p) => ({ platform: p, url: urls.current[p] as string }))
    const res = await fetch('/api/me/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ links: [...others.current, ...mine] }) }).catch(() => null)
    if (!res?.ok) return ((await res?.json().catch(() => ({}))) as { error?: string })?.error ?? 'Could not save that. Please try again.'
    return null
  }

  /** Asks the server for this account's code (the same one again while it is still good). */
  const begin = (p: P) =>
    enqueue(async () => {
      try {
        const j = await post('start', p)
        if (alive.current && j.account) setRow(p, rowFromState(j.account))
      } catch (e) {
        if (alive.current) setRow(p, { phase: 'error', message: e instanceof Error ? e.message : 'Could not get a code. Please try again.' })
      }
    })

  // Where each account stands when the step opens (it may be open again after going back).
  useEffect(() => {
    if (preview) {
      setLoaded(true)
      return
    }
    let live = true
    void (async () => {
      const [pr, st] = await Promise.all([
        fetch('/api/me/profile', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null) as Promise<{ profile?: { links?: { platform: string; url: string }[] } } | null>,
        fetch('/api/me/accounts/verify', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null) as Promise<{ accounts?: State[] } | null>,
      ])
      if (!live) return
      const links = pr?.profile?.links ?? []
      others.current = links.filter((l) => !MINE.has(l.platform))
      for (const l of links) if (MINE.has(l.platform)) urls.current[l.platform as P] = l.url
      for (const s of st?.accounts ?? []) {
        if (!s.handle) continue
        setRow(s.platform, rowFromState(s))
        onLinkedRef.current(s.platform, s.handle)
        if (s.status === 'none') void begin(s.platform)
      }
      setLoaded(true)
    })()
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview])

  /** Puts the typed username on the profile, looks the account up, and gets its code. */
  const add = (p: P) => {
    const built = buildLink(p, drafts[p])
    if ('error' in built) return setError(p, built.error)
    setError(p, undefined)
    urls.current[p] = built.url
    setRow(p, { phase: 'adding', handle: bare(usernameOf(p, built.url)), code: '', profileUrl: '', message: '' })
    return enqueue(async () => {
      const fail = (message: string) => {
        delete urls.current[p]
        if (!alive.current) return
        setRow(p, blank)
        setError(p, message)
      }
      try {
        const problem = await putLinks()
        if (problem) return fail(problem)
        let state: State | undefined
        if (preview) {
          await sleep(650)
          const handle = bare(usernameOf(p, built.url))
          state = { platform: p, handle, status: 'code', code: `logoless-${{ tiktok: 'K7QX2M', youtube: 'R4HN8P', instagram: 'W2ZD6T' }[p]}`, profileUrl: '', note: undefined }
        } else {
          const found = (await post('lookup', p)).lookup
          if (found?.status === 'missing') {
            delete urls.current[p]
            await putLinks()
            return fail(found.message ?? 'We could not find that account. Check the username.')
          }
          state = (await post('start', p)).account
        }
        if (!state) return fail('Could not start that. Please try again.')
        if (!alive.current) return
        setRow(p, rowFromState(state))
        onLinkedRef.current(p, state.handle || bare(usernameOf(p, built.url)))
      } catch (e) {
        fail(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      }
    })
  }

  /** Takes the account off again (it was typed wrong, or is not wanted). */
  const remove = (p: P) => {
    setRow(p, blank)
    setDrafts((d) => ({ ...d, [p]: '' }))
    setError(p, undefined)
    if (p === 'tiktok') setNextAuto(null)
    delete urls.current[p]
    onLinkedRef.current(p, null)
    return enqueue(async () => {
      await putLinks()
    })
  }

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
          await sleep(700)
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
        if (preview) await sleep(500)
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

  // what the step is waiting for, for the button under it
  useEffect(() => {
    const phases = ORDER.map((p) => rows[p].phase)
    onStatusRef.current({ added: phases.filter((x) => x !== 'empty').length, settled: phases.filter((x) => x === 'verified' || x === 'waiting').length, loaded })
  }, [rows, loaded])

  const secondsLeft = nextAuto === null ? null : Math.max(0, Math.ceil((nextAuto - now) / 1000))
  const ease = [0.2, 0.8, 0.2, 1] as const

  return (
    <ul className="grid w-full max-w-md gap-3 text-left">
      {ORDER.map((p) => {
        const r = rows[p]
        const added = r.phase !== 'empty'
        const open = r.phase === 'ready' || r.phase === 'checking' || r.phase === 'not-found' || r.phase === 'unreadable' || r.phase === 'error'
        const busy = r.phase === 'checking' || r.phase === 'adding'
        const tried = r.phase === 'not-found' || r.phase === 'unreadable'
        const waitingOnAuto = p === 'tiktok' && secondsLeft !== null
        const canAsk = Boolean(r.code) && (p === 'instagram' || r.phase === 'unreadable' || (r.phase === 'not-found' && !waitingOnAuto))
        const prefix = USERNAME_LINKS[p].label
        return (
          <li
            key={p}
            className={cn(
              'overflow-hidden rounded-card border bg-white/[0.02] transition-[border-color,box-shadow,background-color] duration-300',
              r.phase === 'verified' ? 'border-[rgb(46_208_176/0.45)] bg-[rgb(46_208_176/0.04)]' : 'border-line-strong focus-within:border-[rgb(255_70_90/0.6)] focus-within:shadow-[0_0_0_3px_rgb(255_31_56/0.1)]',
            )}
          >
            <div className="flex min-h-16 items-center gap-3 px-3.5 py-2.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-tile border border-line bg-white/[0.04]">
                <BrandIcon name={p} className="size-5" />
              </span>
              {added ? (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] leading-tight">@{r.handle}</span>
                    <span className="mt-1 block font-mono text-[10px] leading-none tracking-[0.14em] text-mute uppercase">{LABEL[p]}</span>
                  </span>
                  <Pill phase={r.phase} platform={p} />
                  <button type="button" onClick={() => void remove(p)} disabled={r.phase === 'adding'} aria-label={`Remove ${LABEL[p]}`} className="grid size-8 shrink-0 place-items-center rounded-tile text-mute transition-colors hover:bg-white/[0.07] hover:text-paper disabled:opacity-30">
                    <X className="size-4" />
                  </button>
                </>
              ) : (
                <form
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void add(p)
                  }}
                >
                  <label className="flex min-w-0 flex-1 items-center">
                    <span className="sr-only">{LABEL[p]} username</span>
                    <span aria-hidden="true" className="mr-px shrink-0 text-[13px] text-mute max-sm:hidden">{prefix}</span>
                    <span aria-hidden="true" className="mr-px shrink-0 text-[15px] text-mute sm:hidden">{p === 'instagram' ? '' : '@'}</span>
                    <input
                      value={drafts[p]}
                      onChange={(e) => {
                        setDrafts((d) => ({ ...d, [p]: e.target.value.replace(/\s/g, '').slice(0, 80) }))
                        if (errors[p]) setError(p, undefined)
                      }}
                      placeholder={LABEL[p]}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      disabled={!loaded}
                      className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-mute/60"
                    />
                  </label>
                  <button type="submit" disabled={!drafts[p].trim() || !loaded} aria-label={`Add ${LABEL[p]}`} className="grid size-9 shrink-0 place-items-center rounded-tile border border-line-strong text-mute transition-[background-color,color,border-color,opacity] duration-300 hover:border-paper hover:bg-paper hover:text-ink disabled:pointer-events-none disabled:opacity-30">
                    <ArrowRight className="size-4" />
                  </button>
                </form>
              )}
            </div>

            {errors[p] && !added && (
              <p role="alert" className="-mt-1 px-4 pb-3 text-[13px] text-[var(--red,#ef4444)]">
                {errors[p]}
              </p>
            )}

            <AnimatePresence initial={false}>
              {open && (
                <motion.div key="proof" initial={reduced ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={reduced ? undefined : { height: 0, opacity: 0 }} transition={{ duration: reduced ? 0 : 0.34, ease }} className="overflow-hidden">
                  <div className="border-t border-line px-4 pt-4 pb-4">
                    <p className="font-mono text-[10px] leading-none tracking-[0.14em] text-mute uppercase">Put this code in your {p === 'youtube' ? 'description' : 'bio'}</p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate rounded-tile border border-line-strong bg-black/40 px-4 py-2.5 text-center font-mono text-[15px] tracking-wide select-all">{r.code || '…'}</span>
                      <button type="button" onClick={() => void copy(p, r.code)} disabled={!r.code} aria-label={`Copy the ${LABEL[p]} code`} className="grid size-11 shrink-0 place-items-center rounded-tile border border-line-strong transition-colors hover:bg-paper/[0.07] disabled:opacity-40">
                        {copied === p ? <Check className="size-4 text-[var(--teal,#2ed0b0)]" /> : <Copy className="size-4" />}
                      </button>
                    </div>
                    <p className="mt-3 text-[13px] leading-relaxed text-mute">{WHERE[p]}</p>
                    {p === 'tiktok' && !tried && <p className="mt-2 text-[13px] leading-relaxed text-mute/75">{TIKTOK_SLOW}</p>}
                    {p === 'instagram' && !tried && <p className="mt-2 text-[13px] leading-relaxed text-mute/75">Instagram does not let websites read profiles, so once the code is in your bio, ask the team to check it. You can try the check first.</p>}

                    {r.message && (
                      <p role="alert" className={cn('mt-3 text-[13px] leading-relaxed', r.phase === 'error' ? 'text-[var(--red,#ef4444)]' : r.phase === 'not-found' ? 'text-amber-300' : 'text-paper/80')}>
                        {r.message}
                        {r.phase === 'unreadable' && r.code ? ' If the code is in your bio, ask the team to check it by hand.' : ''}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => void (r.code ? check(p) : begin(p))} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-pill bg-paper px-5 text-[14px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40">
                        {r.phase === 'checking' && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
                        {!r.code ? 'Get a code' : tried ? 'Check again' : 'Check my bio'}
                      </button>
                      {canAsk && (
                        <button type="button" onClick={() => void ask(p)} disabled={busy} className="inline-flex h-10 items-center rounded-pill border border-line-strong px-5 text-[14px] transition-colors hover:bg-paper/10 disabled:opacity-40">
                          Ask the team
                        </button>
                      )}
                      {r.profileUrl && (
                        <a href={r.profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 px-2 text-[13px] text-mute transition-colors hover:text-paper">
                          Open {LABEL[p]} <ExternalLink aria-hidden="true" className="size-3.5" />
                        </a>
                      )}
                    </div>
                    {waitingOnAuto && r.phase !== 'checking' && (
                      <p role="status" aria-live="polite" className="mt-3 text-[13px] text-mute">
                        Checking again on its own in {secondsLeft}s
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
              {r.phase === 'waiting' && (
                <motion.div key="waiting" initial={reduced ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={reduced ? undefined : { height: 0, opacity: 0 }} transition={{ duration: reduced ? 0 : 0.34, ease }} className="overflow-hidden">
                  <p className="border-t border-line px-4 py-3.5 text-[13px] leading-relaxed text-mute">
                    Someone on the team will look at your bio and you will get a notification. Leave <span className="font-mono text-paper">{r.code}</span> in it until then.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        )
      })}
    </ul>
  )
}

/** The state of an account at the right of its row. */
function Pill({ phase, platform }: { phase: Phase; platform: P }) {
  const base = 'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-pill px-2.5 font-mono text-[10px] leading-none tracking-[0.12em] uppercase'
  if (phase === 'verified')
    return (
      <span className={cn(base, 'bg-[rgb(46_208_176/0.14)] text-[var(--teal,#2ed0b0)]')}>
        <Check aria-hidden="true" className="size-3" strokeWidth={3} /> Verified
      </span>
    )
  if (phase === 'adding' || phase === 'checking')
    return (
      <span className={cn(base, 'text-mute')}>
        <Loader2 aria-hidden="true" className="size-3 animate-spin" /> {phase === 'adding' ? 'Looking' : 'Checking'}
      </span>
    )
  if (phase === 'waiting') return <span className={cn(base, 'border border-line-strong text-mute')}>With the team</span>
  if (phase === 'not-found') return <span className={cn(base, 'bg-amber-400/15 text-amber-200')}>Not found yet</span>
  if (phase === 'unreadable') return <span className={cn(base, 'border border-line-strong text-paper/80')}>{platform === 'instagram' ? 'Ask the team' : 'Cannot read'}</span>
  if (phase === 'error') return <span className={cn(base, 'bg-red-500/15 text-red-300')}>Not checked</span>
  return <span className={cn(base, 'border border-line-strong text-mute')}>Add the code</span>
}
