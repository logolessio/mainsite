'use client'

import { usePathname } from 'next/navigation'
import { isInvitePath } from '@/lib/invite-shared'
import { BrandIcon } from '@/components/brand-icon'
import { Logo } from '@/components/logo'
import { Reveal } from '@/components/motion/reveal'
import { CONTAINER } from '@/lib/layout'
import { FOOTER, LEGAL_LINKS, SITE } from '@/lib/site'
import { TransitionLink } from './transition-link'
import { T } from '@/components/shell/copy-provider'
import { Feature } from './features-provider'

const HIDDEN = ['/onboarding', '/dashboard', '/brand', '/admin', '/@', '/u/']

export function SiteFooter() {
  const pathname = usePathname()
  if (HIDDEN.some((p) => pathname.startsWith(p)) || isInvitePath(pathname)) return null

  return (
    <footer className="island relative z-10 bg-ink [contain-intrinsic-size:auto_600px] [content-visibility:auto]">
      <div className={`${CONTAINER} py-20 md:py-28`}>
        <div className="grid gap-16 md:grid-cols-12 md:gap-10">
          <Reveal className="md:col-span-4">
            <Logo className="h-12 md:h-14" />
            <p className="mt-8 max-w-xs text-[15px] leading-relaxed text-paper/50">
              <T>Brands, artists and streamers fund a brief. Clippers cut it, post it and are paid for every verified view.</T>
            </p>
            <div className="mt-8 flex items-center gap-5 text-paper/50">
              {([
                ['discord', 'Discord', SITE.social.discord],
                ['x', 'X', SITE.social.x],
                ['tiktok', 'TikTok', SITE.social.tiktok],
                ['instagram', 'Instagram', SITE.social.instagram],
                ['youtube', 'YouTube', SITE.social.youtube],
              ] as const).map(([name, label, href]) => (
                <a key={name} href={href} aria-label={label} className="transition-colors hover:text-paper">
                  <BrandIcon name={name} className="size-5" />
                </a>
              ))}
            </div>
          </Reveal>

          <div className="grid grid-cols-2 gap-x-6 gap-y-14 sm:grid-cols-4 md:col-span-8">
            {Object.entries(FOOTER).map(([group, links], i) => (
              <Reveal key={group} delay={0.06 * (i + 1)}>
                <h3 className="text-[15px] text-paper/40"><T>{group}</T></h3>
                <ul className="mt-5 flex flex-col gap-3 text-[15px]">
                  {links.map((l) => (
                    <li key={l.href}>
                      <TransitionLink href={l.href} className="text-paper/85 transition-colors hover:text-paper">
                        <T>{l.label}</T>
                      </TransitionLink>
                    </li>
                  ))}
                  {group === 'Company' && (
                    <Feature id="developers">
                      <li>
                        <TransitionLink href="/developers" className="text-paper/85 transition-colors hover:text-paper">
                          Developers
                        </TransitionLink>
                      </li>
                    </Feature>
                  )}
                </ul>
              </Reveal>
            ))}
            <Reveal delay={0.3}>
              <h3 className="text-[15px] text-paper/40">Legal</h3>
              <ul className="mt-5 flex flex-col gap-3 text-[15px]">
                {LEGAL_LINKS.slice(0, 4).map((l) => (
                  <li key={l.href}>
                    <TransitionLink href={l.href} className="text-paper/85 transition-colors hover:text-paper">
                      {l.label}
                    </TransitionLink>
                  </li>
                ))}
                <li>
                  <TransitionLink href="/legal" className="text-paper/50 transition-colors hover:text-paper">
                    All legal
                  </TransitionLink>
                </li>
              </ul>
            </Reveal>
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-8 border-t border-line pt-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl space-y-3 text-[13px] leading-relaxed text-paper/40">
            <p>
              © {new Date().getFullYear()} {SITE.company.replace(/\.$/, '')}. All rights reserved.
            </p>
            <p>
              logoless is not affiliated with or endorsed by TikTok, YouTube, Instagram, Discord or PayPal. Payments are processed by PayPal. YouTube content is subject to the{' '}
              <a className="underline underline-offset-2 hover:text-paper" href="https://www.youtube.com/t/terms">
                YouTube Terms of Service
              </a>{' '}
              and the{' '}
              <a className="underline underline-offset-2 hover:text-paper" href="https://policies.google.com/privacy">
                Google Privacy Policy
              </a>
              .
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Feature id="status-page">
              <TransitionLink href="/status" className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm text-paper/60 transition-colors hover:text-paper">
                <span className="size-2 rounded-full bg-emerald-400" /> System status
              </TransitionLink>
            </Feature>
          </div>
        </div>
      </div>
    </footer>
  )
}
