import type { Metadata } from 'next'
import { PageHead, SiteFrame } from '@/components/site/site-frame'

export const metadata: Metadata = { title: 'About | logoless', description: 'logoless is a link in bio for video editors and anyone who makes things move.' }

const FACTS = [
  ['50 MB', 'of your own storage'],
  ['10', 'music visualisers'],
  ['4', 'ways to show lyrics'],
  ['any', 'number of extra pages'],
  ['0', 'ads or trackers'],
  ['free', 'and staying that way'],
]

const BELIEFS = [
  { h: 'your page should look like your work', p: 'an editor’s link in bio is usually the plainest thing they make. we built a page that moves like an edit does: backgrounds that move, a 3D card, music, a cursor, an entrance.' },
  { h: 'put things where you want them', p: 'start from a template, then pick up any piece of the page and put it anywhere. your colours, your type, your layout.' },
  { h: 'the song matters', p: 'so it can be a whole song, slowed or sped up, with a visualiser and the lyrics in time. the way people already hear your edits.' },
  { h: 'nothing to sell', p: 'no ads, no tracking pixels, no selling data. we count views and clicks so you can see them, and that is it.' },
  { h: 'easy to leave', p: 'download your whole page as a file, clear your uploads, or ask us to delete everything. it is your page.' },
]

export default function Page() {
  return (
    <SiteFrame current="/about" wide>
      <PageHead kicker="about" title={<>a link in bio,<br />but make it move.</>} lead="logoless gives every person logoless.io/their-name: one full-screen page with their links, their videos and their sound, built in an editor that shows every change as you make it." />
      <dl className="mt-16 grid grid-cols-2 border-t border-l border-white/10 sm:grid-cols-3">
        {FACTS.map(([n, l]) => (
          <div key={l} className="border-r border-b border-white/10 p-6">
            <dt className="text-[0.76rem] text-white/45">{l}</dt>
            <dd className="disp mt-3 text-[clamp(2.2rem,6vw,3.6rem)]">{n}</dd>
          </div>
        ))}
      </dl>
      <section className="mt-24 grid gap-12 md:grid-cols-[1fr_1.4fr]">
        <h2 className="disp text-[clamp(2rem,5vw,3.2rem)]">what we think</h2>
        <ol className="grid gap-10">
          {BELIEFS.map((b, i) => (
            <li key={b.h} className="grid grid-cols-[2.2rem_1fr]">
              <span className="text-[0.7rem] tabular-nums text-white/35">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="text-[1.05rem]">{b.h}</h3>
                <p className="mt-2 text-[0.88rem] leading-relaxed text-white/60">{b.p}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-24 flex flex-wrap items-center justify-between gap-6 border border-white/15 p-8">
        <div>
          <p className="disp text-[clamp(1.8rem,4vw,2.6rem)]">claim your name.</p>
          <p className="mt-2 text-[0.84rem] text-white/55">it takes a few seconds. the short ones go fast.</p>
        </div>
        <div className="flex gap-2">
          <a href="/help" className="btn">
            read the guides
          </a>
          <a href="/signup" className="btn btn-solid">
            get started
          </a>
        </div>
      </section>
    </SiteFrame>
  )
}
