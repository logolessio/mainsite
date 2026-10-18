'use client'

import { Check } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { BioVerifyDialog } from '@/components/app/bio-verify-dialog'
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
export function VerifyAccounts({ linked, preview, onDone, buttonClass }: { linked: Record<string, string>; preview: boolean; onDone: () => void; buttonClass: string }) {
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
