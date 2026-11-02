import type { Component, Embed, Message } from './api'
import { big, btn, card, join, small } from './ui'

/** The answers to the roles command and the fun commands, built from plain data only (nothing reads the database or calls Discord). */
const quiet = { parse: [] as string[] }
const msg = (embeds: Embed[], components?: Component[]): Message => ({ embeds, components, allowed_mentions: quiet })
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

export const rolesCard = (have: string[], why: string[]): Message =>
  msg([card({ icon: 'users', label: 'Your roles', text: join(have.length ? have.map((r) => `<@&${r}>`).join(' ') : 'None yet.', '', small(why.join(' · ') || 'Link your account to get roles.')) })], [{ type: 1, components: [btn('Refresh', 'cmd:sync')] }])

// ---------- fun ----------
const pick = <T,>(list: T[], seed = Math.random()) => list[Math.floor(seed * list.length) % list.length]
const EIGHT = ['It is certain.', 'Without a doubt.', 'Yes, and post it today.', 'Signs point to yes.', 'Ask again after your next 1,000 views.', 'The algorithm is thinking.', 'Better not tell you now.', 'Very doubtful.', 'My sources say no.', 'Outlook: viral.', 'Only if the hook lands in the first second.', 'Not with that thumbnail.']
export const eightBallCard = (question: string, seed?: number): Message => msg([card({ icon: 'spark', label: 'The 8 ball', text: join(small(cut(question, 200)), big(pick(EIGHT, seed))) })])
export const coinCard = (seed = Math.random()): Message => msg([card({ icon: 'spark', label: 'Coin flip', text: big(seed < 0.5 ? 'Heads' : 'Tails') })])
export const rollCard = (sides: number, seed = Math.random()): Message => msg([card({ icon: 'spark', label: `A ${sides}-sided die`, text: big(String(1 + Math.floor(seed * sides))) })])
export const chooseCard = (options: string[], seed?: number): Message => msg([card({ icon: 'spark', label: 'I choose', text: join(big(cut(pick(options, seed), 120)), small(`out of ${options.length}`)) })])
const HYPE = ['is about to have the best week of their life.', 'posts like the algorithm owes them money.', 'has hooks so good the first second gets a replay.', 'is one upload away from the leaderboard.', 'edits faster than the trend moves.', 'turns views into rent.']
export const hypeCard = (who: string, seed?: number): Message => ({ ...msg([card({ icon: 'star', label: 'Hype', text: big(`${who} ${pick(HYPE, seed)}`) })]), allowed_mentions: quiet })

