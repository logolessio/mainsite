// Central config. Placeholders (domain, emails, company details, fees) are marked TODO and should be finalised before launch.
export const SITE = {
  name: 'logoless',
  tagline: 'A link in bio that moves',
  url: 'https://logoless.io',
  company: 'Logoless Inc.', // TODO: registered legal entity
  address: '[Registered business address]', // TODO
  emails: {
    support: 'support@logoless.io',
    legal: 'legal@logoless.io',
    privacy: 'privacy@logoless.io',
    press: 'press@logoless.io',
    abuse: 'abuse@logoless.io',
  },
  social: {
    discord: 'https://discord.gg/logoless',
    x: 'https://x.com/logoless',
    instagram: 'https://instagram.com/logoless',
    tiktok: 'https://tiktok.com/@logoless',
    youtube: 'https://youtube.com/@logoless',
  },
  // Business rules shown in copy. Keep in sync with the backend.
  platformFeePct: 15, // charged to the brand ON TOP of what clippers are paid, never taken out of a clipper's earnings
  freeFeeCampaigns: 5, // a brand's first campaigns (counted by when each was made, rejected ones not counted) carry no platform fee at all: see lib/fee-free.ts
  minPayoutUsd: 10,
  minTopUpUsd: 10, // the smallest amount a brand can add in one go (enforced when adding funds)
  minInviteBudgetUsd: 100, // the smallest budget on an artist's private campaign link
  minCampaignBudgetUsd: 50, // the smallest budget cap a campaign can have
  maxTopUpUsd: 10000, // per top-up; raise once you trust the flow
  holdDays: 0, // 0: earnings can be withdrawn as soon as they are confirmed. (A number of days here would hold new earnings that long again.)
  disputeDays: 60, // how long after a payment someone can tell us it is wrong
  refundNote: 'usually within 5 to 10 business days of us approving it, depending on PayPal and your bank',
  legalUpdated: 'November 6, 2026',
}

/** The site's own pages, in the header (SiteHeader) and the footer (SiteFooter). */
export const NAV_LINKS = [
  { label: 'Help', href: '/help' },
  { label: 'About', href: '/about' },
  { label: 'Legal', href: '/legal' },
]

export const FOOTER: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: 'Home', href: '/' },
    { label: 'Get started', href: '/signup' },
    { label: 'Log in', href: '/login' },
    { label: 'Editor', href: '/editor' },
  ],
  Help: [
    { label: 'Help & guides', href: '/help' },
    { label: 'Contact', href: '/contact' },
    { label: 'Report a page', href: '/report' },
    { label: 'Preferences', href: '/preferences' },
  ],
  Legal: [
    { label: 'Terms', href: '/legal/terms' },
    { label: 'Privacy', href: '/legal/privacy' },
    { label: 'Cookies', href: '/legal/cookies' },
    { label: 'Community guidelines', href: '/legal/community-guidelines' },
    { label: 'Copyright', href: '/legal/dmca' },
    { label: 'All policies', href: '/legal' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Security', href: '/legal/security' },
    { label: 'Accessibility', href: '/legal/accessibility' },
  ],
}
