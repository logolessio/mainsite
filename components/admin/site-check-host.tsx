'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, CloudCog, Loader2, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { checkSite, SITE_CHECK_EVENT, type SiteCheckResult } from '@/lib/site-check-client'
import { cn } from '@/lib/utils'

/** After something important (money, roles, pushes), asks Cloudflare's edge whether every address still answers, and says so in the corner. */
export function SiteCheckHost() {
  const [state, setState] = useState<{ label: string; result: SiteCheckResult | null } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const on = async (e: Event) => {
      const label = (e as CustomEvent<{ label: string }>).detail.label
      if (timer.current) clearTimeout(timer.current)
      setState({ label, result: null })
      const result = await checkSite(label)
      setState({ label, result })
      timer.current = setTimeout(() => setState(null), result.ok ? 7000 : 20000)
    }
    window.addEventListener(SITE_CHECK_EVENT, on)
    return () => window.removeEventListener(SITE_CHECK_EVENT, on)
  }, [])

  const r = state?.result
  return (
    <AnimatePresence>
      {state && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          role="status"
          className="fixed bottom-20 left-4 z-[160] w-[min(22rem,calc(100vw-2rem))] rounded-[1.4rem] border border-line-strong bg-ink/95 p-4 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.95)] backdrop-blur"
        >
          <div className="flex items-center gap-2 text-sm">
            {!r ? <Loader2 className="size-4 animate-spin" /> : r.ok ? <CheckCircle2 className="size-4 text-emerald-300" /> : <XCircle className="size-4 text-signal" />}
            <CloudCog className="size-4 text-mute" aria-hidden="true" />
            <span className="font-medium">{!r ? 'Checking Cloudflare' : r.ok ? 'Cloudflare check passed' : 'Cloudflare check found a problem'}</span>
          </div>
          <p className="mt-1 text-xs text-mute">After: {state.label}</p>
          {r && (
            <ul className="mt-3 grid gap-1 font-mono text-[11px]">
              {r.hosts.map((h) => (
                <li key={h.host} className={cn('flex justify-between gap-3', h.ok ? 'text-paper/80' : 'text-signal')}>
                  <span>{h.host}</span>
                  <span>{h.note ?? `${h.status} · ${h.ms}ms`}</span>
                </li>
              ))}
              <li className={cn('flex justify-between gap-3', r.database ? 'text-paper/80' : 'text-signal')}>
                <span>database</span>
                <span>{r.database ? 'ok' : 'not answering'}</span>
              </li>
            </ul>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
