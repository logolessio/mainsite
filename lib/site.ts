// Central config. Placeholders (domain, emails, company details, fees) are marked TODO and should be finalised before launch.
export const SITE = {
  name: 'logoless',
  tagline: 'Views have value',
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
  legalUpdated: 'October 16, 2026',
}

export const NAV_LINKS = [
  { label: 'Campaigns', href: '/' },
  { label: 'For creators', href: '/for-creators' },
  { label: 'For brands', href: '/for-brands' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: "Q&A", href: '/faq' },
]

export const LEGAL_LINKS = [
  { label: 'Terms of Service', href: '/legal/terms' },
  { label: 'Privacy Policy', href: '/legal/privacy' },
  { label: 'Creator Terms', href: '/legal/clipper-terms' },
  { label: 'Brand Terms', href: '/legal/brand-terms' },
  { label: 'Campaign Rules', href: '/legal/campaign-rules' },
  { label: 'Acceptable Use', href: '/legal/acceptable-use' },
  { label: 'Payments & Payouts', href: '/legal/payments' },
  { label: 'Cookie Policy', href: '/legal/cookies' },
  { label: 'Do Not Sell or Share', href: '/legal/do-not-sell' },
  { label: 'External Links', href: '/legal/external-links' },
  { label: 'Copyright / DMCA', href: '/legal/dmca' },
  { label: 'Refund Policy', href: '/legal/refunds' },
  { label: 'Accessibility', href: '/legal/accessibility' },
]

export const FOOTER = {
  Product: [
    { label: 'Campaigns', href: '/' },
    { label: 'For creators', href: '/for-creators' },
    { label: 'For brands', href: '/for-brands' },
    { label: 'Pricing', href: '/pricing' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Case studies', href: '/case-studies' },
    { label: "Q&A", href: '/faq' },
    { label: 'Contact', href: '/contact' },
    { label: 'Report', href: '/report' },
  ],
}
