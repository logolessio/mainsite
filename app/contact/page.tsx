import type { Metadata } from 'next'
import { PageHead, SiteFrame } from '@/components/site/site-frame'
import { SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'Contact | logoless', description: 'How to reach logoless: support, privacy, legal, press and reports.' }

const ROWS = [
  { what: 'help with your page or account', who: SITE.emails.support, note: 'include your page address. most answers are in the guides first.', link: { href: '/help', label: 'read the guides' } },
  { what: 'a page that breaks the rules', who: SITE.emails.abuse, note: 'or use the report form, which fills the email in for you.', link: { href: '/report', label: 'report a page' } },
  { what: 'your data and privacy', who: SITE.emails.privacy, note: 'access, export or deletion of what we keep about you.', link: { href: '/legal/privacy', label: 'privacy policy' } },
  { what: 'copyright and legal', who: SITE.emails.legal, note: 'takedown notices, counter-notices and anything legal.', link: { href: '/legal/dmca', label: 'copyright & DMCA' } },
  { what: 'a security problem', who: SITE.emails.support, note: 'please don’t post it publicly. see how we handle reports.', link: { href: '/legal/security', label: 'responsible disclosure' } },
  { what: 'press', who: SITE.emails.press, note: 'stories, interviews, assets.', link: null },
]

export default function Page() {
  return (
    <SiteFrame current="/contact">
      <PageHead kicker="contact" title="talk to us" lead="pick what it's about, so it reaches the right person sooner. we answer in English, usually within two working days." />
      <ul className="mt-14 border-b border-white/10">
        {ROWS.map((r) => (
          <li key={r.what} className="grid gap-2 border-t border-white/10 py-6 sm:grid-cols-[1fr_auto] sm:items-baseline">
            <div>
              <p className="text-[0.95rem]">{r.what}</p>
              <p className="mt-1 text-[0.8rem] text-white/50">
                {r.note}{' '}
                {r.link && (
                  <a href={r.link.href} className="underline underline-offset-4 hover:text-white">
                    {r.link.label}
                  </a>
                )}
              </p>
            </div>
            <a href={`mailto:${r.who}`} className="text-[0.88rem] text-white underline underline-offset-4">
              {r.who}
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-14">
        <p className="cap text-white/40">elsewhere</p>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[0.86rem]">
          {Object.entries(SITE.social).map(([k, v]) => (
            <li key={k}>
              <a href={v} target="_blank" rel="noopener noreferrer" className="text-white/65 hover:text-white">
                {k === 'x' ? 'X' : k[0].toUpperCase() + k.slice(1)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </SiteFrame>
  )
}
