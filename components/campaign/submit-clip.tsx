'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Check, Link2 } from 'lucide-react'
import { useId, useState } from 'react'
import { BrandIcon, PLATFORM_LABEL } from '@/components/brand-icon'
import type { Campaign, Platform } from '@/lib/campaigns'
import { TransitionLink } from '@/components/shell/transition-link'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

const HOSTS: Record<Platform, RegExp> = {
  tiktok: /(^|\.)tiktok\.com$/,
  youtube: /(^|\.)(youtube\.com|youtu\.be)$/,
  instagram: /(^|\.)instagram\.com$/,
}

export function SubmitClip({ campaign }: { campaign: Campaign }) {
  const id = useId()
  const [platform, setPlatform] = useState<Platform>(campaign.platforms[0])
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    let host = ''
    try {
      host = new URL(url.trim()).hostname
    } catch {
      return setError('Paste the full link to your post, starting with https://')
    }
    if (!HOSTS[platform].test(host)) {
      return setError(`That doesn’t look like a ${PLATFORM_LABEL[platform]} link.`)
    }
    setError(null)
    setSent(true)
  }

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-[22px] bg-white/[0.035] p-4">
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            role="status"
            className="flex items-center gap-3 py-1"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-paper text-ink">
              <Check aria-hidden="true" className="size-4" />
            </span>
            <p id={`${id}-title`} className="flex-1 text-sm leading-snug">
              <span className="font-medium">Clip received.</span>{' '}
              <span className="text-mute">We will check it against the brief. Approved clips start earning.</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false)
                setUrl('')
              }}
              className="shrink-0 text-xs underline underline-offset-4 hover:text-mute"
            >
              Another
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} noValidate initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id={`${id}-title`} className="font-mono text-[11px] tracking-widest text-mute uppercase">
                Submit a clip
              </h2>
              <fieldset className="flex gap-1">
                <legend className="sr-only">Platform</legend>
                {campaign.platforms.map((p) => (
                  <label
                    key={p}
                    title={PLATFORM_LABEL[p]}
                    className={cn(
                      'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-paper',
                      platform === p ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper',
                    )}
                  >
                    <input
                      type="radio"
                      name={`${id}-platform`}
                      value={p}
                      checked={platform === p}
                      onChange={() => setPlatform(p)}
                      className="sr-only"
                    />
                    <BrandIcon name={p} className="size-3.5" />
                    <span className="hidden sm:inline">{PLATFORM_LABEL[p]}</span>
                  </label>
                ))}
              </fieldset>
            </div>

            <div className="mt-3 flex gap-2">
              <label htmlFor={`${id}-url`} className="sr-only">
                Link to your post
              </label>
              <div
                className={cn(
                  'flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-line-strong bg-ink/60 px-4 focus-within:border-paper/50',
                  error && 'border-signal/70',
                )}
              >
                <Link2 aria-hidden="true" className="size-3.5 shrink-0 text-mute" />
                <input
                  id={`${id}-url`}
                  type="url"
                  inputMode="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={`Link to your ${PLATFORM_LABEL[platform]} post`}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${id}-error` : undefined}
                  className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-mute focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85"
              >
                Submit
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </button>
            </div>
            {error && (
              <p id={`${id}-error`} className="mt-2 text-center text-xs text-signal">
                {error}
              </p>
            )}
            <p className="mt-2.5 text-center text-[11px] text-mute">
              Post from an account you have verified.{' '}
              <TransitionLink href="/dashboard/accounts" className="underline underline-offset-4 hover:text-paper">
                Link an account
              </TransitionLink>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  )
}
