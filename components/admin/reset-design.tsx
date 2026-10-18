'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CHOICE_DEFAULTS } from '@/lib/design-choices'
import { toast } from '@/lib/toast'

// the standard look: how the site was before anything here was changed
const STANDARD: [string, string][] = [
  ['design_roundness', '100'],
  ['design_font', 'inter'],
  ['design_cover_border', '0'],
  ['design_cover_bar', '0'],
  ['design_scroll_effects', '0'],
  ['design_liquid_loader', '0'],
  ['bg_dots', '0'],
  ...Object.entries(CHOICE_DEFAULTS),
]

/** One button that puts every design choice back to the standard look. Asks first. */
export function ResetDesign() {
  const router = useRouter()
  const [ask, setAsk] = useState(false)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    let failed = false
    for (const [key, value] of STANDARD) {
      const res = await fetch('/api/dev/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key, value }) }).catch(() => null)
      if (!res?.ok) failed = true
    }
    setBusy(false)
    setAsk(false)
    if (failed) return toast.error('Some choices could not be reset. Try again.')
    toast.ok('Back to the standard look')
    window.location.reload() // the page colours, font and corners are set on the whole document, so start it fresh
    router.refresh()
  }

  return ask ? (
    <div role="group" aria-label="Confirm" className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-mute">Put the corners, font and every switch back to how they were at the start?</span>
      <button type="button" onClick={run} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-pill bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-50">
        {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} Yes, reset
      </button>
      <button type="button" onClick={() => setAsk(false)} disabled={busy} className="inline-flex h-10 items-center rounded-pill border border-line-strong px-5 text-sm transition-colors hover:bg-white/[0.06]">
        Keep what I have
      </button>
    </div>
  ) : (
    <button type="button" onClick={() => setAsk(true)} className="inline-flex h-10 items-center rounded-pill border border-line-strong px-5 text-sm text-paper/80 transition-colors hover:bg-white/[0.06] hover:text-paper">
      Back to the standard look
    </button>
  )
}
