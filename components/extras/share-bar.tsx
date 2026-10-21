'use client'

import { Check, Link2, Mail, Share2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const chip = 'inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm transition-colors hover:bg-white/[0.06]'

/** Share a campaign: the system share sheet when there is one, otherwise copy the link, post it, or send it. The link carries a picture card when the page is shared. */
export function ShareBar({ id, title, creator }: { id: string; title: string; creator: string }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window === 'undefined' ? `https://logoless.io/campaign/${id}` : `${window.location.origin}/campaign/${id}`
  const text = `${title} by ${creator}: get paid for every 1,000 views of your clips on logoless.`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* the browser refused: the other buttons still work */
    }
  }
  const native = typeof navigator !== 'undefined' && 'share' in navigator
  return (
    <section aria-label="Share this campaign" className="flex flex-wrap items-center gap-2">
      <p className="mr-2 text-sm text-mute">Know someone who should clip this?</p>
      {native && (
        <button type="button" onClick={() => void navigator.share({ title, text, url }).catch(() => {})} className={chip}>
          <Share2 aria-hidden="true" className="size-4" /> Share
        </button>
      )}
      <button type="button" onClick={() => void copy()} className={cn(chip, copied && 'border-paper')}>
        {copied ? <Check aria-hidden="true" className="size-4" /> : <Link2 aria-hidden="true" className="size-4" />} {copied ? 'Copied' : 'Copy link'}
      </button>
      <a href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className={chip}>
        Post on X
      </a>
      <a href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer" className={chip}>
        WhatsApp
      </a>
      <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`} className={chip}>
        <Mail aria-hidden="true" className="size-4" /> Email
      </a>
    </section>
  )
}
