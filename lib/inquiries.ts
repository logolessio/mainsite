import { db, nowSec } from './db'
import { HttpError } from './http'

/**
 * Messages and reports sent through the site. They are kept in the settings table, one row per conversation
 * ("inq:<id>"), so no database change is needed. A conversation has a private token: anyone who is not signed in keeps
 * a link with it, and that link is their way back. Nothing here sends email.
 */

export type Reply = { by: 'admin' | 'you'; text: string; at: number }
export type Inquiry = {
  id: string
  token: string
  kind: 'contact' | 'report'
  topic: string
  subject: string
  message: string
  name: string
  userId: string | null
  handle: string | null
  target: string // what a report is about: a link, a @handle or a campaign
  status: 'new' | 'open' | 'closed'
  at: number
  updated: number
  replies: Reply[]
  adminSeen: boolean
}

const key = (id: string) => `inq:${id}`
const rand = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => (b % 36).toString(36)).join('')
export const clean = (s: string, max: number) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max)

export async function createInquiry(i: Pick<Inquiry, 'kind' | 'topic' | 'subject' | 'message' | 'name' | 'userId' | 'handle' | 'target'>): Promise<Inquiry> {
  const d = await db()
  const t = nowSec()
  const inq: Inquiry = { ...i, id: `${t.toString(36)}${rand(6)}`, token: rand(24), status: 'new', at: t, updated: t, replies: [], adminSeen: false }
  await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)').bind(key(inq.id), JSON.stringify(inq), t).run()
  return inq
}

export async function getInquiry(id: string): Promise<Inquiry | null> {
  if (!/^[a-z0-9]{6,24}$/.test(id)) return null
  const d = await db()
  const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(key(id)).first<{ value: string }>()
  if (!r) return null
  try {
    return JSON.parse(r.value) as Inquiry
  } catch {
    return null
  }
}

export async function saveInquiry(inq: Inquiry) {
  const d = await db()
  inq.updated = nowSec()
  await d.prepare('UPDATE settings SET value = ?2, updated_at = ?3 WHERE key = ?1').bind(key(inq.id), JSON.stringify(inq), inq.updated).run()
}

export async function listInquiries(limit = 300): Promise<Inquiry[]> {
  const d = await db()
  const rows = (await d.prepare("SELECT value FROM settings WHERE key LIKE 'inq:%' ORDER BY updated_at DESC LIMIT ?1").bind(limit).all<{ value: string }>()).results
  const out: Inquiry[] = []
  for (const r of rows) {
    try {
      out.push(JSON.parse(r.value) as Inquiry)
    } catch {
      /* a broken row is skipped */
    }
  }
  return out
}

/** How many conversations are waiting for an admin to look at them. */
export async function newInquiryCount() {
  try {
    const d = await db()
    const r = await d.prepare("SELECT COUNT(*) AS n FROM settings WHERE key LIKE 'inq:%' AND value LIKE '%\"status\":\"new\"%'").first<{ n: number }>()
    return r?.n ?? 0
  } catch {
    return 0
  }
}

/** Who may open a conversation: the person who sent it (signed in, or holding its private token), or an admin. */
export function mayView(inq: Inquiry, who: { userId: string | null; admin: boolean }, token: string | null | undefined) {
  if (who.admin) return true
  if (who.userId && inq.userId === who.userId) return true
  return Boolean(token) && token === inq.token
}

export function requireView(inq: Inquiry | null, who: { userId: string | null; admin: boolean }, token: string | null | undefined): Inquiry {
  if (!inq || !mayView(inq, who, token)) throw new HttpError(404, 'We could not find that conversation.')
  return inq
}

/** What the sender sees: no private token of anyone else, nothing about admin bookkeeping. */
export const publicView = (inq: Inquiry) => ({ id: inq.id, kind: inq.kind, topic: inq.topic, subject: inq.subject, message: inq.message, target: inq.target, status: inq.status, at: inq.at, replies: inq.replies })
