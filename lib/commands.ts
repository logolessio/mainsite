// Everything the ⌘K box can do, as data. Safe for the browser: no secrets, no database.
//
// Each command says who may see it (`who`), and the box only offers what the person can actually do: a visitor who is signed out
// is offered signing up, not withdrawing. `words` are the other ways people ask for it ("pfp", "cash out", "unlink"); the matcher in
// lib/fuzzy.ts also knows common synonyms and forgives small typos, so these lists only need what is specific to the command.
// `core` commands are the ones the box always had (the pages and the most used actions); the rest appear once the "command-actions"
// feature is switched on.

export type Who = 'guest' | 'user' | 'admin' | 'dev'
export type Group = 'Account' | 'Profile' | 'Socials' | 'Money' | 'Clips' | 'Campaigns' | 'Brand' | 'Settings' | 'Display' | 'Help' | 'Legal' | 'Pages' | 'Developers' | 'Owner' | 'Developer tools' | 'Answers'
export type Run = 'help' | 'profile-link' | 'my-profile' | 'logout' | 'calm' | 'text-size' | 'contrast' | 'underline' | 'tour' | 'copy-page' | 'top' | 'email-support'
export type CmdIcon =
  | 'search' | 'user' | 'image' | 'at' | 'text' | 'link' | 'unlink' | 'shield' | 'money' | 'wallet' | 'card' | 'bell' | 'settings' | 'lock' | 'key'
  | 'trash' | 'logout' | 'login' | 'plus' | 'megaphone' | 'clapper' | 'chart' | 'trophy' | 'heart' | 'help' | 'mail' | 'doc' | 'palette' | 'rocket'
  | 'code' | 'eye' | 'home' | 'sparkles' | 'discord' | 'tiktok' | 'youtube' | 'instagram' | 'keyboard' | 'moon' | 'type' | 'contrast' | 'copy' | 'users'
  | 'activity' | 'send' | 'globe' | 'compass' | 'scale' | 'book' | 'flag' | 'pause' | 'clock' | 'target' | 'receipt' | 'layers' | 'answer'

export type Command = {
  id: string
  label: string
  /** One short line under the label. */
  sub?: string
  group: Group
  icon: CmdIcon
  href?: string
  run?: Run
  /** Other ways of asking for it. */
  words?: string
  /** Who may see it. Left out: everyone. */
  who?: Who[]
  /** Only while this feature is switched on. */
  feature?: string
  /** Always offered, even before the full list is switched on. */
  core?: boolean
  /** A higher number wins a tie (the things people do most). */
  rank?: number
  /** For answers: the text shown right in the box. */
  answer?: string
}

const U: Who[] = ['user']
const G: Who[] = ['guest']
const A: Who[] = ['admin']
const D: Who[] = ['dev', 'admin']

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', icon: 'tiktok' as const, words: 'tt tik tok' },
  { id: 'youtube', name: 'YouTube', icon: 'youtube' as const, words: 'yt shorts channel' },
  { id: 'instagram', name: 'Instagram', icon: 'instagram' as const, words: 'ig insta reels' },
]

const LEGAL_DOCS: [slug: string, title: string, words: string][] = [
  ['terms', 'Terms of Service', 'tos terms conditions agreement rules'],
  ['privacy', 'Privacy Policy', 'privacy data gdpr personal information'],
  ['clipper-terms', 'Creator terms', 'clipper creator terms agreement'],
  ['brand-terms', 'Brand terms', 'brand business terms agreement'],
  ['campaign-rules', 'Campaign rules', 'rules guidelines allowed banned content'],
  ['acceptable-use', 'Acceptable use policy', 'acceptable use abuse allowed'],
  ['payments', 'Payments and payouts policy', 'payments payouts paypal money policy'],
  ['cookies', 'Cookie policy', 'cookies tracking'],
  ['do-not-sell', 'Do not sell or share my information', 'ccpa sell share opt out personal information'],
  ['dmca', 'Copyright and DMCA', 'copyright dmca takedown stolen'],
  ['refunds', 'Refund policy', 'refund money back'],
  ['external-links', 'External links and profiles', 'links outside third party'],
  ['accessibility', 'Accessibility statement', 'accessibility a11y screen reader'],
]

const base: Command[] = [
  // ---------- pages anyone can open ----------
  { id: 'p-home', label: 'Browse campaigns', sub: 'The home page', group: 'Pages', icon: 'home', href: '/', words: 'home campaigns browse explore discover earn start', core: true, rank: 9 },
  { id: 'p-creators', label: 'For creators', sub: 'How earning works', group: 'Pages', icon: 'users', href: '/for-creators', words: 'clippers creators earn how it works', core: true },
  { id: 'p-brands', label: 'For brands', sub: 'Launch a campaign with logoless', group: 'Pages', icon: 'megaphone', href: '/for-brands', words: 'brands artists labels advertise promote music', core: true },
  { id: 'p-pricing', label: 'Pricing and fees', sub: '/pricing', group: 'Pages', icon: 'scale', href: '/pricing', words: 'price fees cost commission how much', core: true },
  { id: 'p-about', label: 'About logoless', sub: '/about', group: 'Pages', icon: 'compass', href: '/about', words: 'about company team who', core: true },
  { id: 'p-faq', label: 'Questions and answers', sub: '/faq', group: 'Help', icon: 'help', href: '/faq', words: 'faq q&a questions answers help', core: true },
  { id: 'p-contact', label: 'Contact support', sub: 'Write to the team', group: 'Help', icon: 'mail', href: '/contact', words: 'contact support help message team talk human', core: true, rank: 3 },
  { id: 'p-cases', label: 'Case studies', sub: '/case-studies', group: 'Pages', icon: 'book', href: '/case-studies', words: 'case studies results examples success' },
  { id: 'p-legal', label: 'Legal', sub: 'Every policy in one place', group: 'Legal', icon: 'scale', href: '/legal', words: 'legal policies terms privacy' },
  { id: 'p-links', label: 'Our socials and links', sub: '/links', group: 'Pages', icon: 'link', href: '/links', words: 'socials twitter x instagram tiktok discord follow links' },
  { id: 'p-report', label: 'Report a problem', sub: 'A clip, an account or a bug', group: 'Help', icon: 'flag', href: '/report', words: 'report abuse scam fraud bug broken problem stolen' },
  { id: 'p-reels', label: 'Swipe through campaigns', sub: 'Reels', group: 'Campaigns', icon: 'clapper', href: '/reels', words: 'reels swipe scroll browse', feature: 'reels', core: true },
  { id: 'p-board', label: 'Leaderboard', sub: 'Top creators by verified views', group: 'Pages', icon: 'trophy', href: '/leaderboard', words: 'leaderboard ranking top best', feature: 'leaderboard', core: true },
  { id: 'p-submissions', label: 'Watch and rate submissions', sub: 'Every approved clip', group: 'Pages', icon: 'clapper', href: '/submissions', words: 'submissions clips videos watch rate stars feed browse', feature: 'submissions-feed', core: true },
  { id: 'p-stats', label: 'Stats and leaderboards', sub: 'Creators, views and campaigns', group: 'Pages', icon: 'chart', href: '/stats', words: 'stats statistics leaderboard ranking top views creators campaigns numbers', feature: 'stats-page', core: true },
  { id: 'p-status', label: 'System status', sub: 'Is everything running?', group: 'Help', icon: 'activity', href: '/status', words: 'status down outage working broken uptime', feature: 'status-page', core: true },
  { id: 'p-devs', label: 'Developers: Sign in with logoless', sub: 'OAuth and OpenID Connect docs', group: 'Developers', icon: 'code', href: '/developers', words: 'developers api oauth openid sdk docs integrate', feature: 'developers' },

  // ---------- signed out ----------
  { id: 'g-start', label: 'Get started', sub: 'Make a free account', group: 'Account', icon: 'sparkles', href: '/onboarding', words: 'sign up signup register join create account new start earning', who: G, core: true, rank: 8 },
  { id: 'g-login', label: 'Log in', sub: '/login', group: 'Account', icon: 'login', href: '/login', words: 'log in login sign in signin account', who: G, core: true, rank: 8 },
  { id: 'g-forgot', label: 'Reset a forgotten password', sub: '/forgot-password', group: 'Account', icon: 'key', href: '/forgot-password', words: 'forgot password reset lost recover locked out', who: G },
  { id: 'g-creator', label: 'Sign up as a creator', sub: 'Earn from your views', group: 'Account', icon: 'user', href: '/onboarding?role=clipper', words: 'sign up creator clipper join earn', who: G },
  { id: 'g-brand', label: 'Sign up as a brand', sub: 'Launch a campaign', group: 'Account', icon: 'megaphone', href: '/onboarding?role=brand', words: 'sign up brand artist label business advertise', who: G },
  { id: 'g-tour', label: 'Take the tour', sub: 'A quick look around the site', group: 'Help', icon: 'compass', run: 'tour', words: 'tour guide walkthrough how does this work new here' },

  // ---------- creator dashboard ----------
  { id: 'c-dash', label: 'Your dashboard', sub: 'Creator overview', group: 'Account', icon: 'home', href: '/dashboard', words: 'dashboard home overview creator', who: U, core: true, rank: 7 },
  { id: 'c-setup', label: 'Set-up guide', sub: 'The steps left to finish', group: 'Account', icon: 'target', href: '/dashboard/setup', words: 'setup guide steps finish onboarding checklist', who: U, core: true },
  { id: 'c-subs', label: 'Your submissions', sub: 'Every clip you sent', group: 'Clips', icon: 'clapper', href: '/dashboard/submissions', words: 'my clips videos submitted status pending approved', who: U, core: true, rank: 5 },
  { id: 'c-submit', label: 'Submit a clip', sub: 'Pick a campaign, then send the link', group: 'Clips', icon: 'plus', href: '/', words: 'submit clip send post upload new video link', who: U, rank: 5 },
  { id: 'c-rejected', label: 'Why was my clip rejected?', sub: 'See the reason on each clip', group: 'Clips', icon: 'clapper', href: '/dashboard/submissions', words: 'rejected declined reason why denied refused', who: U },
  { id: 'c-views', label: 'Check my views', sub: 'Verified views on each clip', group: 'Clips', icon: 'chart', href: '/dashboard/submissions', words: 'views stats numbers counted verified how many', who: U },
  { id: 'c-earn', label: 'Earnings', sub: 'What you have earned and can withdraw', group: 'Money', icon: 'money', href: '/dashboard/earnings', words: 'earnings money balance income how much earned', who: U, core: true, rank: 6 },
  { id: 'c-withdraw', label: 'Request a payout', sub: 'Withdraw to PayPal', group: 'Money', icon: 'wallet', href: '/dashboard/earnings#withdraw', words: 'withdraw payout cash out request money paypal get paid transfer', who: U, core: true, rank: 9 },
  { id: 'c-paypal', label: 'Add or change your PayPal email', sub: 'Where payouts are sent', group: 'Money', icon: 'card', href: '/dashboard/earnings#withdraw', words: 'paypal email payment method payout address', who: U, core: true },
  { id: 'c-history', label: 'Payout history', sub: 'Every withdrawal and its status', group: 'Money', icon: 'receipt', href: '/dashboard/payouts', words: 'payout history withdrawals past paid pending', who: U },
  { id: 'c-goal', label: 'Set an earnings goal', sub: 'A private target for the month', group: 'Money', icon: 'target', href: '/dashboard/overview', words: 'goal target monthly aim', who: U, feature: 'earn-goal' },
  { id: 'c-saved', label: 'Saved campaigns', sub: 'The ones you hearted', group: 'Campaigns', icon: 'heart', href: '/dashboard/saved', words: 'saved hearted liked favourites bookmarks', who: U, feature: 'saved-campaigns' },
  { id: 'c-recap', label: 'Your recap', sub: 'A story of what you have done', group: 'Profile', icon: 'sparkles', href: '/dashboard/recap', words: 'recap story wrapped summary year review', who: U, feature: 'recap' },
  { id: 'c-ach', label: 'Achievements and badges', sub: 'Badges you have unlocked', group: 'Profile', icon: 'trophy', href: '/dashboard/achievements', words: 'achievements badges trophies unlocked awards', who: U },

  // ---------- profile ----------
  { id: 'pr-edit', label: 'Edit your profile', sub: 'Name, picture, banner, bio and links', group: 'Profile', icon: 'user', href: '/dashboard/profile', words: 'edit profile customize page public', who: U, core: true, rank: 6 },
  { id: 'pr-name', label: 'Change your name', sub: 'The name shown on your profile', group: 'Profile', icon: 'text', href: '/dashboard/profile', words: 'change name display name rename nickname what i am called', who: U, rank: 4 },
  { id: 'pr-handle', label: 'Change your @handle', sub: 'Your profile address', group: 'Profile', icon: 'at', href: '/dashboard/profile', words: 'change handle username @ url address tag', who: U, rank: 3 },
  { id: 'pr-pic', label: 'Change your profile picture', sub: 'Upload a new photo', group: 'Profile', icon: 'image', href: '/dashboard/profile', words: 'change profile picture photo pfp avatar image upload', who: U, rank: 4 },
  { id: 'pr-banner', label: 'Change your banner', sub: 'The image across the top of your profile', group: 'Profile', icon: 'image', href: '/dashboard/profile', words: 'banner header cover background image', who: U },
  { id: 'pr-bio', label: 'Edit your bio', sub: 'A line or two about you', group: 'Profile', icon: 'text', href: '/dashboard/profile', words: 'bio about description intro', who: U },
  { id: 'pr-colors', label: 'Change your profile colours', sub: 'Accent colours and card effect', group: 'Profile', icon: 'palette', href: '/dashboard/profile', words: 'colour color accent theme effect glitter style look font', who: U },
  { id: 'pr-links', label: 'Add links to your profile', sub: 'Your socials and website', group: 'Profile', icon: 'link', href: '/dashboard/profile', words: 'links website socials link in bio', who: U },
  { id: 'pr-view', label: 'View your public profile', sub: 'What everyone else sees', group: 'Profile', icon: 'eye', run: 'my-profile', words: 'view profile public page see my page', who: U, rank: 3 },
  { id: 'pr-copy', label: 'Copy your profile link', sub: 'Share your page', group: 'Profile', icon: 'copy', run: 'profile-link', words: 'copy share profile link url', who: U, core: true },

  // ---------- connected accounts ----------
  { id: 'so-all', label: 'Your connected accounts', sub: 'TikTok, YouTube and Instagram', group: 'Socials', icon: 'link', href: '/dashboard/accounts', words: 'accounts socials connected linked platforms channels', who: U, core: true },
  ...PLATFORMS.flatMap((p): Command[] => [
    { id: `so-link-${p.id}`, label: `Link your ${p.name} account`, sub: 'Add it to your profile', group: 'Socials', icon: p.icon, href: '/dashboard/accounts', words: `link connect add ${p.words} account`, who: U, rank: 4 },
    { id: `so-verify-${p.id}`, label: `Verify your ${p.name} account`, sub: 'Prove it is yours with a code in your bio', group: 'Socials', icon: 'shield', href: '/dashboard/accounts', words: `verify prove tick code bio ${p.words}`, who: U },
    { id: `so-remove-${p.id}`, label: `Unlink your ${p.name} account`, sub: 'Take it off your profile', group: 'Socials', icon: 'unlink', href: '/dashboard/accounts', words: `unlink remove disconnect delete ${p.words}`, who: U },
  ]),
  { id: 'so-discord', label: 'Connect Discord', sub: 'Get your roles in the server', group: 'Socials', icon: 'discord', href: '/dashboard/settings#discord', words: 'discord server roles connect link', who: U, core: true },
  { id: 'so-discord-join', label: 'Join the Discord server', sub: 'Talk to other creators', group: 'Socials', icon: 'discord', href: 'https://discord.gg/logoless', words: 'discord join server community chat' },

  // ---------- account settings ----------
  { id: 's-settings', label: 'Settings', sub: 'Account, password and display', group: 'Settings', icon: 'settings', href: '/dashboard/settings', words: 'settings preferences account options', who: U, core: true, rank: 4 },
  { id: 's-email', label: 'Your email address', sub: 'The address you sign in with', group: 'Settings', icon: 'mail', href: '/dashboard/settings#account', words: 'email address change mail login', who: U },
  { id: 's-password', label: 'Change your password', sub: 'Or set one if you use Google or Discord', group: 'Settings', icon: 'key', href: '/dashboard/settings#password', words: 'change password reset new set security', who: U, rank: 3 },
  { id: 's-notifs', label: 'Notifications', sub: 'Everything we have told you', group: 'Settings', icon: 'bell', href: '/dashboard/notifications', words: 'notifications alerts inbox updates bell messages', who: U, core: true },
  { id: 's-contact', label: 'How we contact you', sub: 'Email, Discord or both', group: 'Settings', icon: 'bell', href: '/dashboard/settings#contact', words: 'contact preferences email notifications discord dm messages stop emails unsubscribe', who: U, core: true },
  { id: 's-apps', label: 'Connected apps', sub: 'Sites you signed in to with logoless', group: 'Settings', icon: 'layers', href: '/dashboard/settings#apps', words: 'connected apps oauth third party revoke access', who: U, feature: 'developers' },
  { id: 's-display', label: 'Display settings', sub: 'Motion, text size and contrast', group: 'Display', icon: 'eye', href: '/dashboard/settings#display', words: 'display appearance accessibility motion text size contrast', who: U },
  { id: 's-delete', label: 'Delete your account', sub: 'Settings, at the bottom', group: 'Settings', icon: 'trash', href: '/dashboard/settings#delete', words: 'delete account close remove erase deactivate leave', who: U },
  { id: 's-logout', label: 'Log out', sub: 'Sign out on this device', group: 'Account', icon: 'logout', run: 'logout', words: 'log out logout sign out signout leave exit', who: U, core: true },

  // ---------- display (anyone, kept in the browser) ----------
  { id: 'd-calm', label: 'Turn calm mode on or off', sub: 'Fewer animations', group: 'Display', icon: 'moon', run: 'calm', words: 'calm mode reduce motion animations quiet stop moving dizzy' },
  { id: 'd-text', label: 'Make text bigger or smaller', sub: 'Larger text across the site', group: 'Display', icon: 'type', run: 'text-size', words: 'text size bigger larger smaller font zoom read' },
  { id: 'd-contrast', label: 'Turn higher contrast on or off', sub: 'Stronger text and lines', group: 'Display', icon: 'contrast', run: 'contrast', words: 'contrast high readability accessibility' },
  { id: 'd-underline', label: 'Underline links', sub: 'Make every link easy to spot', group: 'Display', icon: 'link', run: 'underline', words: 'underline links accessibility' },
  { id: 'd-keys', label: 'Keyboard shortcuts', sub: 'What each key does on this page', group: 'Help', icon: 'keyboard', run: 'help', words: 'keyboard shortcuts hotkeys keys help', core: true },
  { id: 'd-top', label: 'Back to the top', sub: 'Scroll to the top of the page', group: 'Display', icon: 'compass', run: 'top', words: 'top scroll up start of page' },
  { id: 'd-copy', label: 'Copy the link to this page', sub: 'Share where you are', group: 'Display', icon: 'copy', run: 'copy-page', words: 'copy link url share this page' },
  { id: 'h-email', label: 'Email support', sub: 'support@logoless.io', group: 'Help', icon: 'mail', run: 'email-support', words: 'email support mail write help' },

  // ---------- brand dashboard ----------
  { id: 'b-dash', label: 'Brand dashboard', sub: 'Your campaigns at a glance', group: 'Brand', icon: 'home', href: '/brand', words: 'brand dashboard overview home business', who: U, core: true, rank: 5 },
  { id: 'b-new', label: 'Create a campaign', sub: 'Brief, budget and rate', group: 'Brand', icon: 'plus', href: '/brand/campaigns/new', words: 'create new start launch campaign promote song advertise make', who: U, core: true, rank: 8 },
  { id: 'b-camps', label: 'Your campaigns', sub: 'Every campaign you run', group: 'Brand', icon: 'megaphone', href: '/brand/campaigns', words: 'my campaigns manage list running live', who: U, core: true },
  { id: 'b-edit', label: 'Edit a campaign', sub: 'Change the brief, rules or budget', group: 'Brand', icon: 'text', href: '/brand/campaigns', words: 'edit change campaign brief rules budget rate update', who: U },
  { id: 'b-pause', label: 'Pause or end a campaign', sub: 'Stop taking new clips', group: 'Brand', icon: 'pause', href: '/brand/campaigns', words: 'pause stop end finish close campaign', who: U },
  { id: 'b-subs', label: 'Review submissions', sub: 'Approve or decline clips', group: 'Brand', icon: 'clapper', href: '/brand/submissions', words: 'review submissions clips approve decline creators posts', who: U, core: true, rank: 5 },
  { id: 'b-fund', label: 'Add funds', sub: 'Top up your balance with PayPal', group: 'Brand', icon: 'wallet', href: '/brand/balance#add-funds', words: 'add funds top up deposit balance money pay paypal fund', who: U, core: true, rank: 6 },
  { id: 'b-balance', label: 'Your brand balance', sub: 'What is in your account', group: 'Brand', icon: 'money', href: '/brand/balance', words: 'balance funds money left remaining', who: U },
  { id: 'b-refund', label: 'Withdraw unspent funds', sub: 'Ask for your money back', group: 'Brand', icon: 'receipt', href: '/brand/balance', words: 'refund withdraw unspent money back return', who: U },
  { id: 'b-billing', label: 'Billing and receipts', sub: 'Every payment you made', group: 'Brand', icon: 'receipt', href: '/brand/billing', words: 'billing invoices receipts payments history statement', who: U },
  { id: 'b-top', label: 'Top creators on your campaigns', sub: 'Who is carrying your campaign', group: 'Brand', icon: 'trophy', href: '/brand/overview', words: 'top creators best performers clippers', who: U, feature: 'top-creators' },
  { id: 'b-setup', label: 'Brand set-up guide', sub: 'The steps left to finish', group: 'Brand', icon: 'target', href: '/brand/setup', words: 'brand setup guide steps onboarding', who: U },
  { id: 'b-settings', label: 'Brand settings', sub: 'Discord and how we contact you', group: 'Brand', icon: 'settings', href: '/brand/settings', words: 'brand settings preferences', who: U },
  { id: 'b-discord', label: 'Connect Discord for your brand', sub: 'Get campaign updates in Discord', group: 'Brand', icon: 'discord', href: '/brand/settings#discord', words: 'discord brand connect server', who: U },

  // ---------- developers (anyone signed in) ----------
  { id: 'dv-apps', label: 'Your developer apps', sub: 'Register an app, get a client id', group: 'Developers', icon: 'code', href: '/developers/apps', words: 'developer apps register oauth client id secret api', who: U, feature: 'developers' },
  { id: 'dv-new', label: 'Register an app', sub: 'Add Sign in with logoless to your site', group: 'Developers', icon: 'plus', href: '/developers/apps', words: 'register create new app oauth client', who: U, feature: 'developers' },
  { id: 'dv-guide', label: 'OAuth guide', sub: 'Five steps to sign in with logoless', group: 'Developers', icon: 'book', href: '/developers#guide', words: 'oauth guide docs documentation how to integrate pkce', feature: 'developers' },

  // ---------- owner dashboard ----------
  { id: 'o-home', label: 'Owner overview', sub: 'What needs you first', group: 'Owner', icon: 'home', href: '/admin', words: 'owner admin overview dashboard home', who: A, core: true, rank: 4 },
  { id: 'o-reqs', label: 'Review campaign requests', sub: 'Accept or decline new campaigns', group: 'Owner', icon: 'megaphone', href: '/admin/campaigns', words: 'approve new requests launch campaigns accept decline', who: A, core: true },
  { id: 'o-clips', label: 'Review clips', sub: 'The submissions queue', group: 'Owner', icon: 'clapper', href: '/admin/submissions', words: 'clips approve decline views queue submissions moderate', who: A, core: true },
  { id: 'o-pay', label: 'Check payouts', sub: 'Withdrawals waiting for you', group: 'Owner', icon: 'wallet', href: '/admin/payouts', words: 'withdrawals paypal review money payouts send', who: A, core: true },
  { id: 'o-people', label: 'Find a person', sub: 'People', group: 'Owner', icon: 'users', href: '/admin/people', words: 'user account search email creator brand member people', who: A, core: true },
  { id: 'o-online', label: 'Who is online now', sub: 'People active in the last 5 minutes', group: 'Owner', icon: 'activity', href: '/admin/people?f=live', words: 'online active now live users', who: A },
  { id: 'o-risk', label: 'Flagged accounts', sub: 'People with extra checks', group: 'Owner', icon: 'flag', href: '/admin/people?f=risk', words: 'flagged risk fraud suspicious extra checks', who: A },
  { id: 'o-restricted', label: 'Suspended and banned accounts', sub: 'Restricted people', group: 'Owner', icon: 'lock', href: '/admin/people?f=restricted', words: 'suspended banned restricted blocked', who: A },
  { id: 'o-inbox', label: 'Answer the inbox', sub: 'Messages and reports', group: 'Owner', icon: 'mail', href: '/admin/inbox', words: 'messages tickets support replies inquiries reports', who: A, core: true },
  { id: 'o-email', label: 'Send an email', sub: 'Test and look at sent mail', group: 'Owner', icon: 'send', href: '/admin/email', words: 'email resend test message mail log', who: A, core: true },
  { id: 'o-broadcast', label: 'Post an announcement', sub: 'Tell everyone at once', group: 'Owner', icon: 'megaphone', href: '/admin/broadcast', words: 'broadcast notice notify everyone message all users', who: A, core: true },
  { id: 'o-bar', label: 'Set the announcement bar', sub: 'The message pill on the public site', group: 'Owner', icon: 'flag', href: '/admin/push', words: 'announcement bar banner message site', who: A, feature: 'announcement' },
  { id: 'o-discord', label: 'Discord bot', sub: 'Server, roles and channels', group: 'Owner', icon: 'discord', href: '/admin/discord', words: 'discord bot server roles channels test', who: A, core: true },
  { id: 'o-countdown', label: 'Launch countdown', sub: 'The launch page and its list', group: 'Owner', icon: 'clock', href: '/admin/countdown', words: 'launch countdown waitlist signups', who: A },
  { id: 'o-launch', label: 'Launch checklist', sub: 'What is left before launch', group: 'Owner', icon: 'rocket', href: '/admin/launch', words: 'launch checklist ready readiness', who: A },
  { id: 'o-invites', label: 'Artist invite links', sub: 'Private campaign links', group: 'Owner', icon: 'link', href: '/admin/invites', words: 'invites invite link artist private', who: A },
  { id: 'o-design', label: 'Change how the site looks', sub: 'Design', group: 'Owner', icon: 'palette', href: '/admin/design', words: 'design roundness rounded corners font typeface look theme cover layout', who: A, core: true },
  { id: 'o-text', label: 'Edit site text', sub: 'Every sentence on the site', group: 'Owner', icon: 'text', href: '/admin/text', words: 'copy words wording edit text sentences', who: A, core: true },
  { id: 'o-socials', label: 'Edit socials and links', sub: 'The footer and the links page', group: 'Owner', icon: 'link', href: '/admin/socials', words: 'social accounts footer links page', who: A, core: true },
  { id: 'o-previews', label: 'Previews', sub: 'See pages as others see them', group: 'Owner', icon: 'eye', href: '/admin/previews', words: 'preview look as user brand view', who: A },
  { id: 'o-system', label: 'System health', sub: 'Errors, services and money checks', group: 'Owner', icon: 'activity', href: '/admin/system', words: 'errors status health slow services money checks', who: A, core: true },
  { id: 'o-logs', label: 'Logs and events', sub: 'Requests, errors and page views', group: 'Owner', icon: 'chart', href: '/admin/logs', words: 'errors events requests page views logs', who: A, core: true },
  { id: 'o-audit', label: 'Audit log', sub: 'Every admin action', group: 'Owner', icon: 'book', href: '/admin/audit', words: 'audit log history who did what admin actions', who: A },
  { id: 'o-keys', label: 'Keys and tests', sub: 'PayPal, email, sign-in and the rest', group: 'Owner', icon: 'key', href: '/admin/keys', words: 'keys secrets paypal setup environment tests', who: A },
  { id: 'o-settings', label: 'Site switches and limits', sub: 'Pause withdrawals, sign-ups or clips', group: 'Owner', icon: 'settings', href: '/admin/settings', words: 'settings pause switches limits payout cap lockdown', who: A },
  { id: 'o-lockdown', label: 'Emergency lockdown', sub: 'Stop withdrawals, clips and sign-ups', group: 'Owner', icon: 'lock', href: '/admin#lockdown', words: 'emergency lockdown stop everything pause all panic', who: A },
  { id: 'o-security', label: 'Admin password', sub: 'The second password for risky actions', group: 'Owner', icon: 'shield', href: '/admin/security', words: 'admin password secret security second', who: A },
  { id: 'o-api', label: 'Owner API keys', sub: 'Run the admin work from another tool', group: 'Owner', icon: 'code', href: '/admin/api', words: 'api keys owner api base44 integration', who: A },
  { id: 'o-oauth', label: 'Developer apps on the site', sub: 'Verify or switch off apps', group: 'Owner', icon: 'layers', href: '/admin/developers', words: 'oauth apps developers verify suspend', who: A },
  { id: 'o-export', label: 'Export data', sub: 'Download tables as CSV', group: 'Owner', icon: 'receipt', href: '/admin/system', words: 'export download csv data backup', who: A },

  // ---------- developer tools (team) ----------
  { id: 't-features', label: 'Push a feature live', sub: 'Features', group: 'Developer tools', icon: 'rocket', href: '/dev/features', words: 'features release dev flags publish push live switch', who: D, core: true },
  { id: 't-previews', label: 'Dev previews', sub: 'Try looks before they ship', group: 'Developer tools', icon: 'eye', href: '/dev/previews', words: 'previews try design', who: D },
  { id: 't-dashboards', label: 'See every dashboard', sub: 'Creator, brand and owner side by side', group: 'Developer tools', icon: 'layers', href: '/dev/dashboards', words: 'dashboards preview all', who: D },
  { id: 't-events', label: 'Events', sub: 'What is happening on the site', group: 'Developer tools', icon: 'activity', href: '/dev/events', words: 'events vitals performance', who: D },
  { id: 't-design', label: 'Design options', sub: 'Fonts and looks for the team to try', group: 'Developer tools', icon: 'palette', href: '/dev/design', words: 'design fonts options dev', who: D },

  // ---------- legal ----------
  ...LEGAL_DOCS.map(([slug, title, words]): Command => ({ id: `l-${slug}`, label: title, sub: `/legal/${slug}`, group: 'Legal', icon: 'doc', href: `/legal/${slug}`, words: `${words} policy legal read` })),
]

export const COMMANDS: Command[] = base

/** Where a group sits when nothing has been typed, and how the groups are ordered for a tie. */
export const GROUP_ORDER: Group[] = ['Account', 'Money', 'Clips', 'Campaigns', 'Brand', 'Profile', 'Socials', 'Settings', 'Owner', 'Developer tools', 'Developers', 'Help', 'Answers', 'Display', 'Pages', 'Legal']

export type Viewer = { signedIn: boolean; admin: boolean; dev: boolean }

/** Is this command for this person, with these features switched on? */
export function allowed(c: Command, v: Viewer, features: Record<string, boolean>, full: boolean): boolean {
  if (!full && !c.core) return false
  if (c.feature && !features[c.feature]) return false
  if (!c.who) return true
  return c.who.some((w) => (w === 'guest' ? !v.signedIn : w === 'user' ? v.signedIn : w === 'admin' ? v.admin : w === 'dev' ? v.dev : false))
}

/** The few things offered before anything is typed, for this person, in this part of the site. */
export function suggestedIds(v: Viewer, area: string | null): string[] {
  if (!v.signedIn) return ['p-home', 'g-start', 'g-login', 'p-creators', 'p-brands', 'p-pricing']
  if (area === 'Owner') return ['o-reqs', 'o-clips', 'o-pay', 'o-people', 'o-inbox', 'o-design', 't-features']
  if (area === 'Brand') return ['b-new', 'b-fund', 'b-subs', 'b-camps', 'b-billing', 'b-settings']
  if (area === 'Creator') return ['p-home', 'c-withdraw', 'c-subs', 'so-link-tiktok', 'pr-edit', 'pr-copy', 's-notifs']
  return ['p-home', 'c-dash', 'c-withdraw', 'b-new', 'pr-edit', ...(v.admin ? ['o-home'] : [])]
}
