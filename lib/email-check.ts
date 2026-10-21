// Looking over an email address before it is saved: tidy it, say what is wrong in plain words, and catch the usual typos ("gmial.com").
// No network and no secrets, so the browser and the server can both use it.

const POPULAR = ['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'yahoo.com', 'ymail.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'zoho.com', 'mail.com', 'hey.com', 'fastmail.com', 'yandex.com']
/** The endings people mistype, and what they meant. */
const ENDING: Record<string, string> = { con: 'com', cim: 'com', vom: 'com', xom: 'com', ocm: 'com', comm: 'com', coom: 'com', cm: 'com', om: 'com', c0m: 'com', nett: 'net', ner: 'net', orgg: 'org', ogr: 'org' }

/** The address as a person would want it stored: no spaces or brackets, lower case. */
export function cleanEmail(raw: string): string {
  return raw
    .trim()
    .replace(/^mailto:/i, '')
    .replace(/^<|>$/g, '')
    .replace(/\s+/g, '')
    .replace(/[.,;]+$/, '')
    .toLowerCase()
}

/** How many single-letter changes (a typo, a missing letter, two letters swapped) turn one word into another. */
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

export type EmailCheck = {
  /** the tidied address */
  email: string
  ok: boolean
  /** what is wrong, in plain words (empty when nothing is typed yet or it is fine) */
  problem: string
  /** a likely correction ("name@gmail.com"), when the address looks like a typo of a common one */
  suggestion: string | null
}

export function checkEmail(raw: string): EmailCheck {
  const email = cleanEmail(raw)
  const bad = (problem: string): EmailCheck => ({ email, ok: false, problem, suggestion: null })
  if (!email) return bad('')
  const ats = email.split('@').length - 1
  if (ats === 0) return bad('Add the @ and the part after it, like name@gmail.com.')
  if (ats > 1) return bad('There is more than one @ in it.')
  const [local, domain] = email.split('@')
  if (!local) return bad('Add the part before the @.')
  if (!/^[a-z0-9._%+'-]+$/.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return bad('Before the @ use letters, numbers and . _ + - only.')
  if (!domain) return bad('Add the part after the @, like gmail.com.')
  if (!domain.includes('.')) return bad('The part after the @ needs a dot, like gmail.com.')
  if (!/^[a-z0-9.-]+$/.test(domain) || domain.startsWith('.') || domain.startsWith('-') || domain.includes('..')) return bad('After the @ use letters, numbers, dots and dashes only.')
  const labels = domain.split('.')
  const tld = labels[labels.length - 1]
  if (tld.length < 2) return bad('That ending is too short.')
  if (email.length > 254) return bad('That address is too long.')

  // typos: a mistyped ending first, then a mistyped well-known provider
  let fixed = domain
  if (ENDING[tld]) fixed = [...labels.slice(0, -1), ENDING[tld]].join('.')
  let best = fixed
  if (!POPULAR.includes(fixed)) {
    let bestD = 99
    for (const p of POPULAR) {
      const d = distance(fixed, p)
      const limit = p.length <= 9 ? 1 : 2
      if (d <= limit && d < bestD) {
        bestD = d
        best = p
      }
    }
  }
  const suggestion = best !== domain ? `${local}@${best}` : null
  return { email, ok: true, problem: '', suggestion }
}
