'use client'

import { ChevronDown, Search } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'

type Guide = { id: string; title: string; lead: string; steps: { h: string; p: ReactNode }[] }
type Qa = { q: string; a: ReactNode; topic: string }

/** Every shortcut the dashboard knows (components/editor/dashboard.tsx and editor.tsx). */
const SHORTCUTS: [string, string][] = [
  ['⌘ K  or  /', 'find a setting, a page or something to do'],
  ['⌘ S', 'save'],
  ['⌘ Z', 'undo'],
  ['⌘ ⇧ Z', 'redo'],
  ['g  then  o / i / y / c', 'overview, analytics, you, card'],
  ['g  then  b / t / m / l', 'page, text & color, music & widgets, links'],
  ['g  then  p / s / e', 'pages, share, settings'],
  ['⌘ V on Links', 'paste links into your page'],
  ['↑ ↓ on a handle', 'move a link'],
  ['Esc', 'close a window'],
]

/** The guides: one per part of the dashboard. Links from the dashboard open them by id (/help#music). */
const GUIDES: Guide[] = [
  {
    id: 'getting-started',
    title: 'getting started',
    lead: 'from nothing to a page you can share, in about five minutes.',
    steps: [
      { h: 'claim your name', p: 'type the name you want on the home page. one letter is fine, and dots, dashes and underscores work too. sign up with Google, Discord or an email.' },
      { h: 'the dashboard', p: 'the menu on the left has Overview and Analytics, then Profile (You, Card, Page, Text & color, Music & widgets), then Links, Pages, Share and Settings. the sections that change your page show it live beside them.' },
      { h: 'start from the overview', p: 'Overview has a short checklist of what a page needs. each step takes you to the right place.' },
      { h: 'save', p: 'nothing is public until you press save (or ⌘S). ⌘Z undoes a step and ⇧⌘Z brings it back.' },
      { h: 'find anything', p: 'press ⌘K (or /) and type what you want: “slowed”, “font”, “lyrics”, “clear storage”. it jumps straight to the setting. g then a letter jumps to a section (g m for music).' },
    ],
  },
  {
    id: 'links',
    title: 'links, socials, songs and videos',
    lead: 'what goes on your page, and the quickest ways to get it there.',
    steps: [
      { h: 'paste anything', p: 'paste a link into the box at the top of Links: a YouTube or TikTok link becomes a video, a Spotify or SoundCloud link a song, a profile a social icon, anything else a link. several links at once are each added. on the Links section you can also press ⌘V anywhere outside a text box.' },
      { h: 'drag it where you want', p: 'press a block (link, social, video, song, picture…) to add it at the bottom, or drag it into the list and let go exactly where you want it: a white line shows where it will land. you can also drag a link from another browser tab straight into the list.' },
      { h: 'reorder', p: 'drag the ⋮⋮ handle. with a keyboard, tab to the handle and use ↑ ↓, or Home and End for the top and bottom. each block can be duplicated, hidden or pinned.' },
      { h: 'move anything on the page', p: 'press “Move things” under the preview, or just press and drag your picture, name or a link on the preview: the page switches to free positioning and you can put each piece anywhere and resize it. “Done moving” goes back.' },
      { h: 'more pages', p: 'Pages adds extra pages with their own address and a menu, each with its own links.' },
    ],
  },
  {
    id: 'make-it-yours',
    title: 'making it yours',
    lead: 'templates, the card, the background, type and colour.',
    steps: [
      { h: 'start from a template', p: 'Card has templates that set the whole look in one press, then the layout, the card itself (width, banner, shape) and 3D tilt.' },
      { h: 'the page behind it', p: 'Page sets the background (a colour, gradient, picture, GIF, video or a YouTube video), how blurred, dimmed and grainy it is, and effects over it like snow, embers or smoke.' },
      { h: 'type and colour', p: 'Text & color has your own colours, the typeface, the buttons and their roundness, and the size of everything.' },
      { h: 'cursor and entrance', p: 'Music & widgets also holds the cursor, its trail, click effects, an enter screen and how the page arrives.' },
      { h: 'try things safely', p: 'Settings → Backup downloads your whole page as a file before a big change, and loads it back. “Start the look over” resets the look and keeps your links, pages and music.' },
    ],
  },
  {
    id: 'music',
    title: 'music, the player, visualisers and lyrics',
    lead: 'a whole song on your page, played the way you like it.',
    steps: [
      { h: 'upload a song', p: 'Music & widgets → Music. upload an MP3, WAV, FLAC, M4A or OGG of any length within your 50 MB. its title and artist are read from the file, and one press finds the cover and album.' },
      { h: 'slowed, sped up, lo-fi', p: 'Sound has one-press presets (slowed + reverb, sped up, lo-fi, next room, bass boosted) and every control behind them: speed, keep the pitch (off for the classic slowed sound), reverb, bass, muffle, fade in, and where the song starts (it loops back there, so you can skip a slow intro). press play in the preview to hear changes as you drag. you can also let visitors switch between normal, slowed and sped up.' },
      { h: 'the player', p: 'pick a pill, card, vinyl, bar, bubble or nothing, and a corner. or drag the player in the preview to put it exactly where you want, and choose whether visitors can drag it out of their way.' },
      { h: 'visualisers', p: 'ten of them: bars, mirror, LED, dots, wave, line, spectrum, circle, rings and burst. put one along the bottom or top, in the middle, or across the whole page, and set its height, strength, number of bars, sensitivity, smoothness, line thickness and glow. loud songs are evened out by themselves, so the bars never get stuck at the top.' },
      { h: 'lyrics', p: 'search for your song under Lyrics and pick the result marked “your song” (the version as long as your file). choose a style (flow, focus, subtitle or kinetic), where it sits and how big it is. if the words run early or late, nudge the timing, or play the song and press “sync to now” the moment the first line is sung. visitors can hide the lyrics with a button on the player.' },
      { h: 'when music starts', p: 'browsers only play sound after a press. with an enter screen, entering is that press. without one, the song starts on the visitor’s first press anywhere. switch off “start by itself” to wait for the play button.' },
    ],
  },
  {
    id: 'sharing',
    title: 'sharing and analytics',
    lead: 'getting people to your page, and seeing what they press.',
    steps: [
      { h: 'your link and QR code', p: 'Share has your link to copy and a QR code to save. put the link in your Instagram, TikTok, YouTube and X bios.' },
      { h: 'how it looks when shared', p: 'Settings → Search and sharing sets the title and description that show up when your link is posted, and whether search engines can list your page.' },
      { h: 'analytics', p: 'views count once per visit; clicks count every press. Analytics shows the last 30 days and which links people press.' },
    ],
  },
  {
    id: 'storage-and-data',
    title: 'storage and your data',
    lead: 'your 50 MB, and how to clear it.',
    steps: [
      { h: 'the meter', p: 'Settings → Storage shows how much of your 50 MB is used, and by what: pictures, videos, cursors, songs and hosted files.' },
      { h: 'your uploads', p: 'Your uploads lists every file with its size. files your page uses are marked “in use” and can’t be deleted there. delete the rest one by one, or press “clear unused” twice to clear every picture, video, cursor and song nothing uses. hosted files are only deleted one by one.' },
      { h: 'made room for you', p: 'when you add something new and space is short, pictures and sounds your page isn’t using are cleared first, never one it uses.' },
      { h: 'reset analytics', p: 'Views and clicks starts your numbers from zero. it can’t be undone.' },
      { h: 'this device', p: 'This device, and the /preferences page, clear what logoless keeps in your browser. it doesn’t change your page or log you out.' },
    ],
  },
]

const FAQ: Qa[] = [
  { topic: 'account', q: 'is it free?', a: 'yes. there are no paid plans and nothing to buy.' },
  { topic: 'account', q: 'can I change my name?', a: 'yes, in You, twice in any seven days. your old name becomes free for someone else.' },
  { topic: 'account', q: 'how do I delete my account?', a: <>write to <a className="underline underline-offset-4" href={`mailto:${SITE.emails.support}`}>{SITE.emails.support}</a> from the email you sign in with. we delete the page, your uploads and your account within 30 days.</> },
  { topic: 'account', q: 'I can’t sign in', a: <>try the other ways in (Google, Discord, email). if you used email, “forgot password” sends a reset link. still stuck? <a className="underline underline-offset-4" href="/contact">contact us</a>.</> },
  { topic: 'music', q: 'why doesn’t the music start by itself?', a: 'browsers block sound until the visitor presses something. add an enter screen (Effects) so the first press is “enter”, or the song starts on their first press anywhere. visitors can also turn off autoplay for every page in /preferences.' },
  { topic: 'music', q: 'my song doesn’t fit', a: 'everything you upload shares your 50 MB. clear unused uploads in Settings → Your uploads, or export the MP3 at 192 or 256 kbps (4 minutes at 256 kbps is about 7.7 MB).' },
  { topic: 'music', q: 'the lyrics are out of time', a: 'pick the search result marked “your song”: other versions (radio edits, remasters) start at a different moment. then nudge the timing with − and +, or use “sync to now”.' },
  { topic: 'music', q: 'can I use any song?', a: <>only music (and lyrics) you have the right to use. see <a className="underline underline-offset-4" href="/legal/music-and-uploads">music &amp; uploads</a>.</> },
  { topic: 'music', q: 'the visualiser barely moves', a: 'raise the sensitivity, or lower the smoothness. it reacts to the song, so quiet intros move less. a song from a link (not an upload) can’t drive it.' },
  { topic: 'page', q: 'my changes aren’t on my page', a: 'press save. the preview shows unsaved changes; your real page only changes when you save.' },
  { topic: 'page', q: 'how does it look on phones?', a: 'switch the preview to the phone view to check: most visitors come from a phone.' },
  { topic: 'page', q: 'can I put things anywhere?', a: 'yes: press “Move things” under the preview, or drag a piece of the page, and each piece can go anywhere and be resized.' },
  { topic: 'visitors', q: 'the page moves too much for me', a: <>open <a className="underline underline-offset-4" href="/preferences">preferences</a> and switch on less motion. it works on every page, and follows your device’s reduce-motion setting too.</> },
  { topic: 'visitors', q: 'how do I report a page?', a: <>use the <a className="underline underline-offset-4" href="/report">report page</a>. tell us the address and what is wrong.</> },
]

export function HelpView() {
  const [q, setQ] = useState('')
  const [openQ, setOpenQ] = useState<string | null>(null)
  const text = (n: ReactNode): string => (typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join(' ') : n && typeof n === 'object' && 'props' in n ? text((n.props as { children?: ReactNode }).children) : '')
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const match = (s: string) => words.every((w) => s.toLowerCase().includes(w))
  const guides = useMemo(() => GUIDES.map((g) => ({ ...g, steps: words.length ? g.steps.filter((s) => match(`${g.title} ${s.h} ${text(s.p)}`)) : g.steps })).filter((g) => g.steps.length), [q]) // eslint-disable-line react-hooks/exhaustive-deps
  const faq = useMemo(() => FAQ.filter((f) => !words.length || match(`${f.q} ${text(f.a)} ${f.topic}`)), [q]) // eslint-disable-line react-hooks/exhaustive-deps

  // a link straight to a guide opens on it
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView())
  }, [])

  return (
    <>
      <div className="sticky top-16 z-30 -mx-5 mt-10 bg-black/85 px-5 py-3 backdrop-blur-xl md:-mx-8 md:px-8">
        <label className="flex h-12 items-center gap-3 border border-white/25 px-4 focus-within:border-white">
          <Search className="size-4 text-white/45" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search the guides: lyrics, slowed, storage, reorder…" aria-label="Search the help" className="h-full min-w-0 flex-1 bg-transparent text-[0.9rem] outline-none placeholder:text-white/30" />
        </label>
      </div>

      {!words.length && (
        <nav aria-label="guides" className="mt-8 grid gap-2 sm:grid-cols-2">
          {GUIDES.map((g, i) => (
            <a key={g.id} href={`#${g.id}`} className="group flex items-baseline gap-4 border border-white/10 p-4 transition-colors hover:border-white/40">
              <span className="text-[0.66rem] tabular-nums text-white/35">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span className="block text-[0.95rem]">{g.title}</span>
                <span className="mt-1 block text-[0.74rem] text-white/45">{g.lead}</span>
              </span>
            </a>
          ))}
          <a href="#shortcuts" className="flex items-baseline gap-4 border border-white/10 p-4 transition-colors hover:border-white/40">
            <span className="text-[0.66rem] tabular-nums text-white/35">07</span>
            <span>
              <span className="block text-[0.95rem]">keyboard shortcuts</span>
              <span className="mt-1 block text-[0.74rem] text-white/45">every key the editor knows.</span>
            </span>
          </a>
          <a href="#faq" className="flex items-baseline gap-4 border border-white/10 p-4 transition-colors hover:border-white/40">
            <span className="text-[0.66rem] tabular-nums text-white/35">08</span>
            <span>
              <span className="block text-[0.95rem]">questions</span>
              <span className="mt-1 block text-[0.74rem] text-white/45">the ones people ask most.</span>
            </span>
          </a>
        </nav>
      )}

      {guides.map((g) => (
        <section key={g.id} id={g.id} className="mt-20 scroll-mt-36">
          <h2 className="disp text-[clamp(1.8rem,5vw,2.8rem)]">{g.title}</h2>
          <p className="mt-3 text-[0.86rem] text-white/50">{g.lead}</p>
          <ol className="mt-8 grid gap-6">
            {g.steps.map((s, i) => (
              <li key={s.h} className="grid grid-cols-[2.2rem_1fr] gap-x-3">
                <span className="pt-0.5 text-[0.7rem] tabular-nums text-white/35">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="text-[0.95rem] text-white">{s.h}</h3>
                  <p className="mt-1.5 text-[0.86rem] leading-relaxed text-white/62">{s.p}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {(!words.length || match('keyboard shortcuts keys')) && (
        <section id="shortcuts" className="mt-20 scroll-mt-36">
          <h2 className="disp text-[clamp(1.8rem,5vw,2.8rem)]">keyboard shortcuts</h2>
          <p className="mt-3 text-[0.86rem] text-white/50">in the dashboard. ctrl instead of ⌘ on windows. letters never act while you type in a field.</p>
          <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-[0.86rem]">
            {SHORTCUTS.map(([k, v]) => (
              <div key={k} className="contents">
                <dt>
                  <kbd className="border border-white/25 px-2 py-0.5 text-[0.76rem] whitespace-nowrap">{k}</kbd>
                </dt>
                <dd className="text-white/60">{v}</dd>
              </div>
            ))}
            <div className="contents">
              <dt>
                <kbd className="border border-white/25 px-2 py-0.5 text-[0.76rem]">M</kbd>
              </dt>
              <dd className="text-white/60">on any page with music: mute</dd>
            </div>
          </dl>
        </section>
      )}

      {faq.length > 0 && (
        <section id="faq" className="mt-20 scroll-mt-36">
          <h2 className="disp text-[clamp(1.8rem,5vw,2.8rem)]">questions</h2>
          <ul className="mt-8 border-b border-white/10">
            {faq.map((f) => {
              const open = openQ === f.q || words.length > 0
              return (
                <li key={f.q} className="border-t border-white/10">
                  <button type="button" onClick={() => setOpenQ(openQ === f.q ? null : f.q)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 py-4 text-left text-[0.92rem]">
                    {f.q}
                    <ChevronDown className={cn('size-4 shrink-0 text-white/40 transition-transform', open && 'rotate-180')} />
                  </button>
                  {open && <div className="pb-5 text-[0.86rem] leading-relaxed text-white/62">{f.a}</div>}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {words.length > 0 && !guides.length && !faq.length && <p className="mt-16 text-center text-[0.86rem] text-white/50">nothing about “{q}”. try fewer words, or <a href="/contact" className="underline underline-offset-4">ask us</a>.</p>}

      <div className="mt-24 border border-white/15 p-6">
        <p className="text-[0.95rem]">still stuck?</p>
        <p className="mt-2 text-[0.84rem] text-white/55">
          write to <a href={`mailto:${SITE.emails.support}`} className="text-white underline underline-offset-4">{SITE.emails.support}</a> with your page address and what you were trying to do. we read everything.
        </p>
      </div>
    </>
  )
}
