'use client'

import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { ArrowUpRight, Globe, Pencil } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import type { PageConfig, PageMode } from '@/lib/launch-page'
import type { LinkItem } from '@/lib/socials'
import { cn } from '@/lib/utils'
import { Backdrop } from './backdrop'
import { Countdown } from './countdown'
import { GetStarted } from './get-started'
import s from './launch-home.module.css'
import { OwnerEditor, type Draft } from './owner-editor'
import { AutoHeight, Waitlist } from './waitlist'

const EASE = [0.22, 1, 0.36, 1] as const

function accentVars(hex: string) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex) ?? ['', 'f3', 'f2', 'ee']
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16))
  // dark text on a light accent, light text on a dark one
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return { '--acc': hex, '--acc-rgb': `${r} ${g} ${b}`, '--on-acc': lum > 0.6 ? '#000' : '#fff' } as React.CSSProperties
}

/** Each word of the headline rises on its own, a beat after the one before. Screen readers get the line whole. */
function Words({ text, delay }: { text: string; delay: number }) {
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(' ').map((w, i, all) => (
          <span key={`${i}-${w}`} className={s.word} style={{ '--i': i, '--d': `${delay}s` } as React.CSSProperties}>
            {w}
            {i < all.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </>
  )
}

const external = (url: string) => !/^https:\/\/(www\.)?logoless\.io(\/|$)/.test(url) && !url.startsWith('/')

export type LaunchHomeProps = {
  /** soon: the countdown and the waitlist. live: the Get started block. */
  mode: PageMode
  /** the /links page: the same page, with the sign-up behind a big button and the link buttons under it */
  links?: boolean
  headline: string
  text: string
  end: number | null
  page: PageConfig
  /** every link the owner keeps under Socials and links: `footer` ones are the icons, `page` ones the buttons on /links */
  items: LinkItem[]
  isOwner: boolean
  signedInAs: string | null
  /** the site opens by itself when the countdown ends */
  auto: boolean
  /** signed in, but not let past the coming-soon page */
  locked?: boolean
}

/**
 * The one page that is both the coming-soon screen and logoless.io/links. Top to bottom: the logo, the socials, the words, then
 * the countdown and the waitlist while the site is closed, or a Get started block once it is open. The owner edits it in place.
 */
export function LaunchHome(props: LaunchHomeProps) {
  const [draft, setDraft] = useState<Draft>({ headline: props.headline, text: props.text, end: props.end, page: props.page, items: props.items })
  const [mode, setMode] = useState<PageMode>(props.mode)
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(false) // /links: the sign-up or Get started block is opened by its button
  const [opened, setOpened] = useState(false) // the countdown reached zero while the page was open
  const { copy, look } = draft.page
  const soon = mode === 'soon'
  const headline = soon ? draft.headline : copy.liveHeadline
  const text = soon ? draft.text : copy.liveText
  const socials = draft.items.filter((l) => l.footer)
  const buttons = draft.items.filter((l) => l.page)
  const onOver = useCallback(() => setOpened(true), [])

  // the device cookie for the one-spot-per-device check (marked as the owner's here when the owner is signed in)
  useEffect(() => {
    if (soon) void fetch('/api/launch/waitlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ step: 'hello' }) }).catch(() => undefined)
  }, [soon])

  const cta = 'group relative inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-pill bg-[var(--acc)] px-8 text-[16px] font-medium text-[var(--on-acc)] shadow-[0_10px_40px_-12px_rgb(var(--acc-rgb)/0.55)] transition-[transform,filter] duration-300 hover:brightness-110 active:scale-[0.98]'

  return (
    // the closed site is drawn without the site's shell, so the reduced-motion setting is applied here too
    <MotionConfig reducedMotion="user">
    <div className={s.root} style={accentVars(look.accent)}>
      <Backdrop look={look} />

      <main id="main" className={cn('relative z-10 mx-auto flex min-h-dvh w-full flex-col items-center px-4 text-center md:px-6', props.links ? 'max-w-[520px] pt-14 pb-10 md:pt-20' : 'max-w-[960px] justify-center pt-14 pb-7 md:pt-16')}>
        <a href="/" aria-label="logoless" className="relative mb-6 block md:mb-7">
          <span className={s.logoHalo} aria-hidden="true" />
          <span className={cn(s.logo, 'block')} aria-hidden="true" />
        </a>

        {socials.length > 0 && (
          <ul aria-label="logoless elsewhere" className="flex flex-wrap items-center justify-center gap-2 md:gap-2.5">
            {socials.map((l, i) => (
              <li key={l.id} className={s.social} style={{ '--i': i } as React.CSSProperties}>
                <a
                  href={l.url}
                  aria-label={l.label}
                  title={l.label}
                  {...(external(l.url) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className={cn(s.glass, 'grid size-11 place-items-center rounded-full text-paper/75 transition-[transform,color,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-[rgb(var(--acc-rgb)/0.5)] hover:text-paper hover:shadow-[0_8px_26px_-8px_rgb(var(--acc-rgb)/0.5)] focus-visible:-translate-y-0.5 md:size-12')}
                >
                  {l.platform === 'website' ? <Globe aria-hidden="true" className="size-[18px]" /> : <BrandIcon name={l.platform} className="size-[18px]" />}
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className={cn('flex w-full flex-col items-center', props.links ? 'mt-9' : 'mt-9 md:mt-10')}>
          {soon && copy.kicker && (
            <p className={cn(s.rise, s.glass, 'mb-5 inline-flex items-center gap-2.5 rounded-pill px-3.5 py-1.5 text-[12.5px] font-medium tracking-[0.06em] text-paper/80')} style={{ '--d': '0.45s' } as React.CSSProperties}>
              <span className={s.dot} aria-hidden="true" />
              {copy.kicker}
            </p>
          )}
          <h1 key={headline} className={cn('font-display tracking-[-0.01em] text-balance', props.links ? 'text-[clamp(2.1rem,7vw,3.1rem)] leading-[1.04]' : 'text-[clamp(2.5rem,6.4vw,5rem)] leading-[1.02]')}>
            <Words text={headline} delay={0.5} />
          </h1>
          {text && (
            <p key={text} className={cn(s.rise, 'mt-4 max-w-[34rem] text-[16px] leading-relaxed text-paper/60 text-pretty md:mt-5 md:text-[17.5px]')} style={{ '--d': '0.7s' } as React.CSSProperties}>
              {text}
            </p>
          )}
        </div>

        {props.links ? (
          <div className={cn(s.rise, 'mt-8 w-full')} style={{ '--d': '0.85s' } as React.CSSProperties}>
            {soon && draft.end && !opened && (
              <div className="mb-5">
                <Countdown end={draft.end} compact auto={props.auto} onOver={onOver} />
              </div>
            )}
            <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={cta}>
              {soon ? copy.joinLabel : copy.startTitle}
              <ArrowUpRight aria-hidden="true" className={cn('size-5 transition-transform duration-500', open ? 'rotate-[135deg]' : 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5')} />
            </button>
            <AutoHeight>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div key="panel" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease: EASE }} className="pt-4">
                    {soon ? <Waitlist copy={copy} autoFocus /> : <GetStarted copy={copy} signedIn={Boolean(props.signedInAs)} />}
                  </motion.div>
                )}
              </AnimatePresence>
            </AutoHeight>

            {buttons.length > 0 && (
              <ul className="mt-7 grid w-full grid-cols-[minmax(0,1fr)] gap-2.5">
                {buttons.map((l, i) => (
                  <li key={l.id} className={cn(s.rise, 'min-w-0')} style={{ '--d': `${0.95 + i * 0.06}s` } as React.CSSProperties}>
                    <a
                      href={l.url}
                      {...(external(l.url) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className={cn(s.glass, s.sheen, 'group flex h-[60px] items-center gap-3.5 rounded-pill pr-5 pl-2.5 text-left transition-[transform,border-color] duration-300 hover:border-white/25 active:scale-[0.985]')}
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.07]">{l.platform === 'website' ? <Globe aria-hidden="true" className="size-[18px]" /> : <BrandIcon name={l.platform} className="size-[18px]" />}</span>
                      <span className="min-w-0 flex-1 truncate text-[16px]">{l.label}</span>
                      <ArrowUpRight aria-hidden="true" className="size-[18px] shrink-0 text-paper/40 transition-[transform,color] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-paper" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : soon ? (
          <>
            {draft.end && !opened ? (
              <div className={cn(s.rise, 'mt-8 w-full md:mt-9')} style={{ '--d': '0.8s' } as React.CSSProperties}>
                <Countdown end={draft.end} auto={props.auto} onOver={onOver} />
              </div>
            ) : opened ? (
              <div className="mt-10">
                <Countdown end={draft.end ?? 0} auto={props.auto} />
              </div>
            ) : null}
            <div className={cn(s.rise, 'mt-7 w-full max-w-[520px]', !draft.end && 'mt-10')} style={{ '--d': '0.95s' } as React.CSSProperties}>
              <Waitlist copy={copy} />
            </div>
          </>
        ) : (
          <div className={cn(s.rise, 'mt-10 w-full max-w-[440px]')} style={{ '--d': '0.8s' } as React.CSSProperties}>
            <GetStarted copy={copy} signedIn={Boolean(props.signedInAs)} />
          </div>
        )}

        {props.locked && props.signedInAs && (
          <p className="mt-10 max-w-sm text-[13.5px] leading-relaxed text-paper/40">
            You are signed in as {props.signedInAs}. The site is not open to everyone yet, so you will get in when it opens.{' '}
            <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="text-paper/70 underline underline-offset-4 hover:text-paper">
              Sign out
            </button>
          </p>
        )}

        <footer className={cn('flex items-center justify-center gap-5 text-[12.5px] text-paper/35', props.links ? 'mt-auto pt-14' : 'mt-14 md:mt-16')}>
          <a href="/legal/terms" className="transition-colors hover:text-paper/70">
            Terms
          </a>
          <a href="/legal/privacy" className="transition-colors hover:text-paper/70">
            Privacy
          </a>
          <span aria-hidden="true">·</span>
          <span>logoless.io</span>
        </footer>
      </main>

      {props.isOwner && (
        <>
          <AnimatePresence>
            {!editing && (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.35, ease: EASE }}
                onClick={() => setEditing(true)}
                className="fixed right-4 bottom-4 z-40 inline-flex h-11 items-center gap-2 rounded-pill border border-white/15 bg-black/70 px-4 text-[14px] font-medium text-paper backdrop-blur-xl transition-colors hover:border-white/30 md:right-6 md:bottom-6"
              >
                <Pencil className="size-4" aria-hidden="true" />
                Edit page
              </motion.button>
            )}
          </AnimatePresence>
          <OwnerEditor open={editing} onClose={() => setEditing(false)} draft={draft} setDraft={setDraft} mode={mode} setMode={setMode} initial={{ headline: props.headline, text: props.text, end: props.end, page: props.page, items: props.items }} />
        </>
      )}
    </div>
    </MotionConfig>
  )
}
