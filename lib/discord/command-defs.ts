/**
 * Every slash command, as Discord wants it for registration. Nothing else in here, so scripts/discord-register-commands.mjs can
 * read it without the rest of the site. The answers are in commands.ts.
 */
const S = 3 // string option
const U = 6 // user option
export const RAW_COMMANDS = [
  { name: 'help', description: 'What this bot can do', type: 1 },
  { name: 'link', description: 'Connect your logoless account to Discord', type: 1 },
  { name: 'unlink', description: 'Disconnect your logoless account from Discord', type: 1 },
  { name: 'profile', description: 'Show a logoless page', type: 1, options: [{ type: U, name: 'member', description: 'Someone else in the server (leave empty for you)', required: false }] },
  { name: 'sync', description: 'Refresh your roles in this server', type: 1 },
  { name: 'roles', description: 'Your roles in this server, and why you have them', type: 1 },
  { name: 'ping', description: 'Is the bot awake?', type: 1 },
  { name: '8ball', description: 'Ask the 8 ball anything', type: 1, options: [{ type: S, name: 'question', description: 'Your question', required: true, max_length: 200 }] },
  { name: 'coinflip', description: 'Heads or tails', type: 1 },
  { name: 'roll', description: 'Roll a die', type: 1, options: [{ type: 4, name: 'sides', description: 'How many sides (6 if empty)', required: false, min_value: 2, max_value: 1000 }] },
  { name: 'choose', description: 'Let the bot pick for you', type: 1, options: [{ type: S, name: 'options', description: 'Two or more things, split with commas', required: true, max_length: 300 }] },
  { name: 'hype', description: 'Hype someone up', type: 1, options: [{ type: U, name: 'member', description: 'Who (you, if empty)', required: false }] },
  {
    name: 'admin',
    description: 'For the logoless team',
    type: 1,
    default_member_permissions: '8',
    options: [
      { type: 1, name: 'stats', description: 'The site at a glance' },
      { type: 1, name: 'lookup', description: 'Look someone up', options: [{ type: S, name: 'who', description: 'A handle or an email', required: true }] },
      { type: 1, name: 'announce', description: 'Post an announcement in #news', options: [{ type: S, name: 'title', description: 'Headline', required: true, max_length: 200 }, { type: S, name: 'text', description: 'The message', required: true, max_length: 1500 }] },
      { type: 1, name: 'update', description: 'Post a product update in #updates', options: [{ type: S, name: 'title', description: 'Headline', required: true, max_length: 200 }, { type: S, name: 'text', description: 'What changed', required: true, max_length: 1500 }] },
      { type: 1, name: 'sync-all', description: 'Refresh everyone’s roles' },
    ],
  },
]

export const COMMANDS = RAW_COMMANDS
