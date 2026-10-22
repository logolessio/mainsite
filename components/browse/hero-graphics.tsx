'use client'

import { TransitionLink } from '@/components/shell/transition-link'

/**
 * The home page's hero, drawn the way the Anubis page draws its own: two round badges either side of the title (one solid, one an outline, set at different
 * heights), and one hairline that leaves the left badge, turns a corner, runs under the title and turns down again into an arrow that points at the search
 * bar. The badges are real links; the path is only a drawing. Wide screens only: below that the title and its one button stand alone.
 * Every length is fixed (the hero is never wider than 48rem), so the corners stay true circles.
 */
export function HeroGraphics({ signedIn, smartCta }: { signedIn: boolean; smartCta: boolean }) {
  const solid = !signedIn ? { href: '/onboarding', top: 'Creators', bottom: 'Get started' } : smartCta ? { href: '/dashboard', top: 'Your', bottom: 'Dashboard' } : null
  const line = 'border-paper/55'
  return (
    <div className="hidden xl:block">
      {solid && (
        <TransitionLink href={solid.href} className="hero-badge absolute top-[88px] right-[calc(100%+40px)] grid size-[132px] place-items-center rounded-full bg-paper text-center font-mono text-[12px] leading-[1.7] tracking-[0.1em] text-ink uppercase transition-[transform,box-shadow] duration-500 hover:scale-[1.05]">
          <span>
            {solid.top}
            <br />
            <span aria-hidden="true">-</span>
            <br />
            {solid.bottom}
          </span>
        </TransitionLink>
      )}
      <TransitionLink href="/for-brands" className="hero-badge hero-badge-b absolute top-[150px] left-[calc(100%+40px)] grid size-[132px] place-items-center rounded-full border border-paper/70 text-center font-mono text-[13px] tracking-[0.12em] text-paper uppercase transition-[transform,background-color,color] duration-500 hover:scale-[1.05] hover:bg-paper hover:text-ink">
        Brands
      </TransitionLink>
      {solid && (
        <div aria-hidden="true" className="hero-path pointer-events-none">
          <span className={`absolute top-[220px] bottom-[96px] left-[-106px] w-px border-l ${line}`} />
          <span className={`absolute bottom-[52px] left-[-106px] size-11 rounded-bl-[44px] border-b border-l ${line}`} />
          <span className={`absolute bottom-[52px] left-[-62px] h-px w-[calc(50%+18px)] border-b ${line}`} />
          <span className={`absolute top-[calc(100%-53px)] left-[calc(50%-44px)] h-11 w-11 rounded-tr-[44px] border-t border-r ${line}`} />
          <svg className="absolute top-[calc(100%-10px)] left-[calc(50%-8px)] text-paper/55" width="17" height="9" viewBox="0 0 17 9" fill="none">
            <path d="M1 1l7.5 7L16 1" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
      )}
    </div>
  )
}
