// Central config. Placeholders (domain, emails, company details, fees) are marked TODO and should be finalised before launch.
export const SITE = {
  name: 'logoless',
  tagline: 'Views have value',
  url: 'https://logoless.io',
  company: 'Logoless Inc.', // TODO: registered legal entity
  address: '[Registered business address]', // TODO
  emails: {
    support: 'support@logoless.com',
    legal: 'legal@logoless.com',
    privacy: 'privacy@logoless.com',
    press: 'press@logoless.com',
    abuse: 'abuse@logoless.com',
  },
  social: {
    discord: 'https://discord.gg/logoless',
    x: 'https://x.com/logoless',
    instagram: 'https://instagram.com/logoless',
    tiktok: 'https://tiktok.com/@logoless',
    youtube: 'https://youtube.com/@logoless',
  },
  // Business rules shown in copy. Keep in sync with the backend.
  platformFeePct: 10, // TODO: confirm
  minPayoutUsd: 20, // TODO: confirm
  minTopUpUsd: 100, // TODO: confirm
  maxTopUpUsd: 10000, // per top-up; raise once you trust the flow
  holdDays: 3, // how long earnings stay pending before they can be withdrawn
  legalUpdated: 'October 10, 2026',
}

export const NAV_LINKS = [
  { label: 'Campaigns', href: '/' },
  { label: 'Our story', href: '/welcome' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'For brands', href: '/for-brands' },
  { label: 'For clippers', href: '/for-clippers' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/faq' },
]

export const LEGAL_LINKS = [
  { label: 'Terms of Service', href: '/legal/terms' },
  { label: 'Privacy Policy', href: '/legal/privacy' },
  { label: 'Clipper Terms', href: '/legal/clipper-terms' },
  { label: 'Brand Terms', href: '/legal/brand-terms' },
  { label: 'Campaign Rules', href: '/legal/campaign-rules' },
  { label: 'Acceptable Use', href: '/legal/acceptable-use' },
  { label: 'Payments & Payouts', href: '/legal/payments' },
  { label: 'Cookie Policy', href: '/legal/cookies' },
  { label: 'Do Not Sell or Share', href: '/legal/do-not-sell' },
  { label: 'External Links', href: '/legal/external-links' },
  { label: 'Copyright / DMCA', href: '/legal/dmca' },
  { label: 'Refund Policy', href: '/legal/refunds' },
]

export const FOOTER = {
  Product: [
    { label: 'Browse campaigns', href: '/' },
    { label: 'Our story', href: '/welcome' },
    { label: 'How it works', href: '/how-it-works' },
    { label: 'Fraud protection', href: '/trust' },
    { label: 'Payouts', href: '/payouts' },
    { label: 'Pricing', href: '/pricing' },
  ],
  Audiences: [
    { label: 'For brands', href: '/for-brands' },
    { label: 'For clippers', href: '/for-clippers' },
    { label: 'Create an account', href: '/onboarding' },
    { label: 'Log in', href: '/login' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Contact', href: '/contact' },
    { label: 'FAQ', href: '/faq' },
  ],
}
