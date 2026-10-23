'use client'

import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Globe, Pencil } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { IntroLogo } from '@/components/logo-intro'
import { RingButton } from '@/components/prelaunch/ring'
import { GradientField } from '@/components/shell/gradient-field'
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
const STOCK_TEXT = 'Reserve your username and we will email you the moment the doors open.'

function accentVars(hex: string) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex) ?? ['', 'f3', 'f2', 'ee']
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16))
  // dark text on a light accent, light text on a dark one
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return { '--acc': hex, '--acc-rgb': `${r} ${g} ${b}`, '--on-acc': lum > 0.6 ? '#000' : '#fff' } as React.CSSProperties
}

/** The corners of the buttons, from the page's Shape choice. */
const SHAPE = { pill: 'rounded-pill', round: 'rounded-panel', square: 'rounded-chip' } as const
/** The headline and the buttons, from the page's Size choice. */
const HEAD = {
  small: { links: 'text-[clamp(1.7rem,6vw,2.3rem)]', full: 'text-[clamp(2rem,5vw,3.6rem)]', row: 'h-12 text-[15px]', cta: 'h-12 text-[15px]' },
  medium: { links: 'text-[clamp(2.1rem,7vw,3.1rem)]', full: 'text-[clamp(2.5rem,6.4vw,5rem)]', row: 'h-14 text-[16px]', cta: 'h-14 text-[16px]' },
  large: { links: 'text-[clamp(2.6rem,8.5vw,3.8rem)]', full: 'text-[clamp(3rem,7.6vw,6.2rem)]', row: 'h-16 text-[17px]', cta: 'h-16 text-[17px]' },
} as const

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
  const socials = draft.items.filter((l) => l.footer)
  const buttons = draft.items.filter((l) => l.page)
  const onOver = useCallback(() => setOpened(true), [])
  // while the site is closed the one thing to do is join the Discord (the owner's Discord link under Socials and links); without one the waitlist stays
  const discord = soon ? draft.items.find((l) => l.platform === 'discord' && /^https:\/\//.test(l.url)) : undefined
  // the stock line talks about reserving a username (the waitlist); with the Discord button in its place it says what the button is for. Words the owner wrote themselves are never touched.
  const text = soon ? (discord && draft.text === STOCK_TEXT ? 'Join the Discord to be first in the moment the doors open.' : draft.text) : copy.liveText

  // the device cookie for the one-spot-per-device check (marked as the owner's here when the owner is signed in)
  useEffect(() => {
    if (soon && !discord) void fetch('/api/launch/waitlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ step: 'hello' }) }).catch(() => undefined)
  }, [soon, discord])

  const left = look.align === 'left'
  const shape = SHAPE[look.shape]
  const size = HEAD[look.size]
  const cta = cn('group relative inline-flex w-full items-center justify-center gap-2.5 bg-[var(--acc)] px-8 font-medium text-[var(--on-acc)] transition-[background-color,transform] duration-300 hover:bg-[color-mix(in_srgb,var(--acc)_88%,transparent)] active:scale-[0.985]', shape, size.cta)
  const rowStyle = {
    outline: 'border border-white/15 hover:border-white/35 hover:bg-white/[0.04]',
    solid: 'bg-paper text-ink hover:bg-paper/90',
    minimal: 'border border-transparent hover:bg-white/[0.06]',
  }[look.rows]

  const socialRow =
    !props.links && socials.length > 0 && look.socials !== 'off' ? (
      <ul aria-label="logoless elsewhere" className={cn('flex flex-wrap items-center', discord ? 'gap-2' : 'gap-1', left ? 'justify-start' : 'justify-center')}>
        {socials.map((l) => (
          <li key={l.id}>
            <a
              href={l.url}
              aria-label={l.label}
              title={l.label}
              {...(external(l.url) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className={cn('grid place-items-center rounded-full text-paper/60 transition-colors duration-300 hover:text-paper focus-visible:text-paper', discord ? 'size-12 hover:bg-white/[0.06]' : 'size-11')}
            >
              {l.platform === 'website' ? <Globe aria-hidden="true" className={discord ? 'size-6' : 'size-5'} /> : <BrandIcon name={l.platform} className={discord ? 'size-6' : 'size-5'} />}
            </a>
          </li>
        ))}
      </ul>
    ) : null

  return (
    // the closed site is drawn without the site's shell, so the reduced-motion setting is applied here too
    <MotionConfig reducedMotion="user">
    <div className={s.root} style={accentVars(look.accent)}>
      {/* the closed site is drawn outside the app shell, so it brings its own copy of the moving gradient; everywhere else the shell's shows through */}
      {props.locked && <GradientField />}
      <Backdrop look={look} />

      <main id="main" className={cn('relative z-10 mx-auto flex min-h-dvh w-full flex-col px-5 md:px-6', left ? 'items-start text-left' : 'items-center text-center', props.links ? 'max-w-[480px] pt-14 pb-10 md:pt-20' : 'max-w-[960px] justify-center pt-14 pb-7 md:pt-16')}>
        {look.logo && (
          <a href="/" aria-label="logoless" className={cn(s.rise, 'mb-8 block md:mb-10')}>
            <IntroLogo replay className="h-[clamp(46px,10vw,92px)]" />
          </a>
        )}

        {look.socials === 'top' && !discord && socialRow && <div className={cn(s.rise, '-mt-1 mb-6')} style={{ '--d': '0.1s' } as React.CSSProperties}>{socialRow}</div>}

        <div className={cn('flex w-full flex-col', left ? 'items-start' : 'items-center')}>
          <h1 key={headline} className={cn(s.rise, 'tracking-[-0.015em] text-balance', look.font === 'serif' ? 'font-display leading-[1.04]' : 'font-sans font-semibold leading-[1.08] tracking-[-0.03em]', props.links ? size.links : size.full)} style={{ '--d': '0.15s' } as React.CSSProperties}>
            {headline}
          </h1>
          {text && (
            <p key={text} className={cn(s.rise, 'mt-4 max-w-[34rem] text-[16px] leading-relaxed text-paper/60 text-pretty md:mt-5 md:text-[17px]')} style={{ '--d': '0.25s' } as React.CSSProperties}>
              {text}
            </p>
          )}
        </div>

        {props.links ? (
          <div className={cn(s.rise, 'mt-9 w-full')} style={{ '--d': '0.35s' } as React.CSSProperties}>
            {soon && draft.end && !opened && (
              <div className="mb-6">
                <Countdown end={draft.end} compact auto={props.auto} onOver={onOver} />
              </div>
            )}
            {discord ? (
              <RingButton href={discord.url} external>
                <BrandIcon name="discord" className="size-5" />
                Join Discord
              </RingButton>
            ) : (
              <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={cta}>
                {soon ? copy.joinLabel : copy.startTitle}
              </button>
            )}
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
              <ul className="mt-6 grid w-full grid-cols-[minmax(0,1fr)] gap-2.5">
                {buttons.map((l) => (
                  <li key={l.id} className="min-w-0">
                    <a
                      href={l.url}
                      {...(external(l.url) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className={cn('group flex items-center justify-center px-6 text-center transition-[background-color,border-color,transform] duration-300 active:scale-[0.985]', shape, size.row, rowStyle)}
                    >
                      <span className="min-w-0 truncate">{l.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : soon ? (
          <>
            {draft.end && !opened ? (
              <div className={cn(s.rise, 'mt-9 w-full md:mt-10')} style={{ '--d': '0.35s' } as React.CSSProperties}>
                <Countdown end={draft.end} auto={props.auto} onOver={onOver} />
              </div>
            ) : opened ? (
              <div className="mt-10">
                <Countdown end={draft.end ?? 0} auto={props.auto} />
              </div>
            ) : null}
            <div className={cn(s.rise, 'mt-8 w-full', discord ? 'max-w-[400px]' : 'max-w-[520px]', !draft.end && 'mt-10')} style={{ '--d': '0.45s' } as React.CSSProperties}>
              {discord ? (
                <RingButton href={discord.url} external>
                  <BrandIcon name="discord" className="size-5" />
                  Join Discord
                </RingButton>
              ) : (
                <Waitlist copy={copy} />
              )}
            </div>
          </>
        ) : (
          <div className={cn(s.rise, 'mt-10 w-full max-w-[440px]')} style={{ '--d': '0.35s' } as React.CSSProperties}>
            <GetStarted copy={copy} signedIn={Boolean(props.signedInAs)} />
          </div>
        )}

        {(look.socials === 'bottom' || (discord && look.socials !== 'off')) && socialRow && <div className={cn(s.rise, discord ? 'mt-8' : 'mt-10')} style={{ '--d': '0.5s' } as React.CSSProperties}>{socialRow}</div>}

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
