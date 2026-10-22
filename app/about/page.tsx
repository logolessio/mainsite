import type { Metadata } from 'next'
import { ArchSection, PageToc } from '@/components/marketing/anubis'
import { CtaBand } from '@/components/marketing/blocks'
import { Breadcrumbs, Related } from '@/components/marketing/breadcrumbs'
import { Compare, Principles, SplitBeat, StatRow, Steps } from '@/components/marketing/layouts'
import { PageHero } from '@/components/marketing/page-hero'
import { PillLink } from '@/components/motion/cta'
import { T } from '@/components/shell/copy-provider'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'About logoless',
  description: 'logoless is a marketplace where the people who cut content get paid for the views those submissions earn.',
  alternates: { canonical: '/about' },
}

const TOC = [
  { id: 'story', label: 'Why we built it' },
  { id: 'believe', label: 'What we believe' },
  { id: 'how', label: 'How it works' },
  { id: 'numbers', label: 'In numbers' },
  { id: 'fair', label: 'Who gets what' },
  { id: 'contact', label: 'Talk to us' },
]

/** Pictures for the arch: the site's own sample covers. */
const ARTWORK = ['01', '02', '03', '04', '05'].map((n) => ({ src: `/covers/${n}.jpg` }))

export default function Page() {
  return (
    <main>
      <PageToc items={TOC} />
      <Breadcrumbs trail={[{ name: 'About' }]} />
      <PageHero
        eyebrow="Who we are"
        title="Submissions should pay"
        lede="Logoless is a platform developed by creators for creators. We help brands and artists get the attention and traction they deserve through streamlined campaigns that make earning from your content sooooo much easier."
        badges={{ solid: { href: '/onboarding?role=clipper', top: 'Creators', bottom: 'Get started' }, outline: { href: '/for-brands', label: 'Brands' } }}
      >
        <PillLink href="/onboarding">Get started</PillLink>
      </PageHero>

      <div id="story">
        <SplitBeat title="Why we built it">
          <p>
            <T>Cutting a clip, editing a short or remixing a song is real work, and most of the time the person who did it is paid nothing. Brands and artists have the opposite problem. They know people are posting about their work, but they cannot tell which views are real or who to pay.</T>
          </p>
          <p className="mt-6">
            <T>Logoless puts both sides in one place. A brand or artist sets a brief, a budget and a rate for every 1,000 views. Creators pick a campaign, post on their own accounts and submit the link. We check the post and its views, and then the money moves.</T>
          </p>
        </SplitBeat>
      </div>

      <ArchSection id="made" title="The work comes first" items={ARTWORK} caption="sample artwork">
        <T>Every campaign starts with something worth sharing: a song, a stream, a launch. Creators turn it into posts people actually want to watch, on TikTok, YouTube and Instagram, and the views those posts earn are what get paid.</T>
      </ArchSection>

      <div id="believe">
        <Principles
          title="What we believe"
          items={[
            { title: 'Credit goes to the creator', body: 'A good post can be re-shared a thousand times while the person who made it gets nothing. We want to change that.' },
            { title: 'Only real views count', body: 'We check every submission and its views before anything is paid, so brands pay for what they get.' },
            { title: 'Keep it simple', body: 'Briefs, rules and fees are written in plain language. If something is unclear, tell us and we will fix it.' },
            { title: 'Fair to both sides', body: 'Creators keep every dollar a campaign pays them. Brands pay our fee on top of that, so the price a brand sets is the price a creator earns.' },
            { title: 'What you post stays yours', body: 'Everything you post stays on your own accounts and belongs to you. We only track the views.' },
            { title: 'People step in where machines cannot', body: 'Automatic checks do the routine work. When a platform will not let us read something, like an Instagram bio, a person on our team looks at it instead.' },
          ]}
        />
      </div>

      <div id="how">
        <Steps
          title="How it works"
          steps={[
            { title: 'A brand sets the brief', body: 'A brand or artist describes the campaign, sets a budget and a rate for every 1,000 views, and adds any rules creators must follow.' },
            { title: 'Creators join and post', body: 'Creators join a campaign for free, post on their own account on a platform the campaign allows, and submit the link.' },
            { title: 'We verify the views', body: 'We check each submission before anything is paid. TikTok and YouTube views are looked at again about every two hours while a campaign runs, and Instagram numbers are checked by hand.' },
            { title: 'Creators get paid', body: `Verified earnings can be withdrawn to PayPal whenever you like, from $${SITE.minPayoutUsd}. We cover PayPal's own fees.` },
          ]}
        />
      </div>

      <div id="numbers">
        <StatRow
          stats={[
            { value: '3', label: 'Platforms', note: 'TikTok, YouTube and Instagram' },
            { value: '2h', label: 'Between view checks', note: 'TikTok and YouTube views are looked at again about every two hours' },
            { value: `${SITE.platformFeePct}%`, label: 'Our fee', note: `Paid by brands on top, never taken from creators. None on a brand's first ${SITE.freeFeeCampaigns} campaigns` },
            { value: `$${SITE.minPayoutUsd}`, label: 'Smallest payout', note: 'The least you can withdraw to PayPal at once' },
          ]}
        />
      </div>

      <div id="fair">
        <Compare
          left={{ title: 'Creators', items: ['Join any campaign for free', 'Keep everything a campaign pays you', 'No follower minimum', 'Withdraw to PayPal whenever you like', 'See the reason when a submission is turned down'] }}
          right={{ title: 'Brands and artists', items: ['Set your own budget and rate', `No fee on your first ${SITE.freeFeeCampaigns} campaigns`, 'Pay only for views we verify', 'Your budget is a hard cap', 'Turn down any submission', 'What you do not spend stays yours'] }}
        />
      </div>

      <div id="contact">
        <SplitBeat title="Talk to us">
          <p>
            <T>Questions, ideas, or a problem with a payment? Write to us from the contact page. We answer every message.</T>
          </p>
          <div className="mt-8">
            <PillLink href="/contact" variant="ghost">
              Contact us
            </PillLink>
          </div>
        </SplitBeat>
      </div>

      <CtaBand title="Come and join us" href="/onboarding" label="Get started" />
      <Related links={[{ href: '/for-creators', label: 'For creators' }, { href: '/for-brands', label: 'For brands' }, { href: '/pricing', label: 'Pricing' }, { href: '/faq', label: 'Q&A' }, { href: '/contact', label: 'Contact' }]} />
    </main>
  )
}
