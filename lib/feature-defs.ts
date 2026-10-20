// The features that can be tried on the dev site and then pushed to the live site. Safe for the browser: no secrets.

export type FeatureDef = {
  id: string
  name: string
  description: string
  category: 'Discover' | 'Account' | 'Trust' | 'Launch' | 'Comfort' | 'Design'
  /** Where to see it on the dev site. */
  path: string
}

export const FEATURES: FeatureDef[] = [
  { id: 'reels', name: 'Reels: swipe through campaigns', category: 'Discover', path: '/reels', description: 'A full-screen, swipeable way to browse live campaigns, one at a time. The track plays as you scroll, with the rate, pool and a one-tap Clip this button. Keyboard friendly (↑ ↓, M for sound). Also adds a "Swipe through campaigns" button on the home page.' },
  { id: 'leaderboard', name: 'Clipper leaderboard', category: 'Discover', path: '/leaderboard', description: 'A public ranking of the top clippers by verified views, for people who have chosen to show their views. Gold, silver and bronze podium.' },
  { id: 'live-numbers', name: 'Live numbers on the home page', category: 'Trust', path: '/', description: 'A band under the campaigns with real totals: live campaigns, paid out so far, clips posted. It stays hidden until the numbers are worth showing.' },
  { id: 'calculators', name: 'Earnings and budget calculators', category: 'Discover', path: '/for-creators', description: 'An interactive "what could I earn" calculator on the For clippers page and a "what will my budget buy" calculator on the For brands page.' },
  { id: 'status-page', name: 'Public status page', category: 'Trust', path: '/status', description: 'A /status page that checks the site, database and sign-in live, so people can see everything is running. Linked from the footer.' },
  { id: 'announcement', name: 'Announcement bar', category: 'Launch', path: '/admin/push', description: 'A glass message pill floating at the bottom of the public site that you write in the admin panel (launch day, a new feature, a downtime warning). Visitors can dismiss it.' },
  { id: 'badge-celebration', name: 'Badge celebration', category: 'Account', path: '/dashboard/achievements', description: 'Unlock a badge and a full-screen celebration shows the badge itself with confetti, then takes you to your achievements.' },
  { id: 'pool-meter', name: 'Pool remaining meter', category: 'Trust', path: '/campaign/red-room', description: 'On every funded campaign page: a bar and a number showing how much of the pool is still unpaid, straight from the money ledger. Clippers see what is actually left, and it adds a little urgency. Campaigns that have not been funded show nothing.' },
  { id: 'recap', name: 'Your recap (story)', category: 'Account', path: '/dashboard/recap', description: 'A full-screen, story-style look back at what a clipper has done: earnings, views, clips, their biggest campaign, best clip and badges, with counting numbers and a progress bar. Tap or use the arrow keys.' },
  { id: 'developers', name: 'Developers: Login with logoless', category: 'Account', path: '/developers', description: 'A developer section where anyone can register an app and add a Sign in with logoless button to their own site, using standard OAuth and OpenID Connect. Includes the docs, an app manager, a consent screen and a Connected apps list in Settings.' },
  { id: 'saved-campaigns', name: 'Saved campaigns page', category: 'Account', path: '/dashboard/saved', description: 'A page in the clipper dashboard listing every campaign you have hearted, with an easy way back to each one.' },
  { id: 'ending-soon', name: 'Ending soon row', category: 'Discover', path: '/', description: 'A short row under the filters on the home page with the campaigns that have 25% or less of their pool left, so creators know which ones to hurry for. It stays hidden when none are close to ending.' },
  { id: 'top-creators', name: 'Top creators for brands', category: 'Trust', path: '/brand/overview', description: 'A card on the brand dashboard listing the five creators who earned the most across that brand\'s campaigns, with their views and what they were paid, so brands can see who is carrying a campaign.' },
  { id: 'earn-goal', name: 'Earnings goal', category: 'Account', path: '/dashboard/overview', description: 'Creators set a goal for the month on their dashboard and see a bar fill as they earn. The goal is private and can be changed or cleared at any time.' },
  { id: 'onboarding-checks', name: 'Onboarding: proven email and accounts', category: 'Account', path: '/onboarding', description: 'Everyone proves their email with a code during onboarding (Discord sign-ins too), can switch to a different email if the wrong one was picked, and proves each social account they add with a code in its bio, right there in the flow. TikTok gets a note that its website can take a while to show a new bio, with a check-again button.' },
  { id: 'username-punctuation', name: 'Dots and dashes in usernames', category: 'Account', path: '/dashboard/profile', description: 'Usernames can use dots and dashes as well as underscores (like luna.ray or dj-kai), never at the start or end and never two in a row. Reserved names are still blocked, even with dots in between.' },
  { id: 'client-links', name: 'Client links (name.logoless.io)', category: 'Launch', path: '/admin/invites', description: 'Every artist or client link also works as its own address, like kxng.logoless.io, once the wildcard address is added in Cloudflare. The client is walked through a full package: their account and page, how they want to be contacted, adding funds, their first campaign (audio, Spotify links, cover, background, bio, budget), then a tour of their dashboard.' },
  { id: 'campaign-builder', name: 'Step-by-step campaign builder', category: 'Launch', path: '/brand/campaigns/new', description: 'Making a campaign becomes a guided wizard: the basics, the audio (official sound, Spotify links, a preview), the cover and an optional background, the brief, then the budget, either as "I want X views for $Y" or "$Y at $Z per 1,000 views", with the numbers worked out live. Then funds and a last review.' },
  { id: 'client-tour', name: 'Client dashboard walkthrough', category: 'Comfort', path: '/brand?tour=1', description: 'A guided walkthrough of the brand dashboard that points at the real parts of the page: campaigns, editing and topping up, statistics, submissions and funds. It runs once after a first campaign and can be replayed. When the first submission arrives, a short guide shows everything a client can do with it (approve, turn down, stop, pause the campaign).' },
  { id: 'view-milestones', name: 'View milestones', category: 'Trust', path: '/brand', description: 'When the total verified views across a client\'s campaigns pass 1K, 10K, 50K, 100K, 500K, 1M and on, their dashboard celebrates it once with confetti, and they get a notification.' },
]

export const FEATURE_BY_ID = Object.fromEntries(FEATURES.map((f) => [f.id, f])) as Record<string, FeatureDef>
export const FEATURE_IDS = FEATURES.map((f) => f.id)
