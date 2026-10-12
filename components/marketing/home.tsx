'use client'

import { PillLink } from '@/components/motion/cta'
import { Marquee } from '@/components/motion/marquee'
import { Reveal } from '@/components/motion/reveal'
import { ScrollText } from '@/components/motion/scroll-text'
import { Words } from '@/components/motion/words'
import { campaigns } from '@/lib/campaigns'
import { CONTAINER } from '@/lib/layout'
import { CtaBand } from './blocks'
import { FaqTabs } from './faq-tabs'
import { Steps } from './layouts'
import { PageHero } from './page-hero'

/** The long version of the story, linked as "Our story". */
export function Welcome() {
  return (
    <main>
      <PageHero
        eyebrow="Our story"
        title="Views have value"
        lede="Brands, artists and streamers fund a brief. You cut the clips. You get paid for every thousand views that are real."
      >
        <PillLink href="/">Browse campaigns</PillLink>
        <PillLink href="/for-brands" variant="ghost">
          Launch a campaign
        </PillLink>
      </PageHero>

      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <ScrollText
          className="max-w-[26ch] font-display text-4xl leading-[1] tracking-[-0.04em] md:text-[4.5rem]"
          text="Every release, stream and launch has people out there cutting it into clips. We think they should get paid for the ones that land."
        />
      </section>

      <Steps
        title="How it works"
        steps={[
          { title: 'A brand writes a brief', body: 'A budget, a rate per thousand views, and a few rules about what to clip and what to leave alone.' },
          { title: 'Clippers cut it and post', body: 'Pick a campaign you like, make your own cut, post it on your account and paste the link in.' },
          { title: 'We check the views', body: "We review each clip and look up the real view count. Real views get paid, everything else doesn't." },
          { title: 'Money goes to your bank', body: "Earnings build up as views are verified. Withdraw through Stripe once you're past the minimum." },
        ]}
      />

      <section className="border-t border-line py-24 md:py-40">
        <div className={`${CONTAINER} mb-14`}>
          <Words as="h2" align="left" text="Live right now" className="font-display text-5xl leading-[0.95] tracking-[-0.04em] md:text-[5rem]" />
        </div>
        <Marquee>
          {campaigns.map((c) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={c.id} src={c.cover} alt="" className="h-52 w-52 rounded-2xl object-cover md:h-72 md:w-72" />
          ))}
        </Marquee>
      </section>

      <section className={`${CONTAINER} border-t border-line py-24 md:py-40`}>
        <div className="grid gap-20 md:grid-cols-2 md:gap-10">
          {[
            { kicker: 'For brands', title: 'Fund a campaign', body: 'Set a budget and a rate. You only pay for views that check out.', href: '/for-brands', cta: 'Launch a campaign' },
            { kicker: 'For clippers', title: 'Get paid for your edits', body: 'No follower minimum and no fee to join. All you need is a brief, a clip and a link.', href: '/for-clippers', cta: 'Start clipping' },
          ].map((d, i) => (
            <Reveal key={d.title} delay={i * 0.1}>
              <p className="text-[15px] text-paper/45">{d.kicker}</p>
              <h3 className="mt-6 max-w-[11ch] font-display text-5xl leading-[0.95] tracking-[-0.04em] md:text-[4.5rem]">{d.title}</h3>
              <p className="mt-8 max-w-sm text-lg leading-relaxed text-paper/60">{d.body}</p>
              <PillLink href={d.href} variant="ghost" className="mt-10">
                {d.cta}
              </PillLink>
            </Reveal>
          ))}
        </div>
      </section>

      <section className={`${CONTAINER} border-t border-line py-24 md:py-40`}>
        <Words as="h2" align="left" text="Questions people ask" className="mb-16 font-display text-5xl leading-[0.95] tracking-[-0.04em] md:text-[5rem]" />
        <FaqTabs />
      </section>

      <CtaBand title="Come and take a look" href="/onboarding" label="Make an account" secondaryHref="/contact" secondaryLabel="Talk to us" />
    </main>
  )
}
