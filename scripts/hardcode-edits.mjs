#!/usr/bin/env node
// Writes the sentences edited in the site's text editor straight into the code, exactly as they were written.
//
//   node scripts/hardcode-edits.mjs            fetch the waiting edits, change the source files, list them in lib/retired-edits.ts
//   node scripts/hardcode-edits.mjs --check    the same, but change nothing; print how many files would change
//   node scripts/hardcode-edits.mjs --from f   use a JSON file ({ "edits": [{ key, original, value, page }] }) instead of the site
//
// It runs from .github/workflows/hardcode-text.yml every few minutes. Needs TEXT_SYNC_SECRET (and optionally TEXT_SYNC_URL).
// An edit is only written when its original sentence is found exactly where a person reads it (a string, or the text of a JSX
// element). A sentence that is built from live numbers, or that appears in too many places, is left alone: it keeps working from
// the editor until someone changes it by hand.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const args = process.argv.slice(2)
const CHECK = args.includes('--check')
const FROM = args.includes('--from') ? args[args.indexOf('--from') + 1] : null
const URL_ = process.env.TEXT_SYNC_URL || 'https://logoless.io/api/text-sync'
const MAX_PLACES = 15

// where an edited sentence is looked for: the code people read from, never the tools, the data layer or generated text
const DIRS = ['app', 'components', 'lib', 'hooks']
const SKIP = ['app/api/', 'app/admin', 'app/dev/', 'app/owner', 'components/admin', 'components/dev/', 'lib/discord', 'lib/launch-report', 'lib/retired-edits', 'lib/verbatim', 'lib/wording', 'lib/copy', 'lib/keys.ts', 'lib/staff-nav', 'llms.txt', 'components/app/setup-steps']

const norm = (s) => s.replace(/\s+/g, ' ').trim()
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function sources() {
  const out = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(ts|tsx)$/.test(e.name)) {
        const rel = path.relative(ROOT, p)
        if (!SKIP.some((s) => rel.includes(s))) out.push(rel)
      }
    }
  }
  for (const d of DIRS) if (fs.existsSync(path.join(ROOT, d))) walk(path.join(ROOT, d))
  return out
}

/** The ways one sentence can be written in a file: as is, with an escaped quote, as HTML entities, or wrapped over several lines. */
function patternsFor(original) {
  const o = norm(original)
  const forms = new Set([
    escRe(o),
    escRe(o.replace(/'/g, "\\'")),
    escRe(o.replace(/'/g, '&apos;')),
    escRe(o.replace(/"/g, '&quot;')),
    escRe(o.replace(/"/g, '\\"')),
    o.split(' ').map(escRe).join('\\s+'),
    o.split(' ').map((w) => escRe(w.replace(/'/g, '&apos;'))).join('\\s+'),
  ])
  return [...forms]
}

/** How the new sentence has to be written to be valid where the old one stood. Returns null when it cannot be done safely. */
function written(value, ctx) {
  if (ctx === "'") return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  if (ctx === '"') return value.includes('\n') ? null : value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  if (ctx === '`') return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
  // the text of a JSX element
  if (/[{}<>]/.test(value)) return null
  return value.replace(/&/g, '&amp;').replace(/'/g, '&apos;').replace(/"/g, '&quot;')
}

function find(text, original) {
  const hits = []
  const seen = new Set()
  for (const body of patternsFor(original)) {
    const re = new RegExp(`(?<pre>['"\`>])(?<w1>\\s*)(?<body>${body})(?<w2>\\s*)(?=(?<post>['"\`<]))`, 'g')
    for (const m of text.matchAll(re)) {
      const { pre, post } = m.groups
      if ('\'"`'.includes(pre) ? post !== pre : post !== '<') continue
      const start = m.index + 1 + m.groups.w1.length
      if (seen.has(start)) continue
      seen.add(start)
      hits.push({ start, end: start + m.groups.body.length, ctx: '\'"`'.includes(pre) ? pre : 'jsx' })
    }
  }
  return hits
}

async function loadEdits() {
  if (FROM) return JSON.parse(fs.readFileSync(FROM, 'utf8')).edits
  const secret = process.env.TEXT_SYNC_SECRET
  if (!secret) throw new Error('TEXT_SYNC_SECRET is not set.')
  const res = await fetch(URL_, { headers: { authorization: `Bearer ${secret}` } })
  if (!res.ok) throw new Error(`The site answered ${res.status} when asked for the waiting edits.`)
  return (await res.json()).edits
}

const edits = (await loadEdits()).filter((e) => e && typeof e.key === 'string' && typeof e.original === 'string' && typeof e.value === 'string' && norm(e.original) !== norm(e.value))
const files = sources()
const text = Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]))
const changed = new Set()
const done = []
const left = []

for (const e of edits) {
  const hits = []
  for (const f of files) for (const h of find(text[f], e.original)) hits.push({ f, ...h })
  if (hits.length === 0) {
    left.push({ ...e, why: 'the sentence was not found written out in the code (it may be built from live numbers)' })
    continue
  }
  if (hits.length > MAX_PLACES) {
    left.push({ ...e, why: `it appears in ${hits.length} places, which is too many to change safely` })
    continue
  }
  if (hits.some((h) => written(e.value, h.ctx) === null)) {
    left.push({ ...e, why: 'the new wording has a character that cannot be written safely where the old one stands' })
    continue
  }
  // from the end of each file backwards, so earlier positions stay valid
  for (const h of hits.sort((a, b) => b.start - a.start)) {
    text[h.f] = text[h.f].slice(0, h.start) + written(e.value, h.ctx) + text[h.f].slice(h.end)
    changed.add(h.f)
  }
  done.push({ ...e, places: hits.length })
}

if (!CHECK && done.length) {
  for (const f of changed) fs.writeFileSync(path.join(ROOT, f), text[f])

  // list the edits as retired, so the copy kept in the database stops being applied once this is live
  const retiredFile = 'lib/retired-edits.ts'
  let retired = fs.readFileSync(path.join(ROOT, retiredFile), 'utf8')
  for (const e of done) {
    const line = `  ${JSON.stringify(e.key)}: ${JSON.stringify(e.value)},\n`
    const existing = new RegExp(`^  ${escRe(JSON.stringify(e.key))}: .*,\\n`, 'm')
    retired = existing.test(retired) ? retired.replace(existing, line) : retired.replace(/\n\}\n?$/, `\n${line}}\n`)
  }
  fs.writeFileSync(path.join(ROOT, retiredFile), retired)

  // sentences that use the word "clip" are shown exactly as written, never reworded (see lib/wording.ts)
  const verbatim = done.filter((e) => /clip/i.test(e.value))
  if (verbatim.length) {
    const vf = 'lib/verbatim.ts'
    let v = fs.readFileSync(path.join(ROOT, vf), 'utf8')
    for (const e of verbatim) if (!v.includes(JSON.stringify(e.value))) v = v.replace(/\n\]\n?$/, `\n  ${JSON.stringify(e.value)},\n]\n`)
    fs.writeFileSync(path.join(ROOT, vf), v)
  }

  const subject = `Write ${done.length} edited sentence${done.length === 1 ? '' : 's'} from the text editor into the code`
  const body = done.map((e) => `- ${e.page}: "${norm(e.original).slice(0, 70)}" is now "${norm(e.value).slice(0, 70)}" (${e.places} place${e.places === 1 ? '' : 's'})`).join('\n')
  fs.writeFileSync(path.join(ROOT, '.hardcode-message.txt'), `${subject}\n\n${body}\n\nThese were edited in the owner dashboard (Site, Text). They are now part of the code, and the saved copies are retired.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n`)
}

const summary = { waiting: edits.length, wouldChangeFiles: changed.size, written: done.length, left: left.map((e) => ({ page: e.page, original: norm(e.original).slice(0, 80), why: e.why })) }
console.log(JSON.stringify(summary, null, 2))
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `count=${done.length}\n`)
if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [`### Edited text`, `${edits.length} waiting, ${done.length} ${CHECK ? 'can be' : 'were'} written into the code.`]
  if (left.length) lines.push('', 'Left as live edits (they keep working from the editor):', ...left.map((e) => `- ${e.page}: ${norm(e.original).slice(0, 80)} (${e.why})`))
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n')
}
