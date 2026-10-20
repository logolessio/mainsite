// Matching for the ⌘K box: what someone types ("change my pfp", "cashout", "link tt", "privcy") against what a command is called and
// the words that should find it. Safe for the browser: no imports, no data.

/** Words that carry no meaning in a request ("how do I change my name" is about "change name"). */
const STOP = new Set(['a', 'an', 'the', 'my', 'me', 'i', 'im', 'to', 'of', 'for', 'on', 'in', 'at', 'how', 'do', 'does', 'can', 'could', 'please', 'want', 'wanna', 'where', 'is', 'are', 'it', 'its', 'your', 'you', 'would', 'like', 'go', 'show', 'page', 'some', 'with', 'and', 'or', 'from', 'this', 'that', 'what', 'whats', 'get', 'see', 'find', 'let', 'need', 'should', 'there', 'open', 'take', 'view'])

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

const SYN = new Map<string, string[]>()
for (const group of SYNONYMS) for (const w of group) SYN.set(w, [...new Set([...(SYN.get(w) ?? []), ...group.filter((x) => x !== w)])])

export const tokens = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9@]+/g, ' ')
    .split(' ')
    .filter(Boolean)

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

export type Haystack = { label: string[]; words: string[]; text: string }

/** Turns a command's name and extra words into what `score` compares against. Do it once per command, not per keystroke. */
export const haystack = (label: string, words = ''): Haystack => ({ label: tokens(label), words: tokens(words), text: label.toLowerCase() })

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
    if (best < 10) {
      for (const a of alts) {
        for (const t of h.label) if (t === a) best = Math.max(best, 8)
        for (const t of h.words) if (t === a) best = Math.max(best, 7)
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
