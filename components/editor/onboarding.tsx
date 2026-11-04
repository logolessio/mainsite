'use client'

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Loader2, Plus, Upload, X } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { CREAM, HARD, INK, JACKAL, MeshField, Mountains, Pixels, SpeckFilter, Win } from '@/components/art/game'
import { BioPage } from '@/components/bio/bio-page'
import type { BioPageData } from '@/components/bio/context'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { type BioBlock, LAYOUTS, PRESETS, applyPreset, cleanUrl, newId, starterBlocks } from '@/lib/bio'
import { uploadImage } from '@/lib/image-client'
import { USERNAME_LINKS } from '@/lib/profile-style'
import { cn } from '@/lib/utils'
import type { EditorApi } from './types'

/**
 * The first-run tour. A full screen in the look of the home page (colour fields, a pixel guide, square windows) with the real page in a phone that
 * changes as each choice is made: who you are, what to link, the layout, the look. The last screen saves it and hands over the link.
 */
const STEPS = [
  { id: 'start', name: 'press start', line: "hi. i'll walk you through it. about a minute, and every bit of it can change later." },
  { id: 'you', name: 'who you are', line: 'a name and one line is plenty. a picture helps people trust the link.' },
  { id: 'links', name: 'what to open', line: 'add what people should open. a few is enough, you can add more any time.' },
  { id: 'layout', name: 'the layout', line: 'ten layouts. tap one and watch the phone.' },
  { id: 'look', name: 'the look', line: 'pick a look. every part of it can be tuned afterwards.' },
  { id: 'done', name: 'you are live', line: 'that is it. your page is live. now put the link in your bio.' },
] as const

const SOCIALS = ['instagram', 'tiktok', 'youtube', 'x', 'discord'] as const
const COLORS = ['#5fd1b6', '#2b4fa3', '#f19b78', '#ec5a4f', CREAM]
const pad = (n: number) => String(n).padStart(2, '0')

const field = 'w-full rounded-none border border-[#0c1544]/40 bg-white/60 px-3 text-[0.86rem] text-[#0c1544] outline-none transition-colors placeholder:text-[#0c1544]/35 focus:border-[#0c1544] focus:bg-white'

function titleFor(url: string) {
  try {
    const h = new URL(cleanUrl(url)).hostname.replace(/^www\./, '').split('.')[0]
    return h ? h[0].toUpperCase() + h.slice(1) : ''
  } catch {
    return ''
  }
}

/** The guide's line, typed out a letter at a time. */
function useTyped(text: string, reduced: boolean) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    if (reduced) return setShown(text)
    setShown('')
    let i = 0
    const id = window.setInterval(() => {
      i++
      setShown(text.slice(0, i))
      if (i >= text.length) window.clearInterval(id)
    }, 20)
    return () => window.clearInterval(id)
  }, [text, reduced])
  return shown
}

type Row = { id: string; title: string; url: string }

export function Onboarding({ api, data, fresh, onFinish, onDone, onSkip }: { api: EditorApi; data: BioPageData; fresh: boolean; onFinish: () => Promise<boolean>; onDone: () => void; onSkip: () => void }) {
  const { cfg, set, profile, setProfile, toast } = api
  const { reduced } = useMotionPrefs()
  const [step, setStep] = useState(0)
  const id = STEPS[step].id
  const [dir, setDir] = useState(1)
  const [saving, setSaving] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const url = `logoless.io/${profile.handle}`

  // the links: the ones on the page (a brand-new page starts with made-up examples, which are not kept)
  const [rows, setRows] = useState<Row[]>(() => {
    const own = fresh ? [] : cfg.blocks.filter((b): b is Extract<BioBlock, { t: 'link' }> => b.t === 'link').map((b) => ({ id: b.id, title: b.title, url: b.url }))
    const base = own.length ? own : [{ id: newId(), title: '', url: '' }]
    return base.length < 2 ? [...base, { id: newId(), title: '', url: '' }] : base
  })
  const [soc, setSoc] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {}
    if (!fresh) for (const b of cfg.blocks) if (b.t === 'social') o[b.platform] = b.url
    return o
  })
  const [openSoc, setOpenSoc] = useState<string | null>(null)
  const [look, setLook] = useState<string | null>(null)

  const built = useMemo<BioBlock[]>(() => {
    const links: BioBlock[] = rows.flatMap((r): BioBlock[] => {
      const u = cleanUrl(r.url)
      return u ? [{ id: r.id, t: 'link', title: r.title.trim() || titleFor(u) || 'Link', url: u, icon: 'auto', note: '', hidden: false, pin: false }] : []
    })
    const socials: BioBlock[] = Object.entries(soc).flatMap(([platform, v]): BioBlock[] => {
      const t = v.trim().replace(/^@/, '')
      if (!t) return []
      const tpl = USERNAME_LINKS[platform]?.tpl
      const u = cleanUrl(/[./]/.test(t) || !tpl ? t : tpl.replace('{u}', t))
      return u ? [{ id: `s${platform}`.slice(0, 16), t: 'social', platform, url: u, hidden: false }] : []
    })
    return [...links, ...socials]
  }, [rows, soc])

  // what is typed goes onto the page as it is typed (the made-up examples stay until something real is added)
  useEffect(() => {
    if (step < 2) return
    set((c) => ({ ...c, blocks: [...built, ...c.blocks.filter((b) => b.t !== 'link' && b.t !== 'social')] }))
  }, [built, set, step])

  // the phone shows the real page; while there are no real links yet, the examples fill it in
  const live = useMemo<BioPageData>(() => {
    const empty = data.config.blocks.filter((b) => b.t !== 'link' && b.t !== 'social').length + built.length === 0
    return empty && id !== 'done' ? { ...data, config: { ...data.config, blocks: starterBlocks() } } : data
  }, [data, built.length, id])

  const go = (n: number) => {
    const to = Math.max(0, Math.min(STEPS.length - 1, n))
    if (to === step) return
    setDir(to > step ? 1 : -1)
    setStep(to)
  }
  const next = () => {
    if (step === 1 && !profile.name.trim()) setProfile({ name: profile.handle })
    go(step + 1)
  }
  // the last screen saves the page and tells you when it is safe
  useEffect(() => {
    if (id !== 'done' || saving === 'saving' || saving === 'ok') return
    set((c) => ({ ...c, blocks: [...built, ...c.blocks.filter((b) => b.t !== 'link' && b.t !== 'social')] }))
    setSaving('saving')
    const t = window.setTimeout(() => {
      void onFinish().then((ok) => setSaving(ok ? 'ok' : 'error'))
    }, 60)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Enter goes on (when not typing a paragraph)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey || (e.target instanceof HTMLTextAreaElement)) return
      if (id === 'done') return
      e.preventDefault()
      next()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  const upload = async (f: File | undefined) => {
    if (!f) return
    setBusy(true)
    try {
      const up = await uploadImage('avatar', f)
      setProfile({ newAvatar: up, hasAvatar: true, avatar: `/api/img/${up}` })
    } catch (e) {
      toast(e instanceof Error ? e.message : "couldn't upload that. try again.")
    }
    setBusy(false)
  }
  const shown = profile.newAvatar ? `/api/img/${profile.newAvatar}` : profile.hasAvatar ? profile.avatar : null

  // the whole scene moves with the step: colour fields, mountains, and the phone leans with the pointer
  const at = useSpring(useMotionValue(0), { stiffness: 60, damping: 18, mass: 0.8 })
  useEffect(() => at.set(step / (STEPS.length - 1)), [step, at])
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const px = useSpring(mx, { stiffness: 70, damping: 20, mass: 0.7 })
  const py = useSpring(my, { stiffness: 70, damping: 20, mass: 0.7 })
  const phoneX = useTransform(px, [-1, 1], reduced ? [0, 0] : [-16, 16])
  const phoneY = useTransform(py, [-1, 1], reduced ? [0, 0] : [-10, 10])
  const phoneR = useTransform(px, [-1, 1], reduced ? [0, 0] : [-2.2, 2.2])
  const tagX = useTransform(px, [-1, 1], reduced ? [0, 0] : [26, -26])
  const tagY = useTransform(py, [-1, 1], reduced ? [0, 0] : [16, -16])
  const guide = useTyped(STEPS[step].line, reduced)

  const tag = id === 'links' ? `${built.filter((b) => b.t === 'link').length} links` : id === 'layout' ? cfg.layout : id === 'look' ? 'your look' : id === 'you' ? profile.name || 'you' : id === 'done' ? 'live' : url
  const win: ReactNode = (
    <Win title={`${pad(step + 1)} / ${pad(STEPS.length)} · ${STEPS[step].name}`} className="w-full" bodyClass="max-h-[calc(100svh-23rem)] overflow-y-auto lg:max-h-[calc(100svh-20rem)]">
      {id === 'start' && (
        <div className="p-6 md:p-8">
          <h2 className="disp text-[clamp(2.2rem,5vw,3.6rem)] !text-[#0c1544]">your page starts here</h2>
          <p className="mt-5 max-w-[26rem] text-[0.84rem] leading-[1.75]">three quick things: who you are, what to link, how it looks. then it is live, and the link is yours to put in your bio.</p>
          <div className="mt-6 flex items-center gap-3 border border-[#0c1544] bg-white/60 px-3.5 py-3 text-[0.86rem]">
            <span className="min-w-0 flex-1 truncate">{url}</span>
            <span className="cap inline-flex items-center gap-1.5 text-[#0c1544]/60">
              <Check className="size-3.5" /> yours
            </span>
          </div>
        </div>
      )}
      {id === 'you' && (
        <div className="space-y-5 p-6 md:p-8">
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void upload(e.target.files?.[0])} />
          <div className="flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center overflow-hidden border border-[#0c1544] bg-white/60 text-xl">
              {shown ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shown} alt="" className="size-full object-cover" />
              ) : (
                <span>{(profile.name || '?').slice(0, 1).toUpperCase()}</span>
              )}
            </span>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => file.current?.click()} disabled={busy} className="cap inline-flex h-9 items-center gap-2 border border-[#0c1544] px-4 transition-colors hover:bg-[#0c1544] hover:text-[#f4ead6]">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} picture
              </button>
              {shown && (
                <button type="button" onClick={() => setProfile({ newAvatar: null, hasAvatar: false, avatar: null })} className="cap h-9 px-3 text-[#0c1544]/55 hover:text-[#0c1544]">
                  remove
                </button>
              )}
            </div>
          </div>
          <label className="block">
            <span className="cap text-[#0c1544]/60">your name</span>
            <input value={profile.name} maxLength={40} onChange={(e) => setProfile({ name: e.target.value })} placeholder="what should it say?" autoFocus className={cn(field, 'mt-1.5 h-11')} />
          </label>
          <label className="block">
            <span className="cap flex justify-between text-[#0c1544]/60">
              <span>one line about you</span>
              <span className="tabular-nums">{profile.bio.length}/400</span>
            </span>
            <textarea value={profile.bio} maxLength={400} onChange={(e) => setProfile({ bio: e.target.value })} placeholder="who you are and what you make." className={cn(field, 'mt-1.5 min-h-[5.5rem] resize-y py-2.5 leading-relaxed')} />
          </label>
        </div>
      )}
      {id === 'links' && (
        <div className="space-y-5 p-6 md:p-8">
          <div className="grid gap-3">
            {rows.map((r, i) => (
              <div key={r.id} className="grid gap-2 border border-[#0c1544]/30 bg-white/40 p-3 sm:grid-cols-[0.8fr_1.2fr_auto]">
                <input value={r.title} maxLength={80} placeholder="name, like my showreel" aria-label={`link ${i + 1} name`} onChange={(e) => setRows((x) => x.map((y) => (y.id === r.id ? { ...y, title: e.target.value } : y)))} className={cn(field, 'h-10')} />
                <input value={r.url} placeholder="link, like youtube.com/..." inputMode="url" autoCapitalize="off" spellCheck={false} aria-label={`link ${i + 1} address`} onChange={(e) => setRows((x) => x.map((y) => (y.id === r.id ? { ...y, url: e.target.value } : y)))} onBlur={() => setRows((x) => x.map((y) => (y.id === r.id ? { ...y, url: cleanUrl(y.url) || y.url } : y)))} className={cn(field, 'h-10')} />
                <button type="button" aria-label={`remove link ${i + 1}`} onClick={() => setRows((x) => (x.length > 1 ? x.filter((y) => y.id !== r.id) : [{ ...r, title: '', url: '' }]))} className="grid size-10 place-items-center text-[#0c1544]/50 transition-colors hover:bg-[#0c1544] hover:text-[#f4ead6]">
                  <X className="size-4" />
                </button>
              </div>
            ))}
            {rows.length < 6 && (
              <button type="button" onClick={() => setRows((x) => [...x, { id: newId(), title: '', url: '' }])} className="cap inline-flex h-10 items-center justify-center gap-2 border border-dashed border-[#0c1544]/50 transition-colors hover:border-[#0c1544] hover:bg-white/60">
                <Plus className="size-4" /> another link
              </button>
            )}
          </div>
          <div>
            <p className="cap text-[#0c1544]/60">your socials</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SOCIALS.map((s) => (
                <button key={s} type="button" aria-pressed={openSoc === s} onClick={() => setOpenSoc((o) => (o === s ? null : s))} className={cn('cap inline-flex h-9 items-center gap-2 border px-3.5 transition-colors', soc[s]?.trim() ? 'border-[#0c1544] bg-[#5fd1b6]' : openSoc === s ? 'border-[#0c1544] bg-white' : 'border-[#0c1544]/40 hover:border-[#0c1544]')}>
                  {soc[s]?.trim() && <Check className="size-3.5" />} {s}
                </button>
              ))}
            </div>
            {openSoc && (
              <div className="mt-3 flex items-center gap-2 border border-[#0c1544]/40 bg-white/60 pl-3">
                <span className="text-[0.76rem] text-[#0c1544]/50">{USERNAME_LINKS[openSoc]?.label ?? 'link'}</span>
                <input autoFocus value={soc[openSoc] ?? ''} placeholder={USERNAME_LINKS[openSoc] ? 'yourname' : 'paste the link'} spellCheck={false} autoCapitalize="off" aria-label={`${openSoc} ${USERNAME_LINKS[openSoc] ? 'username' : 'link'}`} onChange={(e) => setSoc((o) => ({ ...o, [openSoc]: e.target.value }))} className="h-10 min-w-0 flex-1 bg-transparent text-[0.86rem] outline-none placeholder:text-[#0c1544]/35" />
              </div>
            )}
          </div>
        </div>
      )}
      {id === 'layout' && (
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-2 gap-2">
            {LAYOUTS.map((l, n) => (
              <button key={l.id} type="button" aria-pressed={cfg.layout === l.id} onClick={() => set((c) => ({ ...c, layout: l.id }))} className={cn('flex h-11 items-center gap-3 border px-3.5 text-left text-[0.8rem] transition-colors', cfg.layout === l.id ? 'border-[#0c1544] bg-[#0c1544] text-[#f4ead6]' : 'border-[#0c1544]/35 hover:border-[#0c1544] hover:bg-white/60')}>
                <span className="text-[0.62rem] opacity-55 tabular-nums">{pad(n + 1)}</span>
                <span className="uppercase tracking-[0.04em]">{l.name}</span>
              </button>
            ))}
          </div>
          <p className="mt-5 min-h-[2.6rem] text-[0.8rem] leading-[1.7]">{LAYOUTS.find((l) => l.id === cfg.layout)?.note}</p>
        </div>
      )}
      {id === 'look' && (
        <div className="p-6 md:p-8">
          <div className="grid gap-2 sm:grid-cols-2">
            {PRESETS.map((p) => {
              const on = look === p.id
              return (
                <button key={p.id} type="button" aria-pressed={on} onClick={() => (setLook(p.id), set((c) => applyPreset(c, p)))} className={cn('flex items-center gap-3 border p-2.5 text-left transition-colors', on ? 'border-[#0c1544] bg-white' : 'border-[#0c1544]/35 hover:border-[#0c1544] hover:bg-white/60')}>
                  <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center border border-[#0c1544]/40" style={{ background: `hsl(0 0% ${p.swatch[0]}%)` }}>
                    <span className="size-3" style={{ background: `hsl(0 0% ${p.swatch[1]}%)` }} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.8rem] uppercase tracking-[0.04em]">{p.name}</span>
                    <span className="block truncate text-[0.68rem] text-[#0c1544]/55">{p.note}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {id === 'done' && (
        <div className="p-6 md:p-8">
          <h2 className="disp text-[clamp(2.2rem,5vw,3.6rem)] !text-[#0c1544]">{saving === 'error' ? 'it did not save' : saving === 'ok' ? 'you are live' : 'saving it'}</h2>
          <div className="mt-6 flex items-center gap-3 border border-[#0c1544] bg-white/60 px-3.5 py-3 text-[0.9rem]">
            <span className="min-w-0 flex-1 truncate">{url}</span>
            {saving === 'saving' && <Loader2 className="size-4 animate-spin" />}
            {saving === 'ok' && <Check className="size-4" />}
          </div>
          {saving === 'error' ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => (setSaving('idle'), go(STEPS.length - 2), window.setTimeout(() => go(STEPS.length - 1), 50))} className="cap inline-flex h-10 items-center border border-[#0c1544] bg-[#0c1544] px-5 text-[#f4ead6]">
                try again
              </button>
            </div>
          ) : (
            <>
              <ul className="mt-6 space-y-2.5 text-[0.8rem] leading-[1.7]">
                {['paste the link into your instagram, tiktok, youtube or discord bio', 'every click lands on this page', 'change anything, any time, from your dashboard'].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="text-[#0c1544]/45 tabular-nums">{pad(i + 1)}</span>
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving !== 'ok'}
                  onClick={() => {
                    void navigator.clipboard?.writeText(`https://${url}`)
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 1400)
                  }}
                  className="cap inline-flex h-10 items-center gap-2 bg-[#0c1544] px-5 text-[#f4ead6] transition-opacity hover:opacity-85 disabled:opacity-40"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? 'copied' : 'copy my link'}
                </button>
                <a href={`/${profile.handle}`} target="_blank" rel="noreferrer" className="cap inline-flex h-10 items-center gap-2 border border-[#0c1544] px-5 transition-colors hover:bg-[#0c1544] hover:text-[#f4ead6]">
                  <ExternalLink className="size-3.5" /> open it
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </Win>
  )

  const last = step === STEPS.length - 1
  return (
    <div role="dialog" aria-modal="true" aria-label="set up your page" className="ed tour fixed inset-0 z-[90] overflow-hidden bg-[#22377f]" onPointerMove={(e) => (e.pointerType === 'mouse' && (mx.set((e.clientX / window.innerWidth - 0.5) * 2), my.set((e.clientY / window.innerHeight - 0.5) * 2)), undefined)}>
      <SpeckFilter />
      <MeshField at={at} />
      <Mountains p={at} className="h-[38vh]" />

      {/* the top: progress like a health bar, and a way out */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 p-4 md:p-6">
        <div className="pix" aria-hidden="true">
          <p className="mb-2 inline-block border border-white/85 px-2 py-1 text-[0.66rem] tracking-[0.14em] uppercase" style={{ background: INK, color: CREAM }}>
            logoless
          </p>
          <div className="h-2.5 w-28 border border-white/85 md:w-40" style={{ background: `${INK}b3` }}>
            <motion.div className="h-full bg-white" initial={false} animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: reduced ? 0 : 0.5, ease: [0.2, 0.8, 0.2, 1] }} />
          </div>
          <p className="mt-1.5 text-[0.6rem] tracking-[0.1em] text-white/90 uppercase">
            level {pad(step + 1)}/{pad(STEPS.length)}
          </p>
        </div>
        {!last && (
          <button type="button" onClick={onSkip} className="pix inline-flex h-10 items-center gap-2 border border-white/85 px-4 text-[0.7rem] tracking-[0.1em] text-white uppercase transition-colors hover:bg-white hover:text-[#0c1544]" style={{ background: `${INK}b3` }}>
            skip for now <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* the stage */}
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[72rem] flex-col items-center justify-center gap-6 px-4 pt-20 pb-[7.5rem] lg:flex-row lg:justify-center lg:gap-16 lg:px-10">
        <div className="relative order-2 w-full max-w-[32rem] lg:order-1">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={id}
              custom={dir}
              initial={reduced ? false : { opacity: 0, x: dir * 60, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: dir * -60, scale: 0.97 }}
              transition={{ duration: reduced ? 0 : 0.38, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {win}
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.div style={{ x: phoneX, y: phoneY, rotate: phoneR }} className="relative order-1 shrink-0 lg:order-2">
          <div aria-hidden="true" className="relative h-[8.5rem] w-[8.5rem] overflow-hidden border border-white/80 bg-black shadow-[7px_7px_0_#0c1544] sm:h-[11rem] sm:w-[10rem] lg:h-[32rem] lg:w-[15.5rem]">
            <div className="absolute top-0 left-0 origin-top-left scale-[0.349] sm:scale-[0.41] lg:scale-[0.636]" style={{ width: 390, height: 844 }}>
              <BioPage mode="mini" data={live} />
            </div>
          </div>
          <motion.div style={{ x: tagX, y: tagY }} className="pointer-events-none absolute -top-3 -left-3 hidden lg:block">
            <AnimatePresence mode="wait">
              <motion.span key={tag} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="pix inline-block border border-white/85 px-2.5 py-1.5 text-[0.62rem] tracking-[0.1em] whitespace-nowrap uppercase" style={{ background: INK, color: CREAM }}>
                {tag}
              </motion.span>
            </AnimatePresence>
          </motion.div>
          {id === 'done' && saving === 'ok' && !reduced && <Burst />}
        </motion.div>
      </div>

      {/* the guide and the buttons, along the bottom */}
      <div className="absolute inset-x-3 bottom-3 z-30 flex items-end gap-2 md:inset-x-[6vw] md:bottom-6">
        <div className="hidden size-[4.6rem] shrink-0 flex-col items-center justify-center gap-1 border border-white/85 sm:flex" style={{ background: INK }}>
          <Pixels rows={JACKAL} fill={CREAM} className="size-9" />
          <span className="pix text-[0.5rem] tracking-[0.14em] text-white/70 uppercase">the guide</span>
        </div>
        <p className="pix min-h-[3.4rem] flex-1 border border-white/85 px-4 py-3 text-[0.72rem] leading-[1.5] tracking-[0.06em] uppercase md:text-[0.82rem]" style={{ background: INK, color: CREAM }} aria-live="polite">
          {guide}
          <span aria-hidden="true" className="ml-0.5 inline-block w-[0.5em]" style={{ animation: 'hud-blink 1s steps(1) infinite' }}>
            ▌
          </span>
        </p>
        <div className="flex shrink-0 gap-1.5">
          {step > 0 && !last && (
            <button type="button" onClick={() => go(step - 1)} aria-label="back" className="pix grid size-11 place-items-center border border-white/85 text-white transition-transform hover:-translate-y-0.5 md:size-12" style={{ background: INK }}>
              <ArrowLeft className="size-4" />
            </button>
          )}
          {last ? (
            <button type="button" onClick={onDone} disabled={saving !== 'ok'} className="pix inline-flex h-11 items-center gap-2 border border-white/85 px-5 text-[0.74rem] tracking-[0.1em] text-[#0c1544] uppercase transition-transform hover:-translate-y-0.5 disabled:opacity-50 md:h-12" style={{ background: '#5fd1b6' }}>
              {saving === 'saving' ? <Loader2 className="size-4 animate-spin" /> : null} my dashboard <ArrowRight className="size-4" />
            </button>
          ) : (
            <button type="button" onClick={next} className="pix inline-flex h-11 items-center gap-2 border border-white/85 px-5 text-[0.74rem] tracking-[0.1em] text-[#0c1544] uppercase transition-transform hover:-translate-y-0.5 md:h-12" style={{ background: '#5fd1b6' }}>
              {step === 0 ? 'start' : step === STEPS.length - 2 ? 'make it live' : 'next'} <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Squares fly out from the phone when the page goes live. */
function Burst() {
  const bits = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const a = (i / 30) * Math.PI * 2 + Math.random() * 0.4
        const r = 120 + Math.random() * 190
        return { x: Math.cos(a) * r, y: Math.sin(a) * r, s: 6 + Math.round(Math.random() * 10), c: COLORS[i % COLORS.length], d: Math.random() * 0.15, rot: Math.random() * 180 }
      }),
    [],
  )
  return (
    <div aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 z-20">
      {bits.map((b, i) => (
        <motion.span key={i} initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }} animate={{ x: b.x, y: b.y, opacity: 0, scale: 1, rotate: b.rot }} transition={{ duration: 1.3, delay: b.d, ease: [0.1, 0.7, 0.2, 1] }} className="absolute block" style={{ width: b.s, height: b.s, background: b.c, border: `1px solid ${INK}` }} />
      ))}
    </div>
  )
}
