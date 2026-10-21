// Matching for the ⌘K box: what someone types ("change my pfp", "cashout", "link tt", "privcy") against what a command is called and
// the words that should find it. Safe for the browser: no imports, no data.

/** Words that carry no meaning in a request ("how do I change my name" is about "change name"). */
const STOP_WORDS = ['a', 'an', 'the', 'my', 'me', 'i', 'im', 'to', 'of', 'for', 'on', 'in', 'at', 'how', 'do', 'does', 'can', 'could', 'please', 'want', 'wanna', 'where', 'is', 'are', 'it', 'its', 'your', 'you', 'would', 'like', 'go', 'show', 'page', 'some', 'with', 'and', 'or', 'from', 'this', 'that', 'what', 'whats', 'get', 'see', 'find', 'let', 'need', 'should', 'there', 'open', 'take', 'view', 'much', 'many', 'long', 'long', 'will', 'did', 'was', 'been', 'have', 'has', 'about', 'if', 'when', 'why', 'which', 'who', 'does', 'am', 'be', 'so', 'just', 'really', 'very', 'any', 'anyone', 'someone', 'they', 'them', 'their', 'then', 'than', 'too', 'also', 'not', 'no']
const STOP = new Set(STOP_WORDS.map((w) => w))

/** Groups of words that mean the same thing here. Typing any one of them also looks for the others. */
const SYNONYMS: string[][] = [
  ['picture', 'photo', 'pfp', 'avatar', 'pic', 'dp', 'image', 'headshot', 'icon', 'selfie'],
  ['name', 'displayname', 'nickname', 'called'],
  ['handle', 'username', 'user', 'tag', 'url'],
  ['withdraw', 'payout', 'payouts', 'cashout', 'cash', 'withdrawal', 'transfer', 'paid'],
  ['earnings', 'money', 'balance', 'income', 'revenue', 'earned', 'wallet'],
  ['delete', 'remove', 'erase', 'deactivate', 'destroy', 'close', 'cancel'],
  ['link', 'connect', 'add', 'attach', 'sync', 'hook'],
  ['unlink', 'disconnect', 'detach'],
  ['tiktok', 'tt', 'tik', 'tok'],
  ['youtube', 'yt', 'shorts', 'tube'],
  ['instagram', 'ig', 'insta', 'gram'],
  ['campaign', 'campaigns', 'brief', 'gig', 'gigs', 'job', 'jobs', 'offer', 'offers'],
  ['create', 'new', 'start', 'launch', 'make', 'begin', 'setup'],
  ['clip', 'clips', 'submission', 'submissions', 'video', 'videos', 'content', 'post', 'posts', 'upload', 'submit'],
  ['password', 'pw', 'pass', 'passcode', 'passwd'],
  ['logout', 'signout', 'logoff', 'leave', 'exit'],
  ['login', 'signin', 'log', 'sign'],
  ['signup', 'register', 'join', 'onboarding', 'enroll'],
  ['notifications', 'notifs', 'notification', 'alerts', 'bell', 'updates'],
  ['settings', 'preferences', 'prefs', 'options', 'config', 'configure'],
  ['help', 'support', 'contact', 'question', 'problem', 'issue', 'bug', 'assist', 'stuck', 'ticket'],
  ['privacy', 'gdpr', 'data', 'personal', 'tracking'],
  ['terms', 'tos', 'conditions', 'agreement', 'legal'],
  ['rules', 'guidelines', 'policy', 'allowed'],
  ['fees', 'fee', 'pricing', 'price', 'cost', 'costs', 'commission', 'charge', 'charges'],
  ['funds', 'topup', 'deposit', 'fund', 'credit', 'load'],
  ['refund', 'unspent', 'reimburse', 'back'],
  ['invoice', 'invoices', 'receipt', 'receipts', 'billing', 'bills', 'statement'],
  ['shortcuts', 'hotkeys', 'keyboard', 'keys', 'keybinds'],
  ['calm', 'motion', 'animations', 'animation', 'reduce', 'quiet'],
  ['larger', 'bigger', 'large', 'zoom', 'increase'],
  ['discord', 'server', 'dc'],
  ['verify', 'verification', 'verified', 'prove', 'tick', 'checkmark', 'confirm'],
  ['bio', 'about', 'description', 'intro'],
  ['banner', 'header', 'background'],
  ['leaderboard', 'ranking', 'rankings', 'top', 'rank', 'best'],
  ['stats', 'analytics', 'views', 'numbers', 'insights', 'performance'],
  ['email', 'mail', 'e-mail', 'address', 'inbox'],
  ['brand', 'brands', 'business', 'company', 'artist', 'label', 'advertiser'],
  ['creator', 'creators', 'clipper', 'clippers', 'influencer', 'editor'],
  ['dashboard', 'home', 'overview', 'main'],
  ['achievements', 'badges', 'badge', 'trophies', 'awards'],
  ['saved', 'favorites', 'favourites', 'hearted', 'liked', 'bookmarks', 'bookmarked'],
  ['owner', 'admin', 'staff'],
  ['rejected', 'declined', 'denied', 'refused'],
  ['edit', 'change', 'update', 'modify', 'rename', 'set', 'replace', 'fix'],
  ['paypal', 'pp'],
]

/** More ways of saying the same thing, mostly the words people use when they ask a question rather than look for a page. */
SYNONYMS.push(
  ['pay', 'paid', 'payment', 'payments', 'earn', 'earned', 'earning', 'compensation', 'reward', 'salary'],
  ['arrive', 'arrives', 'land', 'receive', 'received', 'come', 'delivered', 'delay', 'long', 'wait', 'when'],
  ['reject', 'rejected', 'declined', 'denied', 'refused', 'disapproved', 'failed', 'fail', 'wrong'],
  ['approve', 'approved', 'accepted', 'accept', 'passed', 'okay'],
  ['count', 'counted', 'counts', 'verified', 'tracked', 'tracking', 'measured', 'recognised', 'recognized'],
  ['follower', 'followers', 'audience', 'subscribers', 'fans', 'size', 'small'],
  ['free', 'cost', 'costs', 'charge', 'expensive', 'afford', 'cheap', 'price'],
  ['safe', 'secure', 'security', 'trust', 'trusted', 'legit', 'scam', 'real', 'fake'],
  ['minimum', 'min', 'least', 'threshold', 'limit', 'smallest'],
  ['time', 'days', 'hours', 'minutes', 'fast', 'quick', 'speed', 'soon', 'instant', 'instantly'],
  ['rule', 'rules', 'allowed', 'forbidden', 'banned', 'prohibited', 'restriction', 'restrictions', 'offlimits'],
  ['platform', 'platforms', 'network', 'networks', 'app', 'apps', 'site', 'sites'],
  ['budget', 'pool', 'spend', 'bank', 'bankroll', 'amount', 'funding'],
  ['rate', 'rates', 'cpm', 'perk', 'thousand', 'per1000'],
  ['account', 'accounts', 'profile', 'profiles', 'handle', 'page'],
  ['song', 'songs', 'music', 'track', 'tracks', 'audio', 'sound', 'sounds', 'artist', 'single', 'album'],
  ['deleted', 'gone', 'removed', 'missing', 'disappeared', 'taken', 'unavailable'],
  ['twofactor', '2fa', 'mfa', 'authenticator', 'passkey', 'passkeys', 'biometric'],
  ['recover', 'restore', 'undo', 'recovery', 'forgot', 'forgotten', 'reset', 'lost'],
  ['teen', 'age', 'minor', 'under', 'old', '18', 'kid', 'child'],
  ['country', 'countries', 'region', 'location', 'abroad', 'international', 'worldwide', 'global'],
  ['tax', 'taxes', 'vat', 'w9', 'w8', 'tax-form', 'irs'],
  ['dispute', 'appeal', 'review', 'reconsider', 'challenge', 'complain', 'complaint'],
)

/** Cuts a word back to its stem, so "getting paid", "gets paid" and "get paid" are the same words. Short words are left alone. */
export function stem(w: string): string {
  if (w.length <= 4) return w
  if (w.endsWith('ies') && w.length > 5) return `${w.slice(0, -3)}y`
  if (w.endsWith('ing') && w.length > 5) {
    const b = w.slice(0, -3)
    return b.length > 2 && b[b.length - 1] === b[b.length - 2] ? b.slice(0, -1) : b
  }
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2).replace(/(.)\1$/, '$1')
  if (w.endsWith('es') && w.length > 4 && /(s|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2)
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 4) return w.slice(0, -1)
  return w
}

export const tokens = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9@]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(stem)

const SYN = new Map<string, string[]>()
for (const group of SYNONYMS) {
  const g = group.map(stem)
  for (const w of g) SYN.set(w, [...new Set([...(SYN.get(w) ?? []), ...g.filter((x) => x !== w)])])
}

/** Edit distance with swapped neighbours counted as one edit ("pirvacy" is one away from "privacy"). Stops early past `max`. */
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const prev2 = new Array(b.length + 1).fill(0)
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1)
      cur.push(v)
      best = Math.min(best, v)
    }
    if (best > max) return max + 1
    prev2.splice(0, prev2.length, ...prev)
    prev = cur
  }
  return prev[b.length]
}

/** How well one typed word matches one word of a command (0 is no match). */
function wordScore(q: string, t: string): number {
  if (t === q) return 10
  if (q.length >= 2 && t.startsWith(q)) return 6 + Math.min(2, q.length / 4)
  if (q.length >= 3 && t.includes(q)) return 4
  if (q.length >= 4 && t.length >= 3) {
    const d = distance(q, t, q.length >= 7 ? 2 : 1)
    if (d <= (q.length >= 7 ? 2 : 1)) return 5 - d
    // a typo in the middle of a word still being typed: "privcy" against "privacy"
    if (t.length > q.length && distance(q, t.slice(0, q.length), 1) <= 1) return 3
  }
  return 0
}

export type Haystack = { label: string[]; words: string[]; text: string; body: string[] }

/** Turns a command's name and extra words into what `score` compares against. Do it once per command, not per keystroke. */
/**
 * `body` is a longer text the command is about (the answer to a question): its words count for less than the name and the extra words, but they let
 * a question be found by what the answer talks about.
 */
export const haystack = (label: string, words = '', body = ''): Haystack => ({ label: tokens(label), words: tokens(words), text: label.toLowerCase(), body: body ? [...new Set(tokens(body))].slice(0, 220) : [] })

export type Query = { raw: string; words: { word: string; alts: string[] }[] }

export function parseQuery(q: string): Query {
  const all = tokens(q)
  const meaningful = all.filter((w) => !STOP.has(w))
  const use = meaningful.length ? meaningful : all
  return { raw: q.trim().toLowerCase(), words: use.map((word) => ({ word, alts: SYN.get(word) ?? [] })) }
}

/**
 * How well a request matches a command: higher is better, 0 is no match. Every meaningful word has to be found (in the name, the extra
 * words, as a synonym or with a small typo), except that one word may be missing from a request of three or more.
 */
export function score(q: Query, h: Haystack): number {
  if (!q.words.length) return 1
  let total = 0
  let misses = 0
  for (const { word, alts } of q.words) {
    let best = 0
    for (const t of h.label) best = Math.max(best, wordScore(word, t) * 1.25)
    for (const t of h.words) best = Math.max(best, wordScore(word, t))
    if (best < 5) for (const t of h.body) best = Math.max(best, wordScore(word, t) * 0.5)
    if (best < 10) {
      for (const a of alts) {
        for (const t of h.label) if (t === a) best = Math.max(best, 8)
        for (const t of h.words) if (t === a) best = Math.max(best, 7)
        for (const t of h.body) if (t === a) best = Math.max(best, 3)
      }
    }
    if (best === 0) misses++
    total += best
  }
  if (misses > 0 && (q.words.length < 3 || misses > 1)) return 0
  total -= misses * 6
  if (q.raw && h.text.startsWith(q.raw)) total += 6
  else if (q.raw.length > 2 && h.text.includes(q.raw)) total += 3
  return Math.max(0.1, total / q.words.length + total / 20)
}
