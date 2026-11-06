/** Names that are real pages, files or things staff would use. Nobody can take one of these as logoless.io/<name>. */
export const RESERVED_SLUGS = new Set([
  'about', 'admin', 'api', 'brand', 'brands', 'campaign', 'campaigns', 'careers', 'contact', 'covers', 'dashboard', 'faq', 'for-brands', 'for-clippers', 'for-creators',
  'forgot-password', 'how-it-works', 'legal', 'login', 'logout', 'onboarding', 'out', 'payouts', 'pricing', 'previews', 'signup', 'trust', 'u', 'welcome',
  'robots', 'sitemap', 'icon', 'apple-icon', 'favicon', 'logo', 'logoless', 'reset-password', 'verify-email', 'support', 'help', 'staff', 'root', 'static',
  'terms', 'privacy', 'settings', 'account', 'billing', 'pay', 'app', 'www', 'mail', 'email', 'dev', 'owner', 'test', 'blog', 'news', 'press', 'jobs', 'status', 'links', 'socials',
  'security', 'invite', 'invites', 'launch', 'trailers', 'scroll', 'scroll-signin', 'join', 'start', 'artist', 'artists', 'clipper', 'clippers', 'profile', 'profiles', 'search', 'home', 'index', 'null',
  'undefined', 'official', 'developers', 'developer', 'authorize', 'token', 'userinfo', 'team', 'discord', 'stripe', 'webhook', 'webhooks', 'auth', 'oauth', 'callback',
  'report', 'inquiry', 'leaderboard', 'lab', 'case-studies', 'llms', 'reels', 'recap', 'earn-demo', 'compare', 'saved', 'health', 'manifest', 'explore', 'discover', 'trending', 'rankings', 'wrapped', 'spotlight', 'notifications', 'achievements',
  'submissions', 'stats', 'clips',
  // the link-in-bio product (logoless.io/<name> is a person's page) and the routes added since
  'editor', 'claim', 'bio', 'calendar', 'clip-thumb', 'creators', 'kit', 'method', 'seventeen', 'signin-problem', 'sounds', 'whats-new', 'yt', '17', 'feed', 'templates', 'pricing', 'premium', 'upgrade', 'analytics', 'explore', 'logout', 'sign-in', 'sign-up', 'log-in', 'register', 'terms-of-service', 'privacy-policy', 'contact-us', 'abuse', 'report-abuse', 'dmca', 'cookies', 'about-us', 'preferences',
])

/** A name the site itself uses (a page, a folder of files, a route): nobody can have it as logoless.io/<name>. */
export const bioHandleReserved = (h: string) => RESERVED_SLUGS.has(h.toLowerCase())
