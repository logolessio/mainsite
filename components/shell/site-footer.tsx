'use client'

import { usePathname } from 'next/navigation'
import { BrandIcon } from '@/components/brand-icon'
import { Logo } from '@/components/logo'
import { Reveal } from '@/components/motion/reveal'
import { CONTAINER } from '@/lib/layout'
import { FOOTER, LEGAL_LINKS, SITE } from '@/lib/site'
import { TransitionLink } from './transition-link'
import { T } from '@/components/shell/copy-provider'

const HIDDEN = ['/onboarding', '/dashboard', '/brand', '/admin']

export function SiteFooter() {
  const pathname = usePathname()
  if (HIDDEN.some((p) => pathname.startsWith(p))) return null

  return (
    <footer className="relative z-10 border-t border-line bg-ink [contain-intrinsic-size:auto_600px] [content-visibility:auto]">
      <div className={`${CONTAINER} py-24 md:py-36`}>
        <div className="flex flex-col items-center gap-20 text-center">
          <Reveal className="flex flex-col items-center">
            <Logo className="h-16 md:h-20" />
            <p className="mx-auto mt-8 max-w-xs text-sm leading-relaxed text-mute">
              <T>Brands, artists and streamers fund a brief. Clippers cut it, post it and are paid for every verified view.</T>
            </p>
            <div className="mt-8 flex items-center justify-center gap-6 text-mute">
              <a href={SITE.social.discord} aria-label="Discord" className="transition-colors hover:text-paper">
                <BrandIcon name="discord" className="size-5" />
              </a>
              <a href={SITE.social.x} aria-label="X" className="transition-colors hover:text-paper">
                <BrandIcon name="x" className="size-5" />
              </a>
              <a href={SITE.social.tiktok} aria-label="TikTok" className="transition-colors hover:text-paper">
                <BrandIcon name="tiktok" className="size-5" />
              </a>
              <a href={SITE.social.instagram} aria-label="Instagram" className="transition-colors hover:text-paper">
                <BrandIcon name="instagram" className="size-5" />
              </a>
              <a href={SITE.social.youtube} aria-label="YouTube" className="transition-colors hover:text-paper">
                <BrandIcon name="youtube" className="size-5" />
              </a>
            </div>
          </Reveal>

          <div className="grid w-full grid-cols-2 gap-14 sm:grid-cols-4">
            {Object.entries(FOOTER).map(([group, links], i) => (
              <Reveal key={group} delay={0.08 * (i + 1)}>
                <h3 className="font-mono text-xs text-mute"><T>{group}</T></h3>
                <ul className="mt-5 flex flex-col gap-3 text-sm">
                  {links.map((l) => (
                    <li key={l.href}>
                      <TransitionLink href={l.href} className="text-paper/85 transition-colors hover:text-paper">
                        <T>{l.label}</T>
                      </TransitionLink>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
            <Reveal delay={0.4}>
              <h3 className="font-mono text-xs text-mute">Legal</h3>
              <ul className="mt-5 flex flex-col gap-3 text-sm">
                {LEGAL_LINKS.slice(0, 6).map((l) => (
                  <li key={l.href}>
                    <TransitionLink href={l.href} className="text-paper/85 transition-colors hover:text-paper">
                      {l.label}
                    </TransitionLink>
                  </li>
                ))}
                <li>
                  <TransitionLink href="/legal" className="text-mute transition-colors hover:text-paper">
                    All legal →
                  </TransitionLink>
                </li>
              </ul>
            </Reveal>
          </div>
        </div>

        <div className="mt-24 flex flex-col items-center gap-3 border-t border-line pt-8 text-center text-xs text-mute">
          <p>
            © {new Date().getFullYear()} {SITE.company}. All rights reserved.
          </p>
          <p className="max-w-xl">
            logoless is not affiliated with or endorsed by TikTok, YouTube, Instagram, Discord or Stripe. Payments are
            processed by Stripe. YouTube content is subject to the{' '}
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
      </div>
    </footer>
  )
}
