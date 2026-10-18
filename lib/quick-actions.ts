import type { IconName } from '@/components/icons'

/**
 * Things a person does often, reachable from the search box with a few letters ("with", "fund", "new"), so nothing important is
 * more than one shortcut away. `keys` are extra words that should find it. `run` is for things that are not a page.
 */
export type QuickAction = { id: string; label: string; icon: IconName; href?: string; run?: 'profile-link' | 'help'; keys: string; hint: string }

const CONTACT: QuickAction = { id: 'help', label: 'Contact support', icon: 'Mail', href: '/contact', keys: 'help support problem question ticket', hint: 'Help' }
const HELP: QuickAction = { id: 'keys', label: 'Keyboard shortcuts', icon: 'Compass', run: 'help', keys: 'keys keyboard shortcuts hotkeys', hint: '?' }

export const CREATOR_ACTIONS: QuickAction[] = [
  { id: 'find', label: 'Find a campaign', icon: 'Search', href: '/', keys: 'browse join earn clip campaigns new', hint: 'Do' },
  { id: 'withdraw', label: 'Withdraw to PayPal', icon: 'Banknote', href: '/dashboard/earnings#withdraw', keys: 'cash out money payout paypal get paid', hint: 'Do' },
  { id: 'paypal', label: 'Add a PayPal email', icon: 'CreditCard', href: '/dashboard/earnings#withdraw', keys: 'paypal email payment method', hint: 'Do' },
  { id: 'profile', label: 'Edit my profile', icon: 'UserCheck', href: '/dashboard/profile', keys: 'name photo picture banner bio handle', hint: 'Do' },
  { id: 'share', label: 'Copy my profile link', icon: 'Link2', run: 'profile-link', keys: 'share link url public', hint: 'Do' },
  { id: 'discord', label: 'Connect Discord', icon: 'Discord', href: '/dashboard/settings#discord', keys: 'discord server roles connect link', hint: 'Do' },
  { id: 'contact', label: 'How we contact you', icon: 'Bell', href: '/dashboard/settings#contact', keys: 'email notifications messages contact', hint: 'Do' },
  { id: 'setup', label: 'Set-up guide', icon: 'CheckCircle2', href: '/dashboard/setup', keys: 'setup guide steps finish onboarding', hint: 'Do' },
  { id: 'notifs', label: 'Notifications', icon: 'Bell', href: '/dashboard/notifications', keys: 'alerts inbox updates', hint: 'Do' },
  CONTACT,
  HELP,
]

export const BRAND_ACTIONS: QuickAction[] = [
  { id: 'new', label: 'Start a campaign', icon: 'Plus', href: '/brand/campaigns/new', keys: 'new create launch campaign', hint: 'Do' },
  { id: 'fund', label: 'Add funds', icon: 'Wallet', href: '/brand/balance#add-funds', keys: 'balance deposit top up money paypal pay', hint: 'Do' },
  { id: 'subs', label: 'Review submissions', icon: 'Clapperboard', href: '/brand/submissions', keys: 'clips approve decline creators posts', hint: 'Do' },
  { id: 'discord', label: 'Connect Discord', icon: 'Discord', href: '/brand/settings#discord', keys: 'discord server roles connect link', hint: 'Do' },
  { id: 'contact', label: 'How we contact you', icon: 'Bell', href: '/brand/settings#contact', keys: 'email notifications messages contact', hint: 'Do' },
  { id: 'setup', label: 'Set-up guide', icon: 'CheckCircle2', href: '/brand/setup', keys: 'setup guide steps finish onboarding', hint: 'Do' },
  CONTACT,
  HELP,
]

export const OWNER_ACTIONS: QuickAction[] = [
  { id: 'requests', label: 'Review campaign requests', icon: 'Megaphone', href: '/admin/campaigns', keys: 'approve new requests launch campaigns', hint: 'Do' },
  { id: 'clips', label: 'Review submissions', icon: 'Clapperboard', href: '/admin/submissions', keys: 'clips approve decline views queue', hint: 'Do' },
  { id: 'payouts', label: 'Check payouts', icon: 'Banknote', href: '/admin/payouts', keys: 'withdrawals paypal review money', hint: 'Do' },
  { id: 'people', label: 'Find a person', icon: 'Users', href: '/admin/people', keys: 'user account search email creator brand', hint: 'Do' },
  { id: 'inbox', label: 'Answer the inbox', icon: 'Mail', href: '/admin/inbox', keys: 'messages tickets support replies', hint: 'Do' },
  { id: 'mail', label: 'Send an email', icon: 'Send', href: '/admin/email', keys: 'email resend test message', hint: 'Do' },
  { id: 'announce', label: 'Post an announcement', icon: 'Megaphone', href: '/admin/broadcast', keys: 'broadcast notice banner message everyone', hint: 'Do' },
  { id: 'discord', label: 'Discord', icon: 'Discord', href: '/admin/discord', keys: 'bot server roles channels test', hint: 'Do' },
  { id: 'design', label: 'Change how the site looks', icon: 'Palette', href: '/admin/design', keys: 'design roundness rounded corners font typeface gloock inter look theme slider', hint: 'Do' },
  { id: 'text', label: 'Edit site text', icon: 'FileCheck2', href: '/admin/text', keys: 'copy words wording edit text', hint: 'Do' },
  { id: 'links', label: 'Edit socials and links', icon: 'Link2', href: '/admin/socials', keys: 'social accounts footer links page tiktok instagram discord', hint: 'Do' },
  { id: 'push', label: 'Push a feature live', icon: 'Rocket', href: '/dev/features', keys: 'features release dev flags publish', hint: 'Do' },
  { id: 'health', label: 'System health', icon: 'Activity', href: '/admin/system', keys: 'errors status health slow services money checks', hint: 'Do' },
  { id: 'logs', label: 'Logs and events', icon: 'BarChart3', href: '/admin/logs', keys: 'errors events requests page views security', hint: 'Do' },
  HELP,
]

export const actionsFor = (area: string): QuickAction[] => (area === 'Creator' ? CREATOR_ACTIONS : area === 'Brand' ? BRAND_ACTIONS : OWNER_ACTIONS)

/** The first action that matches every word typed, with matches at the start of a word ranked first. */
export function scoreOf(text: string, q: string): number {
  const hay = text.toLowerCase()
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 1
  let score = 0
  for (const w of words) {
    const at = hay.indexOf(w)
    if (at < 0) return 0
    score += at === 0 || hay[at - 1] === ' ' ? 3 : 1
  }
  return score
}
