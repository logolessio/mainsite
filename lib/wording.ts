/**
 * The site's wording: "clipper" is now "creator", and "clip" is "submission" or "content". The swap happens when text is shown,
 * never in the saved text, so every sentence an admin has edited stays exactly as they wrote it (see components/shell/copy-provider).
 * It leaves addresses and code names alone (for-clippers, role=clipper, clip-check).
 */
const WORD = '(?<![\\w/@#=._-])'
const END = '(?![\\w-])'

const keep = (from: string, to: string) => (from === from.toUpperCase() && from.length > 1 ? to.toUpperCase() : from[0] === from[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to)

const VERBS = '(?:submit|submits|submitted|submitting|post|posts|posted|posting|send|sends|sent|sending|paste|pasted|upload|uploads|cut|cuts|cutting|make|makes|making|made|share|shares|film|record|edit)'
const DETERMINERS = '(?:your|the|this|that|each|every|any|their|my|our|one|another)'
const ORDINAL = '(?:first|next|latest|last|best|second|new)'

type Rule = [RegExp, (...m: string[]) => string]
const RULES: Rule[] = [
  // people
  [new RegExp(`${WORD}(clipper)(s?)${END}`, 'gi'), (_m, w, s) => keep(w, 'creator') + s],
  // the verb "to clip", and a few set phrases
  [new RegExp(`${WORD}(clipping)\\s+(accounts?)${END}`, 'gi'), (_m, a, b) => `${keep(a, 'creator')} ${b}`],
  [new RegExp(`${WORD}(clipping|clip)\\s+(campaigns?|marketplace)${END}`, 'gi'), (_m, a, b) => `${keep(a, 'content')} ${b}`],
  [new RegExp(`${WORD}(clip)(?=\\s+(?:this|it|them|that)${END})`, 'gi'), (_m, a) => keep(a, 'create')],
  [new RegExp(`${WORD}(clipping)${END}`, 'gi'), (_m, a) => keep(a, 'creating')],
  [new RegExp(`(\\bto\\s+)clip${END}`, 'gi'), (_m, pre) => `${pre}create`],
  [new RegExp(`(\\b(?:to|you|i|we|they|can|will|would|should|could|may|must|do|and)\\s+)clip(?=\\s+(?:from|for|on|with|anything|everything|more|too)${END})`, 'gi'), (_m, pre) => `${pre}create`],
  // "the clips you cut" -> "the content you cut"
  [new RegExp(`${WORD}(clips?)(?=\\s+(?:you|they|we|people|creators?)\\s+(?:cut|make|post|submit|send|made|posted|submitted)${END})`, 'gi'), (_m, a) => keep(a, 'content')],
  // "submit your first clip" -> "submit your first piece of content", "submit 10 clips" -> "submit 10 pieces of content"
  [new RegExp(`(\\bsubmit\\w*\\s+${DETERMINERS}\\s+${ORDINAL}\\s+)clip${END}`, 'gi'), (_m, pre) => `${pre}piece of content`],
  [new RegExp(`(\\bsubmit\\w*\\s+[\\d,]+\\s+)clips${END}`, 'gi'), (_m, pre) => `${pre}pieces of content`],
  // "a clip I submitted" -> "content I submitted"
  [new RegExp(`(?:a\\s+|the\\s+)?clips?(?=\\s+(?:i|you|we|they)\\s+submitted${END})`, 'gi'), () => 'content'],
  // after a verb: "post a clip" -> "post content", "post your clip" -> "post your content", "send your first clip" -> "send your first submission"
  [new RegExp(`(\\b${VERBS}\\s+)(?:a|an)\\s+clips?${END}`, 'gi'), (_m, v) => `${v}content`],
  [new RegExp(`(\\b${VERBS}\\s+${DETERMINERS}\\s+${ORDINAL}\\s+)(clip)(s?)${END}`, 'gi'), (_m, pre, w, s) => `${pre}${keep(w, 'submission')}${s}`],
  [new RegExp(`(\\b${VERBS}\\s+${DETERMINERS}\\s+)clips?${END}`, 'gi'), (_m, pre) => `${pre}content`],
  [new RegExp(`(\\b${VERBS}\\s+)clips${END}`, 'gi'), (_m, v) => `${v}content`],
  // everything else: the noun
  [new RegExp(`${WORD}(clip)(s?)${END}`, 'gi'), (_m, w, s) => keep(w, 'submission') + s],
]

export function applyWording(text: string): string {
  if (!/clip/i.test(text)) return text
  let out = text
  for (const [re, fn] of RULES) out = out.replace(re, fn as (...a: string[]) => string)
  return out
}
