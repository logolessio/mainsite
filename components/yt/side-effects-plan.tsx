'use client'

import {
  AlertTriangle,
  Check,
  Clapperboard,
  Copy,
  DollarSign,
  Film,
  ImageIcon,
  Lightbulb,
  ListChecks,
  Mic,
  Palette,
  Pause,
  Play,
  ShieldAlert,
  Star,
  Terminal,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  BRAND,
  CHANNEL,
  EXTRA_MONEY,
  IDEAS,
  MOTIONS,
  NEXT_STEPS,
  POSTING,
  RPM_ROWS,
  RULES,
  SERIES,
  STYLE_PREFIX,
  TIMELINE,
  TOOLS,
  VIDEOS,
  VOICE,
  WORKFLOW,
  type Scene,
  type Video,
} from '@/lib/yt/plan'

/*
 * yt.logoless.io: everything for the Side Effects channel on one page. Ticks (next steps, fact-checks) are kept in this browser only.
 */

const ORANGE = '#E8752A'
const card = 'rounded-2xl border border-white/10 bg-white/[0.03]'
const h2 = 'font-display text-[clamp(1.8rem,5vw,2.6rem)] leading-[1.05] tracking-[-0.01em] text-white'
const kicker = 'mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#E8752A]'
const body = 'text-[15px] leading-relaxed text-white/60'

const NAV = [
  ['steps', 'Next steps'],
  ['money', 'Money'],
  ['videos', 'Videos'],
  ['ideas', 'Ideas'],
  ['brand', 'Brand'],
  ['workflow', 'Workflow'],
  ['rules', 'Rules'],
] as const

function useStored(key: string): [Record<string, boolean>, (id: string) => void] {
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  useEffect(() => {
    try {
      setTicks(JSON.parse(localStorage.getItem(key) ?? '{}'))
    } catch {}
  }, [key])
  const toggle = (id: string) =>
    setTicks((t) => {
      const next = { ...t, [id]: !t[id] }
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {}
      return next
    })
  return [ticks, toggle]
}

function CopyButton({ text, label = 'Copy', className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setDone(true)
          setTimeout(() => setDone(false), 1400)
        })
      }}
      className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-[12px] font-medium text-white/80 transition hover:border-white/30 hover:text-white', className)}
    >
      {done ? <Check className="size-3.5 text-[#E8752A]" /> : <Copy className="size-3.5" />}
      {done ? 'Copied' : label}
    </button>
  )
}

/** "DAY *7.*": the starred part in orange, like the thumbnails. */
function ThumbText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn('font-display uppercase', className)}>
      {text.split(/(\*[^*]+\*)/).filter(Boolean).map((part, i) =>
        part.startsWith('*') ? <span key={i} style={{ color: ORANGE }}>{part.slice(1, -1)}</span> : <span key={i}>{part}</span>,
      )}
    </span>
  )
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function Check2({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-3 text-left">
      <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition', on ? 'border-[#E8752A] bg-[#E8752A]' : 'border-white/25')}>
        {on && <Check className="size-3.5 text-black" strokeWidth={3} />}
      </span>
      <span className={cn('min-w-0', on && 'opacity-45')}>{children}</span>
    </button>
  )
}

function Section({ id, icon, label, title, intro, children }: { id: string; icon: React.ReactNode; label: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-white/[0.07] py-16 sm:py-20">
      <p className={kicker}>{icon}{label}</p>
      <h2 className={h2}>{title}</h2>
      {intro && <p className={cn(body, 'mt-3 max-w-2xl')}>{intro}</p>}
      <div className="mt-8">{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------------ next steps */

function NextSteps() {
  const [ticks, toggle] = useStored('yt-plan-steps')
  const done = NEXT_STEPS.filter((s) => ticks[s.id]).length
  return (
    <div className={cn(card, 'p-5 sm:p-6')}>
      <div className="mb-5 flex items-center gap-4">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#E8752A] transition-all" style={{ width: `${(done / NEXT_STEPS.length) * 100}%` }} />
        </div>
        <span className="text-[13px] tabular-nums text-white/60">{done} / {NEXT_STEPS.length}</span>
      </div>
      <ol className="space-y-4">
        {NEXT_STEPS.map((s) => (
          <li key={s.id}>
            <Check2 on={!!ticks[s.id]} onClick={() => toggle(s.id)}>
              <span className="block text-[15px] font-semibold text-white">{s.title}</span>
              <span className="mt-0.5 block text-[14px] leading-relaxed text-white/55">{s.detail}</span>
            </Check2>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-[12px] text-white/35">Ticks are saved in this browser only.</p>
    </div>
  )
}

/* ------------------------------------------------------------------ money */

function Calculator() {
  const [rpm, setRpm] = useState(5)
  const [perMonth, setPerMonth] = useState(15)
  const [viewsExp, setViewsExp] = useState(Math.log10(100_000))
  const views = Math.round(10 ** viewsExp / 1000) * 1000
  const monthly = (views * perMonth * rpm) / 1000
  const needed = Math.ceil(10_000_000 / (rpm * perMonth) / 1000) * 1000
  const money = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  const slider = 'w-full accent-[#E8752A]'
  return (
    <div className={cn(card, 'p-5 sm:p-6')}>
      <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/45">Revenue calculator</p>
      <div className="mt-5 space-y-5">
        <label className="block">
          <span className="flex justify-between text-[14px] text-white/70"><span>RPM (per 1,000 views)</span><span className="font-semibold text-white">${rpm}</span></span>
          <input type="range" min={2} max={12} step={0.5} value={rpm} onChange={(e) => setRpm(+e.target.value)} className={slider} />
        </label>
        <label className="block">
          <span className="flex justify-between text-[14px] text-white/70"><span>Videos a month</span><span className="font-semibold text-white">{perMonth}</span></span>
          <input type="range" min={4} max={30} value={perMonth} onChange={(e) => setPerMonth(+e.target.value)} className={slider} />
        </label>
        <label className="block">
          <span className="flex justify-between text-[14px] text-white/70"><span>Average views per video</span><span className="font-semibold text-white">{views.toLocaleString('en-US')}</span></span>
          <input type="range" min={3} max={6} step={0.01} value={viewsExp} onChange={(e) => setViewsExp(+e.target.value)} className={slider} />
        </label>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/[0.05] p-4">
          <p className="text-[12px] text-white/45">Per month</p>
          <p className={cn('font-display text-[28px] leading-tight', monthly >= 10_000 ? 'text-[#E8752A]' : 'text-white')}>{money(monthly)}</p>
        </div>
        <div className="rounded-xl bg-white/[0.05] p-4">
          <p className="text-[12px] text-white/45">Views per video for $10k</p>
          <p className="font-display text-[28px] leading-tight text-white">{needed.toLocaleString('en-US')}</p>
        </div>
      </div>
      <p className="mt-3 text-[12px] text-white/35">Ads only. Sponsors and a community come on top.</p>
    </div>
  )
}

function Money() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Calculator />
      <div className="space-y-5">
        <div className={cn(card, 'overflow-hidden')}>
          <table className="w-full text-left text-[14px]">
            <thead className="bg-white/[0.04] text-[12px] uppercase tracking-[0.08em] text-white/45">
              <tr><th className="px-4 py-3 font-medium">RPM</th><th className="px-4 py-3 font-medium">Views / month for $10k</th><th className="px-4 py-3 font-medium">Per video at 15/mo</th></tr>
            </thead>
            <tbody>
              {RPM_ROWS.map((r) => (
                <tr key={r.rpm} className="border-t border-white/[0.07] text-white/80">
                  <td className="px-4 py-3 font-semibold text-white">${r.rpm}</td><td className="px-4 py-3">{r.views}</td><td className="px-4 py-3">{r.perVideo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ol className="space-y-3">
          {TIMELINE.map((t) => (
            <li key={t.when} className="flex gap-4">
              <span className="w-28 shrink-0 pt-0.5 text-[13px] font-semibold text-[#E8752A]">{t.when}</span>
              <span className="text-[14px] leading-relaxed text-white/65">{t.what}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
        {EXTRA_MONEY.map((m) => (
          <div key={m.title} className={cn(card, 'p-5')}>
            <p className="text-[15px] font-semibold text-white">{m.title}</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-white/55">{m.text}</p>
          </div>
        ))}
      </div>
      <div className={cn(card, 'p-5 lg:col-span-2')}>
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/45">Posting plan</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {POSTING.map((p) => (
            <div key={p.label}>
              <dt className="text-[14px] font-semibold text-white">{p.label}</dt>
              <dd className="mt-0.5 text-[14px] leading-relaxed text-white/55">{p.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ videos */

function StatusPill({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium', on ? 'bg-[#E8752A]/15 text-[#F4A26B]' : 'bg-white/[0.06] text-white/45')}>
      {on ? <Check className="size-3" strokeWidth={3} /> : <span className="size-1.5 rounded-full bg-white/30" />}
      {children}
    </span>
  )
}

function ScriptTab({ video }: { video: Video }) {
  const audio = useRef<HTMLAudioElement>(null)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const scenes = video.scenes as Scene[]
  const active = video.voiceover && (playing || t > 0) ? scenes.findLast((s) => s.start !== null && s.start <= t + 0.05)?.n : undefined
  const listRef = useRef<HTMLOListElement>(null)
  useEffect(() => {
    if (!playing || !active) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-scene="${active}"]`)
    const box = listRef.current
    if (el && box) box.scrollTo({ top: el.offsetTop - box.offsetTop - 12, behavior: 'smooth' })
  }, [active, playing])
  const seek = (s: Scene) => {
    if (!audio.current || s.start === null) return
    audio.current.currentTime = s.start
    audio.current.play()
  }
  return (
    <div>
      {video.voiceover ? (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/[0.05] p-3">
          <button
            type="button"
            aria-label={playing ? 'Pause the voiceover' : 'Play the voiceover'}
            onClick={() => (audio.current?.paused ? audio.current.play() : audio.current?.pause())}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-[#E8752A] text-black transition hover:brightness-110"
          >
            {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="ml-0.5 size-4" fill="currentColor" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-white">Voiceover · {VOICE.name}</p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-[#E8752A]" style={{ width: `${audio.current?.duration ? (t / audio.current.duration) * 100 : 0}%` }} />
            </div>
          </div>
          <span className="text-[12px] tabular-nums text-white/50">{clock(t)}</span>
          <audio ref={audio} src={video.voiceover} preload="none" onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
        </div>
      ) : (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-white/[0.04] p-3 text-[13px] text-white/55">
          <Mic className="size-4 shrink-0" /> No voiceover yet: <code className="text-white/75">python3 tools/channel.py voice videos/{video.id}</code>
        </p>
      )}
      <ol ref={listRef} className="relative max-h-[560px] space-y-2 overflow-y-auto pr-1">
        {scenes.map((s) => (
          <li key={s.n} data-scene={s.n}>
            <button
              type="button"
              onClick={() => seek(s)}
              disabled={s.start === null}
              className={cn('w-full rounded-xl border p-3 text-left transition', active === s.n ? 'border-[#E8752A]/60 bg-[#E8752A]/10' : 'border-white/[0.07] bg-white/[0.02] enabled:hover:border-white/20')}
            >
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40">
                <span className="text-[#E8752A]">{String(s.n).padStart(2, '0')}</span>
                {s.start !== null && <span className="tabular-nums">{clock(s.start)}</span>}
                <span className="rounded bg-white/[0.07] px-1.5 py-px normal-case tracking-normal text-white/55">{s.motion}</span>
              </span>
              <span className="mt-1.5 block text-[15px] leading-relaxed text-white">{s.text}</span>
              <span className="mt-1 block text-[13px] leading-relaxed text-white/40"><ImageIcon className="mr-1 inline size-3.5 align-[-2px]" />{s.shot}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Field({ label, text, children }: { label: string; text?: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/[0.07] py-4 first:border-t-0 first:pt-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/45">{label}</p>
        {text && <CopyButton text={text} />}
      </div>
      {children}
    </div>
  )
}

function PackageTab({ video }: { video: Video }) {
  const p = video.package
  return (
    <div>
      <Field label="Title" text={p.title}><p className="text-[17px] font-semibold text-white">{p.title}</p></Field>
      {p.backupTitles.length > 0 && (
        <Field label="Backup titles (for Test & compare)" text={p.backupTitles.join('\n')}>
          <ul className="space-y-1 text-[15px] text-white/75">{p.backupTitles.map((b) => <li key={b}>{b}</li>)}</ul>
        </Field>
      )}
      <Field label="Description" text={p.description}>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-black/40 p-4 font-sans text-[14px] leading-relaxed text-white/75">{p.description}</pre>
        <p className="mt-2 text-[12px] text-white/35">Fix the chapter times from the scene times in the Script tab before pasting.</p>
      </Field>
      <Field label="Tags" text={p.tags.join(', ')}>
        <div className="flex flex-wrap gap-1.5">{p.tags.map((t) => <span key={t} className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[13px] text-white/70">{t}</span>)}</div>
      </Field>
      <Field label="Pinned comment" text={p.pinned}><p className="text-[15px] text-white/75">{p.pinned}</p></Field>
      <Field label="Shorts cut"><p className="text-[15px] leading-relaxed text-white/75">{p.shorts}</p></Field>
      <Field label="Thumbnail background prompt (save as thumb-bg.png)" text={p.thumbPrompt}>
        <p className="text-[14px] leading-relaxed text-white/60">{p.thumbPrompt}</p>
      </Field>
    </div>
  )
}

function FactTab({ video }: { video: Video }) {
  const [ticks, toggle] = useStored(`yt-facts-${video.id}`)
  return (
    <div>
      <p className={cn(body, 'mb-4 text-[14px]')}>Check every claim before publishing. False health claims break YouTube’s rules and the audience’s trust.</p>
      <ul className="space-y-3">
        {video.package.factChecks.map((f, i) => (
          <li key={i}>
            <Check2 on={!!ticks[i]} onClick={() => toggle(String(i))}><span className="text-[14px] leading-relaxed text-white/80">{f}</span></Check2>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PromptsTab({ video }: { video: Video }) {
  const prompts = video.scenes.map((s) => `${STYLE_PREFIX} Scene: ${s.shot}.`)
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/[0.04] p-3">
        <p className="text-[13px] text-white/60">Save each as <code className="text-white/85">images/01.png</code>, <code className="text-white/85">02.png</code>… Midjourney: add <code className="text-white/85">--ar 16:9 --oref &lt;Milo URL&gt; --ow 100</code></p>
        <CopyButton text={prompts.map((p, i) => `${String(i + 1).padStart(2, '0')}. ${p}`).join('\n\n')} label={`Copy all ${prompts.length}`} />
      </div>
      <ol className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
        {video.scenes.map((s, i) => (
          <li key={s.n} className="flex items-start gap-3 rounded-xl border border-white/[0.07] p-3">
            <span className="w-6 shrink-0 text-[13px] font-semibold text-[#E8752A]">{String(s.n).padStart(2, '0')}</span>
            <span className="min-w-0 flex-1 text-[14px] leading-relaxed text-white/75">{s.shot}</span>
            <CopyButton text={prompts[i]} label="Copy" />
          </li>
        ))}
      </ol>
    </div>
  )
}

const TABS = [
  ['script', 'Script'],
  ['package', 'Upload pack'],
  ['facts', 'Fact-check'],
  ['prompts', 'Image prompts'],
] as const

function VideoCard({ video }: { video: Video }) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('script')
  const st = video.status
  return (
    <article className={cn(card, 'overflow-hidden')}>
      <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,320px)_1fr]">
        {video.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.thumbnail} alt={`Thumbnail mock for ${video.title}`} className="aspect-video w-full rounded-xl border border-white/10 object-cover" />
        ) : (
          <div className="grid aspect-video place-items-center rounded-xl bg-white/5"><ThumbText text={video.package.thumbText} className="text-3xl text-white" /></div>
        )}
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/40">
            Video {video.number}{video.seconds ? ` · ${clock(video.seconds)}` : ''} · {video.scenes.length} scenes
          </p>
          <h3 className="mt-1.5 font-display text-[clamp(1.35rem,3.5vw,1.8rem)] leading-tight text-white">{video.title}</h3>
          <p className="mt-2 text-[14px] text-white/50">Thumbnail: <ThumbText text={video.package.thumbText} className="text-[16px] text-white" /></p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <StatusPill on={st.script}>Script</StatusPill>
            <StatusPill on={st.voice}>Voiceover</StatusPill>
            <StatusPill on={st.images >= video.scenes.length}>Images {st.images}/{video.scenes.length}</StatusPill>
            <StatusPill on={st.thumbBg}>Thumbnail art</StatusPill>
            <StatusPill on={st.rendered && st.images >= video.scenes.length}>Final video</StatusPill>
          </div>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto border-y border-white/[0.07] px-3 sm:px-4">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn('shrink-0 border-b-2 px-3 py-3 text-[14px] font-medium transition', tab === id ? 'border-[#E8752A] text-white' : 'border-transparent text-white/45 hover:text-white/75')}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="p-5 sm:p-6">
        {tab === 'script' && <ScriptTab video={video} />}
        {tab === 'package' && <PackageTab video={video} />}
        {tab === 'facts' && <FactTab video={video} />}
        {tab === 'prompts' && <PromptsTab video={video} />}
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ ideas */

function Ideas() {
  const cats = useMemo(() => [...new Set(IDEAS.map((i) => i.category))], [])
  const [filter, setFilter] = useState<string>('star')
  const shown = IDEAS.filter((i) => (filter === 'all' ? true : filter === 'star' ? i.star : i.category === filter))
  const chip = (id: string, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setFilter(id)}
      className={cn('shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition', filter === id ? 'border-[#E8752A] bg-[#E8752A] text-black' : 'border-white/15 text-white/70 hover:border-white/30')}
    >
      {label}
    </button>
  )
  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {chip('star', '⭐ First 10')}
        {chip('all', `All ${IDEAS.length}`)}
        {cats.map((c) => chip(c, c))}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((i) => (
          <div key={i.n} className={cn(card, 'flex flex-col p-4')}>
            <div className="flex items-center gap-2 text-[12px] font-semibold text-white/40">
              <span>#{i.n}</span>
              {i.star && <Star className="size-3.5 fill-[#E8752A] text-[#E8752A]" />}
              {i.limited && <span className="rounded bg-yellow-400/15 px-1.5 py-px text-yellow-300/90">limited ads</span>}
              {i.ready && <span className="rounded bg-[#E8752A]/15 px-1.5 py-px text-[#F4A26B]">script ready</span>}
              <span className="ml-auto truncate font-normal">{i.category}</span>
            </div>
            <p className="mt-2 text-[16px] font-semibold leading-snug text-white">{i.title}</p>
            <p className="mt-2 font-display text-[18px] uppercase text-white/85">{i.thumb}</p>
            <p className="mt-2 text-[14px] leading-relaxed text-white/50">{i.hook}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {SERIES.map((s) => (
          <div key={s.name} className="rounded-xl bg-white/[0.04] p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#E8752A]">Series</p>
            <p className="mt-1 text-[15px] font-semibold text-white">{s.name}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-white/50">{s.items}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ brand */

function Brand() {
  const first = VIDEOS.find((v) => v.thumbnail)
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className={cn(card, 'p-5 sm:p-6')}>
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/45">Milo, the main character</p>
        <p className={cn(body, 'mt-2 text-[14px]')}>Milo is “you”. Every film is Milo living through the habit, so the viewer sees themselves in him.</p>
        <ul className="mt-4 space-y-2">
          {BRAND.milo.map((m) => <li key={m} className="flex gap-2.5 text-[14px] leading-relaxed text-white/75"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#E8752A]" />{m}</li>)}
        </ul>
        {first?.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={first.thumbnail} alt="Mock thumbnail with a rough Milo" className="mt-5 aspect-video w-full rounded-xl border border-white/10 object-cover" />
        )}
        <p className="mt-2 text-[12px] text-white/35">A rough Milo drawn by the kit. The real one comes from the reference sheet.</p>
      </div>
      <div className="space-y-5">
        <div className={cn(card, 'p-5')}>
          <div className="flex items-center justify-between gap-3"><p className="text-[15px] font-semibold text-white">1 · Reference sheet (do once)</p><CopyButton text={BRAND.referencePrompt} /></div>
          <p className="mt-2 text-[14px] leading-relaxed text-white/55">{BRAND.referencePrompt}</p>
          <p className="mt-2 text-[12px] text-white/35">Save the best as brand/milo-reference.png. Midjourney: --oref &lt;url&gt; --ow 100. ChatGPT: attach it and say “keep this exact character”.</p>
        </div>
        <div className={cn(card, 'p-5')}>
          <div className="flex items-center justify-between gap-3"><p className="text-[15px] font-semibold text-white">2 · Style prefix (added to every prompt)</p><CopyButton text={STYLE_PREFIX} /></div>
          <p className="mt-2 text-[14px] leading-relaxed text-white/55">{STYLE_PREFIX}</p>
        </div>
        <div className={cn(card, 'p-5')}>
          <p className="text-[15px] font-semibold text-white">Colours</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {BRAND.colors.map((c) => (
              <button key={c.hex} type="button" onClick={() => navigator.clipboard.writeText(c.hex)} className="flex items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-white/5" title="Copy hex">
                <span className="size-8 shrink-0 rounded-md border border-white/15" style={{ background: c.hex }} />
                <span className="min-w-0"><span className="block text-[13px] font-medium text-white">{c.name}</span><span className="block truncate text-[11px] text-white/40">{c.hex} · {c.use}</span></span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-white/50">{BRAND.mood}</p>
        </div>
      </div>
      <div className={cn(card, 'p-5')}>
        <p className="text-[15px] font-semibold text-white">Thumbnail rules</p>
        <ol className="mt-3 space-y-2">{BRAND.thumbnail.map((r, i) => <li key={r} className="flex gap-3 text-[14px] leading-relaxed text-white/70"><span className="font-semibold text-[#E8752A]">{i + 1}</span>{r}</li>)}</ol>
      </div>
      <div className={cn(card, 'p-5')}>
        <p className="text-[15px] font-semibold text-white">Title patterns</p>
        <ul className="mt-3 space-y-2">{BRAND.titles.map((t) => <li key={t} className="rounded-lg bg-white/[0.04] px-3 py-2 text-[14px] text-white/80">{t}</li>)}</ul>
        <p className="mt-3 text-[13px] text-white/45">Under ~55 characters. The video pays off the title in the first 30 seconds.</p>
        <p className="mt-4 text-[15px] font-semibold text-white">Voice</p>
        <p className="mt-1 text-[14px] leading-relaxed text-white/60">ElevenLabs {VOICE.name} (<code className="text-white/75">{VOICE.id}</code>), {VOICE.model}. Calm, deep, slightly serious. Short sentences with plenty of full stops give the dramatic pacing.</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ workflow + rules */

function Workflow() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <ol className="min-w-0 space-y-3">
        {WORKFLOW.map((w, i) => (
          <li key={w.title} className={cn(card, 'flex gap-4 p-4')}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#E8752A]/15 text-[14px] font-semibold text-[#E8752A]">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-white">{w.title}</p>
              <p className="mt-0.5 text-[14px] leading-relaxed text-white/55">{w.text}</p>
              {w.cmd && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-black/50 py-1.5 pl-3 pr-1.5">
                  <code className="min-w-0 flex-1 truncate text-[12.5px] text-white/80">{w.cmd}</code>
                  <CopyButton text={w.cmd} label="Copy" className="border-0" />
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="min-w-0 space-y-5">
        <div className={cn(card, 'overflow-hidden')}>
          <p className="px-4 pt-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/45">Tools · about $25–80 a month</p>
          <ul className="mt-2">
            {TOOLS.map((t) => (
              <li key={t.job} className="flex gap-3 border-t border-white/[0.07] px-4 py-3 first:border-t-0">
                <div className="min-w-0 flex-1"><p className="text-[14px] font-semibold text-white">{t.job}</p><p className="text-[13px] leading-relaxed text-white/50">{t.tool}</p></div>
                <span className="shrink-0 text-[13px] font-medium text-[#F4A26B]">{t.cost}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={cn(card, 'p-4')}>
          <p className="text-[14px] font-semibold text-white">Camera moves</p>
          <p className="mt-1 text-[13px] text-white/50">The [tag] at the start of each scene in script.md.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{MOTIONS.map((m) => <code key={m} className="rounded bg-white/[0.07] px-2 py-0.5 text-[12.5px] text-white/75">{m}</code>)}</div>
        </div>
        <div className={cn(card, 'p-4')}>
          <p className="text-[14px] font-semibold text-white">What to watch after uploading</p>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-white/60">
            <li><b className="text-white/85">CTR</b> 6%+. Under 4% after 48 hours: swap the thumbnail.</li>
            <li><b className="text-white/85">Average view duration</b> 50%+. Where the graph drops, the script went slow.</li>
            <li><b className="text-white/85">First 30 seconds</b>: losing more than 35% there means the hook is broken.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function Rules() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {RULES.map((r) => (
        <div key={r.title} className={cn(card, 'p-5')}>
          <AlertTriangle className="size-4 text-[#E8752A]" />
          <p className="mt-3 text-[15px] font-semibold text-white">{r.title}</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/55">{r.text}</p>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ page */

export function SideEffectsPlan() {
  const voiced = VIDEOS.filter((v) => v.status.voice).length
  const stats = [
    [String(VIDEOS.length), 'scripts ready'],
    [String(voiced), 'voiceovers'],
    [String(IDEAS.length), 'video ideas'],
    [CHANNEL.goal, 'the goal'],
  ]
  return (
    <div className="min-h-dvh bg-[#0c0c10] text-white">
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#0c0c10]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-3 sm:px-6">
          <a href="#top" className="shrink-0 font-display text-[19px] text-white">Side Effects<span className="text-[#E8752A]">.</span></a>
          <nav className="-mr-4 flex min-w-0 flex-1 gap-1 overflow-x-auto pr-4 sm:mr-0 sm:justify-end sm:pr-0">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white">{label}</a>
            ))}
          </nav>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className={kicker}><Clapperboard className="size-4" />Faceless animated YouTube channel · the plan</p>
            <h1 className="font-display text-[clamp(3rem,11vw,6.2rem)] leading-[0.92] tracking-[-0.02em] text-white">Side Effects<span className="text-[#E8752A]">.</span></h1>
            <p className="mt-5 max-w-xl text-[clamp(1.05rem,2.4vw,1.25rem)] leading-relaxed text-white/70">{CHANNEL.tagline}</p>
            <p className={cn(body, 'mt-3 max-w-xl')}>
              Every video takes one normal thing (TikTok, vaping, energy drinks, sleeping 5 hours) and shows what it really does to you through Milo, honestly and without fearmongering. Under 5 minutes, one every 1–2 days.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <a href="#steps" className="rounded-full bg-[#E8752A] px-5 py-2.5 text-[14px] font-semibold text-black transition hover:brightness-110">What to do next</a>
              <a href="#videos" className="rounded-full border border-white/20 px-5 py-2.5 text-[14px] font-semibold text-white transition hover:border-white/40">See the videos</a>
            </div>
          </div>
          <div>
            {VIDEOS[0]?.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={VIDEOS[0].thumbnail} alt={`Thumbnail mock for ${VIDEOS[0].title}`} className="aspect-video w-full rounded-2xl border border-white/10 object-cover shadow-[0_30px_80px_-20px_rgba(232,117,42,0.35)]" />
            )}
            <div className="mt-4 grid grid-cols-4 gap-2">
              {stats.map(([n, l]) => (
                <div key={l} className="rounded-xl bg-white/[0.04] p-3">
                  <p className="font-display text-[clamp(1rem,3.4vw,1.5rem)] leading-tight text-white">{n}</p>
                  <p className="mt-0.5 text-[11px] leading-tight text-white/45">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Section id="steps" icon={<ListChecks className="size-4" />} label="Next steps" title="What to do next" intro="In order. The first two come before anything goes public.">
          <NextSteps />
        </Section>

        <Section id="money" icon={<DollarSign className="size-4" />} label="Money" title="The honest $10k math" intro="YouTube pays roughly $3–8 per 1,000 long-form views in this niche, more with a US, UK, Canada or Australia audience. $10k a month means averaging around 100k views a video. Very doable in this format, not in month one.">
          <Money />
        </Section>

        <Section id="videos" icon={<Film className="size-4" />} label="Videos" title="The first films" intro="Each has the script timed to its voiceover, the upload pack, the fact-checks and every image prompt. Tap a scene to hear it.">
          <div className="space-y-6">{VIDEOS.map((v) => <VideoCard key={v.id} video={v} />)}</div>
        </Section>

        <Section id="ideas" icon={<Lightbulb className="size-4" />} label="Ideas" title="The idea bank" intro="Start with the ⭐ ten: the most searchable, widest audience, safe for ads. Group the rest into series and point each video at the next.">
          <Ideas />
        </Section>

        <Section id="brand" icon={<Palette className="size-4" />} label="Brand" title="Milo and the look">
          <Brand />
        </Section>

        <Section id="workflow" icon={<Terminal className="size-4" />} label="Workflow" title="Making a video" intro="About 1.5–2 hours a video once you are in rhythm. Commands run from the faceless-channel folder.">
          <Workflow />
        </Section>

        <Section id="rules" icon={<ShieldAlert className="size-4" />} label="Rules" title="What keeps you monetized">
          <Rules />
        </Section>

        <footer className="border-t border-white/[0.07] py-10 text-[13px] text-white/35">
          Side Effects. · channel plan · made with the logoless kit · names: {CHANNEL.name} (backups: {CHANNEL.backups.join(', ')})
        </footer>
      </main>
    </div>
  )
}
