'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

const tag = (s: string) => `#${s.toLowerCase().replace(/[^a-z0-9]+/g, '')}`

/** Three starting captions and a few tags for a clip, made from the campaign's own name. Copy one, then make it yours. */
export function CaptionKit({ title, creator, platforms }: { title: string; creator: string; platforms: string[] }) {
  const [done, setDone] = useState<number | null>(null)
  const tags = [...new Set([tag(creator), tag(title)].filter((t) => t.length > 3))]
  const line = tags.join(' ')
  const options = [
    `${title} by ${creator}. Obsessed with this one. ${line}`.trim(),
    `Which part of ${title} hits hardest for you? ${line}`.trim(),
    `I made this for ${creator}'s ${title}. Tell me if it works. ${line}`.trim(),
  ]
  const copy = async (i: number) => {
    try {
      await navigator.clipboard.writeText(options[i])
      setDone(i)
      window.setTimeout(() => setDone(null), 1600)
    } catch {
      /* copy blocked: they can select the text */
    }
  }
  return (
    <section aria-label="Caption ideas">
      <h2 className="border-b border-line pb-3 font-display text-2xl">Caption ideas</h2>
      <ul className="mt-5 grid gap-3">
        {options.map((o, i) => (
          <li key={o} className="flex items-center gap-4 rounded-panel border border-line px-4 py-3">
            <p className="min-w-0 flex-1 text-[15px] leading-snug">{o}</p>
            <button type="button" onClick={() => void copy(i)} aria-label="Copy this caption" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill border border-line-strong px-3.5 text-sm transition-colors hover:bg-white/[0.06]">
              {done === i ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />} {done === i ? 'Copied' : 'Copy'}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-mute">A starting point for {platforms.length > 1 ? 'any of the platforms' : 'your post'}. Write it in your own voice: it gets more views.</p>
    </section>
  )
}
