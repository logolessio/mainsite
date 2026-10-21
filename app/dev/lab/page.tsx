import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { TestLab, type LabGroup } from '@/components/dev/test-lab'
import { FEATURES } from '@/lib/feature-defs'
import { pageDev } from '@/lib/user'

export const metadata: Metadata = { title: 'Test lab | logoless', robots: { index: false } }

/** The flows worth walking through by hand, each with where to start. The feature switches below them are listed automatically. */
const FLOWS: LabGroup[] = [
  {
    title: 'Joining',
    sub: 'What a new person goes through.',
    items: [
      { id: 'flow-signup', label: 'Make an account with an email', body: 'The code in the email copies in one go, and the card looks right on a phone.', href: '/login' },
      { id: 'flow-forgot', label: 'Reset a password', body: 'The email, the code, the new password.', href: '/forgot-password' },
      { id: 'flow-onboard-creator', label: 'Onboarding as a creator', body: 'Typed welcome, PayPal email, name, pictures, accounts proven one step at a time.', href: '/onboarding?preview=1&role=clipper' },
      { id: 'flow-onboard-brand', label: 'Onboarding as a brand', body: 'Brand name and website, then the dashboard tour.', href: '/onboarding?preview=1&role=brand' },
      { id: 'flow-waitlist', label: 'The launch page and waitlist', body: 'Countdown, join the waitlist, reserve a username, the confirmation email.', href: '/launch' },
      { id: 'flow-links', label: 'The links page', body: 'Plain and minimal: the logo, one button, a few rows.', href: '/links' },
    ],
  },
  {
    title: 'As a creator',
    items: [
      { id: 'c-profile', label: 'Edit your profile', body: 'Click anything on the page to change it. Privacy is a window in here too.', href: '/dashboard/profile' },
      { id: 'c-badges', label: 'Arrange badges', body: 'Press a badge to add it, drag to reorder, the cross to remove. They glide, never stretch.', href: '/dashboard/achievements' },
      { id: 'c-accounts', label: 'Add and prove an account in one step', body: 'Username, then the code in the bio, then the check.', href: '/dashboard/accounts' },
      { id: 'c-paypal', label: 'Add a PayPal email', body: 'Shown masked, edited with the pencil, confirmed with a code.', href: '/dashboard/earnings' },
      { id: 'c-notify', label: 'Notifications', body: 'Drag one sideways to dismiss it. Use "Send me three notifications" above to fill the bell.', href: '/dashboard/notifications' },
      { id: 'c-discord', label: 'The Discord page', body: 'Link, roles, and which things arrive as messages.', href: '/dashboard/discord' },
      { id: 'c-submit', label: 'Submit a clip (practice)', body: 'The whole check, ending approved, declined, or sent to a person.', href: '/dev/previews' },
    ],
  },
  {
    title: 'As a brand',
    items: [
      { id: 'b-build', label: 'Make a campaign', body: 'Start from what you are launching, a readiness meter, estimates, and a "sent" screen at the end.', href: '/brand/campaigns/new' },
      { id: 'b-list', label: 'Follow a request', body: 'A journey bar from sent to live, and a banner when the team asks for changes.', href: '/brand/campaigns' },
      { id: 'b-balance', label: 'Add funds', body: 'PayPal top-up and the balance page.', href: '/brand/balance' },
    ],
  },
  {
    title: 'As the team',
    items: [
      { id: 't-review', label: 'Review a campaign request in full', body: 'Make a request above, then open it: preview, checks, brand history, accept, ask for changes, reject.', href: '/admin/campaigns' },
      { id: 't-popup', label: 'The campaign background', body: 'Set a background in the builder, then open the campaign: it shows behind the pop-up.', href: '/' },
      { id: 't-people', label: 'People, and shared networks', body: 'The "Shared network" filter shows accounts made from the same address.', href: '/admin/people?f=ip' },
      { id: 't-email', label: 'Every email', body: 'Preview and send a test of each one. The code box selects whole.', href: '/admin/email' },
      { id: 't-discord', label: 'Every Discord message', body: 'Previews of each card, including the profile card and the direct messages.', href: '/admin/discord' },
      { id: 't-card', label: 'The Discord profile card', body: 'The picture the bot posts for /profile: banner, picture, badges as medals.', href: '/api/discord/card/profile/sample' },
      { id: 't-payout', label: 'Payouts', body: 'The queue, holds, and the PayPal state.', href: '/admin/payouts' },
      { id: 't-fonts', label: 'Font dials', body: 'Side scroll or use the arrows; the wheel scrolls the page.', href: '/admin/design' },
    ],
  },
  {
    title: 'Anyone',
    items: [
      { id: 'a-search', label: 'Search and the Q&A popup', body: 'Press / or ⌘K. Ask a question in your own words: the answer opens in the box.', href: '/' },
      { id: 'a-help', label: 'The ? button', body: 'Bottom right, centred, opens the shortcuts.', href: '/' },
      { id: 'a-dates', label: 'UK dates everywhere', body: 'Day, month, year on every page.', href: '/dashboard/earnings' },
      { id: 'a-faq', label: 'The Q&A page', body: 'Every answer, grouped.', href: '/faq' },
      { id: 'a-404', label: 'A page that does not exist', body: 'The not found page.', href: '/this-page-does-not-exist' },
    ],
  },
]

export default async function Page() {
  await pageDev()
  const cats = [...new Set(FEATURES.map((f) => f.category))]
  const features: LabGroup[] = cats.map((c) => ({
    title: `Switches: ${c}`,
    sub: c === 'Account' ? 'Each one is on here. Push the ones you like from Features.' : undefined,
    items: FEATURES.filter((f) => f.category === c).map((f) => ({ id: `feat-${f.id}`, label: f.name, body: f.description.length > 220 ? `${f.description.slice(0, 217)}…` : f.description, href: f.path })),
  }))
  return (
    <>
      <PageHeader title="Test lab" sub="Everything there is to try, in one list. Open each thing, try it, tick it off. Your ticks are kept in this browser." />
      <div className="max-w-4xl">
        <TestLab groups={[...FLOWS, ...features]} />
      </div>
    </>
  )
}
