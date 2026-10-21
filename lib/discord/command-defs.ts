import { applyWording } from '../wording'

/**
 * Every slash command, as Discord wants it for registration. Nothing else in here, so scripts/discord-register-commands.mjs can
 * read it without the rest of the site. The answers are in commands.ts.
 */
const S = 3 // string option
const U = 6 // user option
const choices = (...v: string[]) => v.map((x) => ({ name: x, value: x }))
export const RAW_COMMANDS = [
  { name: 'help', description: 'What this bot can do', type: 1 },
  { name: 'link', description: 'Connect your logoless account to Discord', type: 1 },
  { name: 'unlink', description: 'Disconnect your logoless account from Discord', type: 1 },
  { name: 'profile', description: 'Show a logoless profile', type: 1, options: [{ type: U, name: 'member', description: 'Someone else in the server (leave empty for you)', required: false }] },
  { name: 'stats', description: 'Your submissions, views and earnings', type: 1 },
  { name: 'balance', description: 'What you can withdraw, and what is still clearing', type: 1 },
  { name: 'submissions', description: 'Your latest submissions and where they stand', type: 1 },
  { name: 'badges', description: 'Your badges, or someone else’s', type: 1, options: [{ type: U, name: 'member', description: 'Someone else in the server', required: false }] },
  { name: 'campaigns', description: 'Campaigns you can join right now', type: 1 },
  { name: 'campaign', description: 'All the details of one campaign', type: 1, options: [{ type: S, name: 'name', description: 'Which campaign', required: true, autocomplete: true }] },
  {
    name: 'submit',
    description: 'Send your content to a campaign',
    type: 1,
    options: [
      { type: S, name: 'campaign', description: 'Which campaign', required: true, autocomplete: true },
      { type: S, name: 'platform', description: 'Where you posted it', required: true, choices: choices('tiktok', 'youtube', 'instagram') },
      { type: S, name: 'url', description: 'The link to your post', required: true, max_length: 300 },
    ],
  },
  { name: 'leaderboard', description: 'Who is bringing in the most views', type: 1, options: [{ type: S, name: 'period', description: 'How far back', required: false, choices: choices('30 days', 'all time') }] },
  { name: 'earn', description: 'Work out what some views are worth', type: 1, options: [{ type: 4, name: 'views', description: 'How many views', required: true, min_value: 1, max_value: 1_000_000_000 }, { type: S, name: 'campaign', description: 'Which campaign’s rate to use', required: false, autocomplete: true }] },
  { name: 'faq', description: 'Answers to common questions', type: 1, options: [{ type: S, name: 'question', description: 'What you want to know', required: true, autocomplete: true }] },
  { name: 'support', description: 'Open a private ticket with the logoless team', type: 1, options: [{ type: S, name: 'message', description: 'What you need', required: true, max_length: 1000 }] },
  { name: 'status', description: 'Is everything at logoless working?', type: 1 },
  { name: 'rules', description: 'Post the server rules in this channel (team only)', type: 1, default_member_permissions: '8' },
  { name: 'site', description: 'Post the logoless site card in this channel (team only)', type: 1, default_member_permissions: '8' },
  {
    name: 'report',
    description: 'Report a submission, a campaign or a person',
    type: 1,
    options: [
      { type: S, name: 'what', description: 'What kind of problem', required: true, choices: [{ name: 'Fake or inflated views', value: 'fake-views' }, { name: 'Stolen content', value: 'copyright' }, { name: 'Scam or misleading', value: 'scam' }, { name: 'Harassment', value: 'abuse' }, { name: 'Pretending to be someone', value: 'impersonation' }, { name: 'Something else', value: 'custom' }] },
      { type: S, name: 'where', description: 'A link, a @handle or a campaign name', required: true, max_length: 200 },
      { type: S, name: 'details', description: 'What happened', required: false, max_length: 1000 },
    ],
  },
  { name: 'notifications', description: 'Get your logoless notifications as Discord messages', type: 1, options: [{ type: S, name: 'mode', description: 'On or off', required: true, choices: choices('on', 'off') }] },
  { name: 'sync', description: 'Refresh your roles in this server', type: 1 },
  { name: 'ping', description: 'Is the bot awake?', type: 1 },
  // newer commands (the discord-commands switch): for everyone, for brands, for developers, and for fun
  { name: 'next', description: 'What to do next on logoless', type: 1 },
  { name: 'payout', description: 'Where your withdrawals are, and what you can withdraw', type: 1 },
  { name: 'rank', description: 'Your place on the leaderboard', type: 1 },
  { name: 'roles', description: 'Your roles in this server, and why you have them', type: 1 },
  { name: 'brand', description: 'Your campaigns: budget left, submissions and views (brands)', type: 1 },
  { name: 'dev', description: 'Your apps on the developer page (developers)', type: 1 },
  { name: '8ball', description: 'Ask the 8 ball anything', type: 1, options: [{ type: S, name: 'question', description: 'Your question', required: true, max_length: 200 }] },
  { name: 'coinflip', description: 'Heads or tails', type: 1 },
  { name: 'roll', description: 'Roll a die', type: 1, options: [{ type: 4, name: 'sides', description: 'How many sides (6 if empty)', required: false, min_value: 2, max_value: 1000 }] },
  { name: 'choose', description: 'Let the bot pick for you', type: 1, options: [{ type: S, name: 'options', description: 'Two or more things, split with commas', required: true, max_length: 300 }] },
  { name: 'hype', description: 'Hype someone up', type: 1, options: [{ type: U, name: 'member', description: 'Who (you, if empty)', required: false }] },
  { name: 'roast-my-clip', description: 'A friendly roast of your post, from its real numbers', type: 1, options: [{ type: S, name: 'url', description: 'The link to your TikTok or YouTube post', required: true, max_length: 300 }] },
  {
    name: 'admin',
    description: 'For the logoless team',
    type: 1,
    default_member_permissions: '8',
    options: [
      { type: 1, name: 'stats', description: 'The site at a glance' },
      { type: 1, name: 'queue', description: 'How many submissions are waiting, and for which campaigns' },
      { type: 1, name: 'lookup', description: 'Look someone up', options: [{ type: S, name: 'who', description: 'A @handle or an email', required: true }] },
      { type: 1, name: 'announce', description: 'Post an announcement in #news', options: [{ type: S, name: 'title', description: 'Headline', required: true, max_length: 200 }, { type: S, name: 'text', description: 'The message', required: true, max_length: 1500 }] },
      { type: 1, name: 'update', description: 'Post a product update in #updates', options: [{ type: S, name: 'title', description: 'Headline', required: true, max_length: 200 }, { type: S, name: 'text', description: 'What changed', required: true, max_length: 1500 }] },
      { type: 1, name: 'campaign', description: 'Pause, start or announce a campaign', options: [{ type: S, name: 'campaign', description: 'Which one', required: true, autocomplete: true }, { type: S, name: 'action', description: 'What to do', required: true, choices: choices('pause', 'resume', 'announce') }] },
      { type: 1, name: 'sync-all', description: 'Refresh everyone’s roles' },
      { type: 1, name: 'panel', description: 'Post a panel in this channel', options: [{ type: S, name: 'which', description: 'Which panel', required: true, choices: [{ name: 'Get started', value: 'start' }, { name: 'Support tickets', value: 'support' }, { name: 'Live status', value: 'status' }] }] },
      { type: 1, name: 'test', description: 'Show any message the bot can send, with made-up data', options: [{ type: S, name: 'which', description: 'Which message', required: true, autocomplete: true }] },
      { type: 1, name: 'tick', description: 'Run the 30-second loop now (cards, payouts, submissions, tickets, roles)' },
    ],
  },
]

// the site's wording is used in every description Discord shows (clip is submission or content, clipper is creator)
const localize = <T,>(v: T): T => {
  if (Array.isArray(v)) return v.map(localize) as T
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([key, val]) => [key, key === 'description' && typeof val === 'string' ? applyWording(val) : localize(val)])) as T
  return v
}
export const COMMANDS = localize(RAW_COMMANDS)
