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
  { id: 'recap-sidebar', name: 'Recap in the sidebar, in gold', category: 'Account', path: '/dashboard', description: 'Recap moves out of the Profile tabs to the bottom of the creator sidebar with a soft gold shine. It only appears once set-up is done and there is enough to look back on (one approved clip and 1,000 verified views), glows until it is opened, and glows again after three months. Needs "Your recap" on too.' },
  { id: 'notification-center', name: 'Notification centre', category: 'Comfort', path: '/dashboard/notifications', description: 'A cleaner bell that shows only the notifications, with a ring when it is opened or something new arrives. Notifications mark themselves read once seen. A full Notifications page with settings: each kind on or off for the site, email and Discord, quiet hours, and daily or weekly digests.' },
  { id: 'discord-page', name: 'Discord page in the dashboard', category: 'Account', path: '/dashboard/discord', description: 'A Discord page in the creator sidebar: link or unlink Discord, see the server roles you have and the ones you can earn, join the server, and choose which notifications come as Discord messages. People can take it out of their sidebar and put it back from Settings.' },
  { id: 'developers', name: 'Developers: Login with logoless', category: 'Account', path: '/developers', description: 'A developer section where anyone can register an app and add a Sign in with logoless button to their own site, using standard OAuth and OpenID Connect. Includes the docs, an app manager, a consent screen and a Connected apps list in Settings.' },
  { id: 'saved-campaigns', name: 'Saved campaigns page', category: 'Account', path: '/dashboard/saved', description: 'A page in the clipper dashboard listing every campaign you have hearted, with an easy way back to each one.' },
  { id: 'ending-soon', name: 'Ending soon row', category: 'Discover', path: '/', description: 'A short row under the filters on the home page with the campaigns that have 25% or less of their pool left, so creators know which ones to hurry for. It stays hidden when none are close to ending.' },
  { id: 'top-creators', name: 'Top creators for brands', category: 'Trust', path: '/brand/overview', description: 'A card on the brand dashboard listing the five creators who earned the most across that brand\'s campaigns, with their views and what they were paid, so brands can see who is carrying a campaign.' },
  { id: 'earn-goal', name: 'Earnings goal', category: 'Account', path: '/dashboard/overview', description: 'Creators set a goal for the month on their dashboard and see a bar fill as they earn. The goal is private and can be changed or cleared at any time.' },
]

export const FEATURE_BY_ID = Object.fromEntries(FEATURES.map((f) => [f.id, f])) as Record<string, FeatureDef>
export const FEATURE_IDS = FEATURES.map((f) => f.id)
