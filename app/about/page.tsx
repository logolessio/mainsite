import type { Metadata } from 'next'
import { CtaBand, Split } from '@/components/marketing/blocks'
import { PageHero, Section } from '@/components/marketing/page-hero'
import { Parallax } from '@/components/motion/parallax'
import { ScrollText } from '@/components/motion/scroll-text'

export const metadata: Metadata = { title: 'About — logoless', description: 'Why logoless exists.' }

export default function Page() {
  return (
    <main>
      <PageHero align="right" eyebrow="About" title="Names fade. Views stay" />
      <Section className="py-16 md:py-28">
        <ScrollText
          className="max-w-[22ch] font-display text-5xl leading-[0.95] md:text-8xl"
          text="The internet already rewards the best clips. We are making sure the people who cut them are paid too."
        />
      </Section>
      <Section className="py-16 md:py-28">
        <Parallax distance={40}>
          <Split label="The problem">
            <p>
              Great content gets reshared a thousand times and the people doing the work see none of it. Brands, on the
              other side, struggle to tell real reach from bought reach.
            </p>
          </Split>
        </Parallax>
        <Split label="The fix" flip>
          <p>
            A simple marketplace with one rule: money moves when real views happen. Briefs are clear, checks are
            consistent and payouts are automatic.
          </p>
        </Split>
        <Split label="The name">
          <p>
            logoless is about the work, not the badge. The clip speaks for itself, and the person behind it gets credit
            where it counts: in their balance.
          </p>
        </Split>
      </Section>
      <CtaBand title="Join in" href="/onboarding" label="Create an account" secondaryHref="/careers" secondaryLabel="Careers" />
    </main>
  )
}
