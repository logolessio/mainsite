/**
 * The stops of the client walkthrough. Each one points at a real part of a real page: `targets` are tried in order and the first
 * one that is on screen wins, so a page without campaigns or submissions still gets a sensible stop.
 * The `data-tour` names are set in the brand pages (app/brand/*).
 */
export type TourStep = {
  page: string
  targets: string[]
  title: string
  body: string
  links?: { label: string; href: string }[]
  /** the target sits in a bar that is always on screen, so the page is never scrolled for it */
  pinned?: boolean
}

export const STEPS = {
  stats: {
    page: '/brand',
    targets: ['[data-tour="stats"]'],
    title: 'Your numbers',
    body: 'Verified views by day, what you have spent, and what 1,000 views cost you. Only views we have checked on the platform count here.',
  },
  campaigns: {
    page: '/brand',
    targets: ['[data-tour="campaigns"]'],
    title: 'Your campaigns',
    body: 'Every campaign at a glance: how much of its budget is used, its views, and whether it is live. See all opens the full list.',
  },
  campaign: {
    page: '/brand/campaigns',
    targets: ['[data-tour="campaign"]', '[data-tour="campaigns-empty"]'],
    title: 'Manage a campaign',
    body: 'Each campaign shows what has been paid to creators out of its budget, and how many views and clips it has brought in.',
  },
  'campaign-actions': {
    page: '/brand/campaigns',
    targets: ['[data-tour="campaign-actions"]', '[data-tour="campaign"]', '[data-tour="campaigns-empty"]'],
    title: 'Edit, top up, pause',
    body: 'Pause stops new spending at once, and Start brings it back. Budget and limits raises the budget or caps what one clip or one creator can earn.',
  },
  submissions: {
    page: '/brand/submissions',
    targets: ['[data-tour="submission"]', '[data-tour="submission-stats"]'],
    title: 'Submissions',
    body: 'Every clip made for you. We check its real views before anyone is paid, so there is nothing to approve. Turn down anything off-brief and say why.',
  },
  funds: {
    page: '/brand/balance',
    targets: ['[data-tour="funds"]'],
    title: 'Your balance',
    body: 'One balance pays for every campaign. Add funds with PayPal here; creators are paid from it only as their views are verified.',
  },
  contact: {
    page: '/brand/settings',
    targets: ['[data-tour="contact"]', '#contact'],
    title: 'How we reach you',
    body: 'Choose where we tell you about things that matter, like a campaign running out of budget. Your account details live here too.',
  },
  help: {
    page: '/brand/settings',
    targets: ['header.sticky button:has(kbd)', 'header.sticky button[aria-label="Search or jump"]'],
    title: 'Help is close by',
    body: 'Press / or tap search to jump anywhere or do something. Press ? for every shortcut. Questions? Read the answers or write to us.',
    links: [
      { label: 'Answers', href: '/faq' },
      { label: 'Contact us', href: '/contact' },
    ],
    pinned: true,
  },

  // single stops the first-submission guide points at ("Show me")
  watch: {
    page: '/brand/submissions',
    targets: ['[data-tour="watch"]', '[data-tour="submission"]'],
    title: 'Watch it',
    body: 'Opens the post where it went live, so you see exactly what the creator made.',
  },
  'turn-down': {
    page: '/brand/submissions',
    targets: ['[data-tour="turn-down"]', '[data-tour="submission"]'],
    title: 'Turn it down',
    body: 'Off-brief? Turn it down and say why: the creator sees your reason and it earns nothing more. This works until its views have been paid for.',
  },
  pause: {
    page: '/brand/campaigns',
    targets: ['[data-tour="campaign-actions"]', '[data-tour="campaign"]'],
    title: 'Pause or start',
    body: 'Pause stops all new spending on a campaign at once. Start brings it back while your balance covers it.',
  },
  budget: {
    page: '/brand/campaigns',
    targets: ['[data-tour="campaign-actions"]', '[data-tour="campaign"]'],
    title: 'Budget and limits',
    body: 'Raise the budget to keep a campaign running, or cap what one submission or one creator can earn from it.',
  },
  'add-funds': {
    page: '/brand/balance',
    targets: ['[data-tour="funds"]'],
    title: 'Add funds',
    body: 'Top up the one balance every campaign draws from. We cover PayPal\'s fees.',
  },
} satisfies Record<string, TourStep>

export type StepId = keyof typeof STEPS

/** The full walkthrough, in order. */
export const TOUR: StepId[] = ['stats', 'campaigns', 'campaign', 'campaign-actions', 'submissions', 'funds', 'contact', 'help']
