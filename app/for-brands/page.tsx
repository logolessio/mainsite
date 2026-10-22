import type { Metadata } from 'next'
import { PageToc } from '@/components/marketing/anubis'
import { CtaBand } from '@/components/marketing/blocks'
import { Breadcrumbs, Related } from '@/components/marketing/breadcrumbs'
import { BrandCalculator } from '@/components/marketing/calculators'
import { Principles, Steps } from '@/components/marketing/layouts'
import { FeePromise } from '@/components/marketing/fee-promise'
import { PageHero } from '@/components/marketing/page-hero'
import { RolePreview } from '@/components/marketing/role-preview'
import { PillLink } from '@/components/motion/cta'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Launch a campaign | logoless',
  description: 'Turn one song, stream or launch into hundreds of submissions. You set the budget and the rate, and pay only for views we verify.',
  alternates: { canonical: '/for-brands' },
}

const TOC = [
  { id: 'fees', label: 'Fees' },
  { id: 'how', label: 'How we work' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'good', label: 'Good to know' },
]

export default function Page() {
  return (
    <main>
      <PageToc items={TOC} />
      <Breadcrumbs trail={[{ name: 'For brands' }]} />
      <PageHero eyebrow="For brands and artists" title="Are you tired of paying for empty views?" lede="Turn one song, stream or launch into hundreds of submissions on TikTok, YouTube and Instagram. We streamline getting your content to the audience it deserves. Never pay for 'empty views' again." badges={{ solid: { href: '/onboarding?role=brand', top: 'Brands', bottom: 'Launch one' }, outline: { href: '/for-creators', label: 'Creators' } }}>
        <PillLink href="/onboarding?role=brand">Launch a campaign</PillLink>
      </PageHero>

      <div id="fees">
        <FeePromise audience="brands" />
      </div>
      <RolePreview role="brand" />
      <div id="how">
      <Steps
        title="How we work"
        steps={[
          { title: 'Describe your campaign', body: "Say exactly what you want, what creators should and shouldn't do and add specific rules and regulations that our team will thoroughly enforce." },
          { title: 'Fund your campaign', body: "You add funds to your account balance and put as much as you like towards each campaign. You can add, remove, edit and withdraw your funds whenever you like." },
          { title: 'See the results', body: 'Our creators post exactly what you described and get paid for their views. Your media gets the views it deserves.' },
        ]}
      />
      </div>
      <div id="calculator">
        <BrandCalculator />
      </div>
      <div id="good">
      <Principles
        title="Good to know"
        items={[
          { title: `Your first ${SITE.freeFeeCampaigns} campaigns are free of our fee`, body: `Creators earn what the campaign pays them, and you pay exactly that: no platform fee on your first ${SITE.freeFeeCampaigns} campaigns. After those, our ${SITE.platformFeePct}% fee is added on top and shown before you start.` },
          { title: 'Your budget is a hard cap', body: `The budget you set is the most a campaign can pay creators. Money leaves your balance only as submissions earn it, and our ${SITE.platformFeePct}% fee is added on top and shown before you start.` },
          { title: 'Your funds are safe with us', body: 'Your account has one simple pot to manage, campaigns are funded from it and you can add and withdraw as much or as little as you like.' },
          { title: 'You can say no', body: "You also have the right to turn down any submitted content. Our staff and automated systems will also check all details for you." },
          { title: 'Money stays yours', body: 'What you do not spend stays in your balance, and you can ask for it back. If you over funded a campaign or changed your mind, recovering your unspent money is simple.' },
        ]}
      />
      </div>
      <CtaBand title="Launch your first campaign" href="/onboarding?role=brand" label="Launch a campaign" />
      <Related links={[{ href: '/pricing', label: 'Pricing' }, { href: '/faq', label: "Q&A" }, { href: '/case-studies', label: 'Case studies' }]} />
    </main>
  )
}
