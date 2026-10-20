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
  // main page and site-wide polish
  { id: 'command-actions', name: '⌘K: hundreds of actions', category: 'Comfort', path: '/', description: 'The ⌘K search box answers almost anything: "change my name", "link TikTok", "request payout", "open privacy", "create campaign" and hundreds more, with typo-tolerant matching and answers from the Q&A shown right in the box. It only offers what the person can actually do (signed out, creator, brand, admin, developer). Adds a search button and a "?" shortcuts button to the top bar of every page.' },
  { id: 'home-motion', name: 'Home page motion', category: 'Design', path: '/', description: 'A soft blur and shade at the top of the home page as you scroll, the hero easing away as you scroll past it, and smoother, lighter cover animations (they rise in as they appear and lift gently on hover).' },
  { id: 'cover-text-size', name: 'Cover text size', category: 'Comfort', path: '/', description: 'An "Aa" control in the filter bar on the home page that makes the names on the campaign covers smaller or bigger. Each visitor\'s choice is remembered on their device.' },
  { id: 'smart-cta', name: 'Log in and Dashboard buttons', category: 'Account', path: '/for-brands', description: 'Signed out, the top right of every public page shows both "Log in" and "Get started". Signed in, the "Get started" buttons on the home page and the role pages become "Dashboard", going to the dashboard for that page (creators to the creator dashboard, brands to the brand dashboard, developers to their apps).' },
  { id: 'role-previews', name: 'Dashboard previews on role pages', category: 'Discover', path: '/for-creators', description: 'A small, clickable preview of the matching dashboard on the For creators, For brands and Developers pages, so visitors can see what they get before signing up. It is made-up sample data and changes nothing.' },
]

export const FEATURE_BY_ID = Object.fromEntries(FEATURES.map((f) => [f.id, f])) as Record<string, FeatureDef>
export const FEATURE_IDS = FEATURES.map((f) => f.id)
