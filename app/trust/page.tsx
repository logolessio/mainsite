import type { Metadata } from 'next'
import { CtaBand, FeatureGrid } from '@/components/marketing/blocks'
import { Principles, Steps } from '@/components/marketing/layouts'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollText } from '@/components/motion/scroll-text'
import { CONTAINER } from '@/lib/layout'

export const metadata: Metadata = {
  title: 'Fraud protection | logoless',
  description: 'Every view is checked before it is paid.',
}

export default function Page() {
  return (
    <main>
      <PageHero
        eyebrow="Trust and safety"
        title="Only real views get paid"
        lede="Fake views hurt brands and honest clippers alike. So every clip gets looked at, and every view count is checked on the platform before it's paid."
      />
      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <ScrollText className="max-w-[26ch] font-display text-4xl leading-[1] tracking-[-0.04em] md:text-[4.5rem]" text="A clip comes in. We read the brief, watch it, check the numbers on the platform, and check them again later." />
      </section>
      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <FeatureGrid
          features={[
            { title: 'We read the brief and watch the clip', body: 'Each clip is compared with the campaign rules before it can earn anything.' },
            { title: 'We check the numbers ourselves', body: "We look up the real view count on the platform instead of taking anyone's word for it." },
            { title: 'We check again later', body: "Views are re-checked while a campaign is running, so a clip that was fine on day one isn't assumed to be fine forever." },
            { title: 'A person decides', body: 'Anything doubtful gets a closer look from our team, and likely fraud is rejected.' },
          ]}
        />
      </section>
      <Steps
        title="What happens to a clip"
        steps={[
          { title: "It's submitted", body: 'A clipper pastes the link to a clip they posted on their own account.' },
          { title: 'We review it', body: 'We compare it with the brief and look at how its views behave.' },
          { title: 'We check again', body: 'Views are checked again on a schedule while the campaign runs.' },
          { title: 'We decide', body: 'Clear passes are approved. Anything doubtful gets a closer look. Likely fraud is rejected, with a reason you can see.' },
        ]}
      />
      <Principles
        title="What isn't paid"
        items={[
          { title: 'Bots and click farms', body: "Traffic that real audiences don't produce is rejected, and those views are never paid." },
          { title: 'Bought or incentivised views', body: "Views that were purchased, or paid for in breach of platform rules, don't count." },
          { title: 'Clips that break the brief', body: "A clip that breaks the campaign rules doesn't earn." },
          { title: 'Honest edits are safe', body: 'Real work is never penalised. If you think we got a decision wrong, email us and we will look again.' },
        ]}
      />
      <section className={`${CONTAINER} pb-24 md:pb-32`}>
        <p className="max-w-xl text-lg leading-relaxed text-paper/60">
          To report abuse or botting, write to{' '}
          <a href="mailto:abuse@logoless.io" className="text-paper underline underline-offset-4">
            abuse@logoless.io
          </a>
          .
        </p>
      </section>
      <CtaBand title="See what's live" href="/" label="Browse campaigns" />
    </main>
  )
}
