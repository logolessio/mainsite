'use client'

import { Check, FileDown, Globe, Link2, Mail } from 'lucide-react'
import { useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { BlockIcon } from '@/components/bio/bits'
import { type BioBlock, platformOf } from '@/lib/bio'
import { LINK_PLATFORMS, USERNAME_LINKS, buildLink, handleParts, usernameOf } from '@/lib/profile-style'
import { cn } from '@/lib/utils'

type Social = Extract<BioBlock, { t: 'social' }>
type LinkBlock = Extract<BioBlock, { t: 'link' }>

/** Every account we know, as the marks themselves. */
const ACCOUNTS: { id: string; label: string }[] = [...LINK_PLATFORMS.filter((p) => p.id !== 'website').map((p) => ({ id: p.id as string, label: p.label })), { id: 'mail', label: 'Email' }]

const tile = 'grid size-11 place-items-center rounded-xl border transition-[background,color,border-color,transform] duration-200 hover:-translate-y-px'

function Mark({ id, className }: { id: string; className?: string }) {
  if (id === 'mail') return <Mail aria-hidden="true" className={cn('size-5', className)} strokeWidth={1.6} />
  if (id === 'website') return <Globe aria-hidden="true" className={cn('size-5', className)} strokeWidth={1.6} />
  if (id === 'file') return <FileDown aria-hidden="true" className={cn('size-5', className)} strokeWidth={1.6} />
  if (id === 'link') return <Link2 aria-hidden="true" className={cn('size-5', className)} strokeWidth={1.6} />
  return <BrandIcon name={id} className={cn('size-5', className)} />
}

/** The username (or email) made into a full link. Also takes a pasted link and works out which account it is. */
function format(platform: string, raw: string): { url: string } | { error: string } {
  const v = raw.trim()
  if (!v) return { error: '' }
  if (platform === 'mail') {
    const m = v.replace(/^mailto:/i, '')
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m) ? { url: `mailto:${m}` } : { error: 'Type your email address.' }
  }
  return buildLink(platform, v)
}

/**
 * An account on the page (Instagram, TikTok, an email…): pick it by its logo, type only the username, and the full link is made as you type.
 */
export function SocialFields({ b, set }: { b: Social; set: (p: Record<string, unknown>) => void }) {
  const [draft, setDraft] = useState(() => (b.platform === 'mail' ? b.url.replace(/^mailto:/i, '') : usernameOf(b.platform, b.url)))
  const [touched, setTouched] = useState(false)
  const [pick, setPick] = useState(!b.url)
  const parts = handleParts(b.platform)
  const label = ACCOUNTS.find((a) => a.id === b.platform)?.label ?? b.platform
  const placeholder = b.platform === 'mail' ? 'you@email.com' : parts ? 'yourname' : 'Paste your link'

  const apply = (platform: string, raw: string) => {
    const r = format(platform, raw)
    set({ platform, url: 'url' in r ? r.url : '' })
    return r
  }
  const type = (raw: string) => {
    // the "@" (or "$") is already in front of the box, so a typed one is dropped
    const value = b.platform !== 'mail' && USERNAME_LINKS[b.platform] && !/[/:]/.test(raw) ? raw.replace(/^[@$]+/, '') : raw
    let platform = b.platform
    // a pasted link from another account switches to that account
    if (/[./]/.test(value) && b.platform !== 'mail') {
      const other = platformOf(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`)
      if (other && other !== platform && ACCOUNTS.some((a) => a.id === other)) platform = other
    }
    const r = apply(platform, value)
    // a pasted link shrinks to the username
    setDraft('url' in r && USERNAME_LINKS[platform] && /[./:]/.test(value) && value.includes('/') ? usernameOf(platform, r.url) : value)
  }
  const r = draft.trim() ? format(b.platform, draft) : null
  const shown = r && 'url' in r ? r.url.replace(/^(https?:\/\/|mailto:)/, '').replace(/\/$/, '') : ''

  return (
    <div className="space-y-3">
      {pick ? (
        <div role="radiogroup" aria-label="Which account" className="grid grid-cols-6 gap-1.5">
          {ACCOUNTS.map((a) => {
            const on = a.id === b.platform
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={a.label}
                title={a.label}
                onClick={() => {
                  setPick(false)
                  apply(a.id, draft)
                }}
                className={cn(tile, 'size-auto aspect-square', on ? 'border-transparent bg-[#ececec] text-[#0a0a0a]' : 'border-[var(--ed-line)] text-white/65 hover:border-white/30 hover:text-white')}
              >
                <Mark id={a.id} />
              </button>
            )
          })}
        </div>
      ) : (
        <button type="button" onClick={() => setPick(true)} className="flex h-11 w-full items-center gap-3 rounded-xl border border-[var(--ed-line)] bg-white/[0.03] px-3.5 text-left text-[0.84rem] transition-colors hover:border-white/30">
          <Mark id={b.platform} className="size-[1.15rem]" />
          <span className="flex-1">{label}</span>
          <span className="text-[0.74rem] text-white/45">Change</span>
        </button>
      )}
      <div className="flex h-11 items-center rounded-xl border border-[var(--ed-line)] bg-white/[0.03] transition-colors focus-within:border-white/40">
        {parts?.pre && <span className="shrink-0 pl-3.5 text-[0.8rem] text-white/40">{parts.pre}</span>}
        <input
          value={draft}
          placeholder={placeholder}
          aria-label={b.platform === 'mail' ? 'Email address' : parts ? `${label} username` : `${label} link`}
          inputMode={b.platform === 'mail' ? 'email' : 'text'}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => type(e.target.value)}
          onBlur={() => setTouched(true)}
          className={cn('h-full min-w-0 flex-1 bg-transparent text-[0.88rem] outline-none placeholder:text-white/25', parts?.pre ? 'px-1' : 'px-3.5')}
        />
        {parts?.post && <span className="shrink-0 pr-3.5 text-[0.8rem] text-white/40">{parts.post}</span>}
      </div>
      <p aria-live="polite" className="flex min-h-[1.1rem] items-center gap-1.5 text-[0.74rem] text-[var(--ed-mute)]">
        {r && 'url' in r ? (
          <>
            <Check className="size-3.5 shrink-0 text-white/70" /> <span className="truncate">{shown}</span>
          </>
        ) : r && touched ? (
          r.error
        ) : parts ? (
          'Just your username, no link needed.'
        ) : b.platform === 'mail' ? (
          'Opens an email to you.'
        ) : (
          'Paste the full link.'
        )}
      </p>
    </div>
  )
}

/** The mark on a link: found from the address by default, or picked from the real logos. */
export function IconPicker({ block, onChange }: { block: LinkBlock; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const auto = block.icon === 'auto'
  const options: { id: string; label: string }[] = [{ id: 'link', label: 'Link' }, { id: 'file', label: 'File' }, { id: 'website', label: 'Website' }, ...ACCOUNTS]
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex h-11 w-full items-center gap-3 rounded-xl border border-[var(--ed-line)] bg-white/[0.03] px-3.5 text-left text-[0.84rem] transition-colors hover:border-white/30">
        <BlockIcon block={block} className="size-[1.15rem]" />
        <span className="flex-1">{auto ? 'Icon: picked from the link' : `Icon: ${options.find((o) => o.id === block.icon)?.label ?? block.icon}`}</span>
        <span className="text-[0.74rem] text-white/45">{open ? 'Close' : 'Change'}</span>
      </button>
      {open && (
        <div role="radiogroup" aria-label="Icon" className="mt-2 grid grid-cols-6 gap-1.5">
          <button type="button" role="radio" aria-checked={auto} onClick={() => (onChange('auto'), setOpen(false))} className={cn(tile, 'size-auto aspect-square text-[0.7rem]', auto ? 'border-transparent bg-[#ececec] text-[#0a0a0a]' : 'border-[var(--ed-line)] text-white/65 hover:border-white/30 hover:text-white')}>
            Auto
          </button>
          {options.map((o) => {
            const on = block.icon === o.id
            return (
              <button key={o.id} type="button" role="radio" aria-checked={on} aria-label={o.label} title={o.label} onClick={() => (onChange(o.id), setOpen(false))} className={cn(tile, 'size-auto aspect-square', on ? 'border-transparent bg-[#ececec] text-[#0a0a0a]' : 'border-[var(--ed-line)] text-white/65 hover:border-white/30 hover:text-white')}>
                <Mark id={o.id} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
