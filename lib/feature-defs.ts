// The features that can be tried on the dev site and then pushed to the live site. Safe for the browser: no secrets.

export type FeatureDef = {
  id: string
  name: string
  description: string
  category: 'Discover' | 'Account' | 'Trust' | 'Launch' | 'Comfort'
  /** Where to see it on the dev site. */
  path: string
}

export const FEATURES: FeatureDef[] = [
  { id: 'spotlight', name: 'Spotlight search', category: 'Discover', path: '/', description: 'Press ⌘K (or /) anywhere to search every live campaign and jump to any page. Inside the dashboards it becomes a jump menu for every dashboard page (and every admin page for admins). Press ? for the shortcut list.' },
  { id: 'reels', name: 'Reels: swipe through campaigns', category: 'Discover', path: '/reels', description: 'A full-screen, swipeable way to browse live campaigns, one at a time. The track plays as you scroll, with the rate, pool and a one-tap Clip this button. Keyboard friendly (↑ ↓, M for sound).' },
  { id: 'leaderboard', name: 'Clipper leaderboard', category: 'Discover', path: '/leaderboard', description: 'A public ranking of the top clippers by verified views, for people who have chosen to show their views. Gold, silver and bronze podium.' },
  { id: 'live-numbers', name: 'Live numbers on the home page', category: 'Trust', path: '/', description: 'A band under the campaigns with real totals: live campaigns, paid out so far, clips posted. It stays hidden until the numbers are worth showing.' },
  { id: 'calculators', name: 'Earnings and budget calculators', category: 'Discover', path: '/for-clippers', description: 'An interactive "what could I earn" calculator on the For clippers page and a "what will my budget buy" calculator on the For brands page.' },
  { id: 'status-page', name: 'Public status page', category: 'Trust', path: '/status', description: 'A /status page that checks the site, database and sign-in live, so people can see everything is running. Linked from the footer.' },
  { id: 'announcement', name: 'Announcement bar', category: 'Launch', path: '/admin/push', description: 'A glass message pill floating at the bottom of the public site that you write in the admin panel (launch day, a new feature, a downtime warning). Visitors can dismiss it.' },
  { id: 'live-toasts', name: 'Live notification toasts', category: 'Account', path: '/dashboard', description: 'When something happens (payment received, clip approved, badge unlocked) a glass toast slides in without needing a refresh.' },
  { id: 'badge-celebration', name: 'Badge celebration', category: 'Account', path: '/dashboard/achievements', description: 'Unlock a badge and a full-screen celebration shows the badge itself with confetti, then takes you to your achievements.' },
  { id: 'earn-demo', name: 'Watch a clip earn (animated demo)', category: 'Discover', path: '/how-it-works', description: 'An animated phone and balance on How it works: a made-up clip is posted, checked, approved, and its verified views turn into money in real time. Visitors can switch the rate and replay it.' },
  { id: 'recap', name: 'Your recap (story)', category: 'Account', path: '/dashboard/recap', description: 'A full-screen, story-style look back at what a clipper has done: earnings, views, clips, their biggest campaign, best clip and badges, with counting numbers and a progress bar. Tap or use the arrow keys.' },
  { id: 'saved-campaigns', name: 'Saved campaigns page', category: 'Account', path: '/dashboard/saved', description: 'A page in the clipper dashboard listing every campaign you have hearted, with an easy way back to each one.' },
  { id: 'calm-mode', name: 'Calm mode', category: 'Comfort', path: '/', description: 'A footer switch that turns off the heavy animation (floating cards, particles, hero motion) for people who prefer a quieter site or have a slower device.' },
]

export const FEATURE_BY_ID = Object.fromEntries(FEATURES.map((f) => [f.id, f])) as Record<string, FeatureDef>
export const FEATURE_IDS = FEATURES.map((f) => f.id)
