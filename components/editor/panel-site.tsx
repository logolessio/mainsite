'use client'

import { Check, Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { PagesBar } from './pages-bar'
import { ShareCard } from './share-card'
import type { EditorApi } from './types'
import { Btn, Group } from './ui'

/** The extra pages of the site (About, Work ...): add, rename, address, order, remove. The links of a page are edited on the Links page. */
export function PagesPanel({ api, go }: { api: EditorApi; go: () => void }) {
  return (
    <div className="ed-sections">
      <Group title="Your pages" hint="Add pages like About or Work and your site gets a menu along the top. Each page has its own address and its own links, and shares your look.">
        <PagesBar api={api} />
        {api.cfg.pages && api.cfg.pages.length > 0 && (
          <Btn onClick={go}>Add links to {api.cfg.pages.find((p) => p.id === api.page)?.title ?? 'Home'}</Btn>
        )}
      </Group>
    </div>
  )
}

/** The link to your page, and a code to put anywhere. */
export function SharePanel({ api }: { api: EditorApi }) {
  const { profile } = api
  const url = `logoless.io/${profile.handle}`
  const [copied, setCopied] = useState(false)
  return (
    <div className="ed-sections">
      <Group title="Your link" hint="Put it in a bio, a video description or a message.">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mono min-w-0 flex-1 truncate rounded-xl border border-[var(--ed-line)] px-3.5 py-2.5 text-[0.86rem]">{url}</span>
          <Btn
            onClick={() => {
              void navigator.clipboard?.writeText(`https://${url}`)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1400)
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? 'Copied' : 'Copy'}
          </Btn>
          <a href={`/${profile.handle}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--ed-line2)] px-4 text-[0.8rem] hover:bg-white/10">
            <ExternalLink className="size-4" /> Open
          </a>
        </div>
      </Group>
      <Group title="QR code" hint="Scan it with a phone to open your page. Download it to print or post.">{profile.handle && <ShareCard handle={profile.handle} />}</Group>
    </div>
  )
}
