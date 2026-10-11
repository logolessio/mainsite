'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowDown, Check, ShieldCheck } from 'lucide-react'
import { useRef } from 'react'
import { PillLink } from '@/components/motion/cta'
import { Marquee } from '@/components/motion/marquee'
import { DriftWord, Parallax } from '@/components/motion/parallax'
import { Layer, Tilt3D } from '@/components/motion/tilt'
import { Reveal, Rule } from '@/components/motion/reveal'
import { ScrollText } from '@/components/motion/scroll-text'
import { Words } from '@/components/motion/words'
import { campaigns } from '@/lib/campaigns'
import { CONTAINER } from '@/lib/layout'
import { SITE } from '@/lib/site'
import { Chapter } from './chapter'
import { FaqTabs } from './faq-tabs'

export function Welcome() {
  return (
    <main>
      <Hero />
      <Manifesto />
      <DriftWord text="brief" />
      <Chapter
        index="01"
        align="left"
        title="A brand posts the brief"
        body="A budget, a rate per thousand views, and a few honest rules about what to clip and what to leave alone. That is the entire campaign."
      >
        <Rule />
      </Chapter>
      <DriftWord text="clip" from="-40%" to="10%" />
      <Chapter
        index="02"
        align="right"
        title="Clippers cut it and post"
        body="Pick a campaign you like, make something better than the original, post it on your own account and drop the link in."
      >
        <Rule />
      </Chapter>
      <Chapter
        index="03"
        align="center"
        title="Every view is checked"
        body="Bot detection, brief checks and scheduled re-checks run on every clip. Real views get paid. Everything else does not."
      >
        <CheckStrip />
      </Chapter>
      <Chapter
        index="04"
        align="left"
        title="Paid straight to your bank"
        body="Earnings build up as views are verified. Withdraw through Stripe whenever you pass the minimum."
      >
        <PayoutCard />
      </Chapter>
      <Doors />
      <CoverRail />
      <section className={`${CONTAINER} py-32 text-center md:py-52`}>
        <Reveal>
          <p className="font-mono text-xs tracking-widest text-mute uppercase">Questions</p>
        </Reveal>
        <Words text="Before you start" className="mt-6 mb-20 font-display text-5xl md:text-8xl" />
        <FaqTabs />
      </section>
      <FinalCta />
    </main>
  )
}

function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, 160])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  return (
    <section ref={ref} className="relative flex min-h-dvh items-center justify-center overflow-hidden py-32">
      <motion.div style={{ y, opacity }} className={`${CONTAINER} relative`}>
        <Tilt3D global glare={false} max={5}>
          <div className="flex flex-col items-center text-center">
            <Reveal y={10}>
              <p className="font-mono text-xs tracking-widest text-mute uppercase">Our story</p>
            </Reveal>
            <Layer z={90}>
              <Words
                as="h1"
                sweep
                immediate
                delay={0.15}
                stagger={0.12}
                text="views have value"
                className="mt-10 max-w-[10ch] font-display text-[15vw] leading-[0.95] md:text-[8.5vw] xl:text-[132px]"
              />
            </Layer>
            <Layer z={30}>
              <Reveal delay={0.8}>
                <p className="mx-auto mt-12 max-w-md text-pretty text-lg leading-snug text-mute md:text-xl">
                  Brands, artists and streamers fund a brief. You cut the clips. You are paid for every thousand views that are real.
                </p>
              </Reveal>
            </Layer>
            <Reveal delay={1} className="mt-12 flex flex-wrap justify-center gap-3">
              <PillLink href="/">Browse campaigns</PillLink>
              <PillLink href="/for-brands" variant="ghost">
                Launch a campaign
              </PillLink>
            </Reveal>
            <motion.div
              aria-hidden="true"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="mt-16 hidden text-mute md:block"
            >
              <ArrowDown className="size-5" />
            </motion.div>
          </div>
        </Tilt3D>
      </motion.div>
    </section>
  )
}

function Manifesto() {
  return (
    <section className={`${CONTAINER} py-36 text-center md:py-56`}>
      <p className="mb-12 font-mono text-xs tracking-widest text-mute uppercase">Why we exist</p>
      <ScrollText
        className="max-w-[18ch] font-display text-4xl leading-[1] md:max-w-[24ch] md:text-7xl"
        text="Every song, stream and launch hides a hundred better clips. We pay the people who find them, for every view that is real."
      />
    </section>
  )
}

function CheckStrip() {
  const steps = ['Submitted', 'Scanned', 'Re-checked', 'Decided']
  return (
    <ol className="mx-auto grid max-w-3xl grid-cols-2 gap-px bg-line md:grid-cols-4 rounded-3xl overflow-hidden">
      {steps.map((s, i) => (
        <motion.li
          key={s}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.12, duration: 0.7 }}
          className="flex flex-col items-center gap-3 bg-ink px-4 py-8"
        >
          <ShieldCheck aria-hidden="true" className="size-5 text-mute" />
          <span className="font-display text-2xl">{s}</span>
        </motion.li>
      ))}
    </ol>
  )
}

function PayoutCard() {
  return (
    <div className="glass mx-auto max-w-md p-8 text-center">
      <p className="font-mono text-xs text-mute">Payout method</p>
      <p className="mt-2 font-display text-4xl">Bank account via Stripe</p>
      <ul className="mt-8 flex flex-col items-center gap-3 text-sm">
        {['Identity verified by Stripe', `Withdraw from $${SITE.minPayoutUsd}`, 'Funds arrive in your local currency'].map(
          (t) => (
            <li key={t} className="flex items-center gap-3 text-paper/85">
              <Check aria-hidden="true" className="size-4 text-signal" />
              {t}
            </li>
          ),
        )}
      </ul>
    </div>
  )
}

function Doors() {
  return (
    <section className={CONTAINER}>
      <div className="grid gap-px bg-line md:grid-cols-2">
      {[
        { kicker: 'For brands', title: 'Fund views, not guesses', body: 'Set your budget and your rate. Pay only for views that pass our checks.', href: '/for-brands', cta: 'Launch a campaign' },
        { kicker: 'For clippers', title: 'Turn your edits into income', body: 'No follower minimum. No fee to join. Just a brief, a clip and a link.', href: '/for-clippers', cta: 'Start clipping' },
      ].map((d, i) => (
        <Reveal key={d.title} delay={i * 0.12} className="bg-ink">
          <Tilt3D max={4} className="h-full">
            <div className="flex flex-col items-center px-8 py-20 text-center md:px-14 md:py-28">
              <p className="font-mono text-xs tracking-widest text-mute uppercase">{d.kicker}</p>
              <Layer z={50}>
                <h3 className="mt-6 max-w-[10ch] font-display text-5xl leading-[0.98] md:text-7xl">{d.title}</h3>
              </Layer>
              <p className="mt-8 max-w-xs text-mute">{d.body}</p>
              <PillLink href={d.href} variant="ghost" className="mt-12">
                {d.cta}
              </PillLink>
            </div>
          </Tilt3D>
        </Reveal>
      ))}
      </div>
    </section>
  )
}

function CoverRail() {
  return (
    <section className="py-32 text-center md:py-52">
      <div className={`${CONTAINER} mb-14`}>
        <Reveal>
          <p className="font-mono text-xs tracking-widest text-mute uppercase">On the board</p>
        </Reveal>
      </div>
      <Parallax distance={30}>
        <Marquee>
          {campaigns.map((c) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={c.id} src={c.cover} alt="" className="h-52 w-52 object-cover md:h-72 md:w-72" />
          ))}
        </Marquee>
      </Parallax>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-line py-36 md:py-56">
      <div className={`${CONTAINER} flex flex-col items-center text-center`}>
        <Words
          text="Make the views count"
          className="justify-center font-display text-[11vw] leading-[0.95] md:text-[7vw]"
        />
        <Reveal delay={0.3} className="mt-14 flex flex-wrap justify-center gap-3">
          <PillLink href="/onboarding">Create your account</PillLink>
          <PillLink href="/contact" variant="ghost">
            Talk to us
          </PillLink>
        </Reveal>
      </div>
    </section>
  )
}
