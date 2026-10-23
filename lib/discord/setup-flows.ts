import { auditSafe } from '../chain'
import { db, nowSec } from '../db'
import { codeEmail, emailEnabled, plainMessageEmail, sendEmail } from '../email'
import { checkEmail, maskEmail } from '../email-check'
import { checkCode, issueCode } from '../email-code'
import { hit } from '../guard'
import { HttpError } from '../http'
import { notify } from '../notify'
import { addPaypalEmail, paypalEmails, removePaypalEmail } from '../paypal-emails'
import { ensureProfile, saveProfile } from '../profile'
import { findOrCreateUser, type UserRow } from '../user'
import { markVerified } from '../verification'
import { askTeam, check, handleOf, isPlatform, labelOf, linksOf, lookup, type Platform, PLATFORMS, profileUrlFor, start, statesFor } from '../bio-verify'
import type { Message } from './api'
import type { Env, Interaction, Reply } from './commands'
import { linkDiscord, userByDiscord } from './link'
import { embedCard, embedMessage, pbtn, plink } from './look'
import { launchNotice } from './notice'
import { syncRoles } from './roles'

/**
 * Everything a member needs to get set up without opening the website: make an account (an emailed code proves the address, and the Discord is linked at
 * the same moment), link a TikTok, YouTube or Instagram account and prove it is theirs with a code in the bio, and add a PayPal address (the code goes to the
 * account's email, as on the site). Buttons and forms only: nothing here is a page. The answers are private to the person who pressed.
 *
 * The same checks as the site's own pages are used (lib/bio-verify.ts, lib/paypal-emails.ts, lib/email-code.ts), so an account set up here and one set up there are the same thing.
 */
const EPHEMERAL = 64
const EMOJI: Record<Platform, string> = { tiktok: '🎵', youtube: '▶️', instagram: '📸' }
const FOUR_DAYS = 4 * 86400
const PENDING_LIFE = 10 * 60

const send = (m: Message, ephemeral = true): Reply => {
  const { raw: _raw, ...data } = m
  return { type: 4, data: { ...data, flags: (data.flags ?? 0) | (ephemeral ? EPHEMERAL : 0), allowed_mentions: data.allowed_mentions ?? { parse: [] } } }
}
const modal = (id: string, title: string, inputs: { id: string; label: string; placeholder?: string; min?: number; max?: number }[]): Reply => ({
  type: 9,
  data: { custom_id: id, title, components: inputs.map((i) => ({ type: 1, components: [{ type: 4, custom_id: i.id, label: i.label, style: 1, min_length: i.min ?? 1, max_length: i.max ?? 200, required: true, placeholder: i.placeholder }] })) },
})
const problem = (text: string, buttons?: Parameters<typeof embedMessage>[1]): Message => embedMessage(embedCard({ title: '⚠️ Not quite', text, bar: false }), buttons)

const whoami = (i: Interaction) => (i.member?.user ?? i.user)!

type Account = { id: string; email: string; name: string; status: string }
async function accountOf(discordId: string): Promise<Account | null> {
  const userId = await userByDiscord(discordId)
  if (!userId) return null
  const r = await (await db()).prepare('SELECT id, email, COALESCE(name, \'\') AS name, status FROM users WHERE id = ?1').bind(userId).first<Account>()
  return r && r.status === 'active' ? r : null
}
const userRow = async (id: string) => (await (await db()).prepare('SELECT * FROM users WHERE id = ?1').bind(id).first<UserRow>())!

const launchNote = launchNotice

// ---------- pending steps (a code was sent, and the form that takes it comes next) ----------
type Pending = { email: string; at: number }
const pendingKey = (kind: 'join' | 'paypal', id: string) => `discord:${kind}:${id}`
async function putPending(kind: 'join' | 'paypal', id: string, email: string) {
  await (await db())
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(pendingKey(kind, id), JSON.stringify({ email, at: nowSec() } satisfies Pending), nowSec())
    .run()
}
async function takePending(kind: 'join' | 'paypal', id: string): Promise<Pending | null> {
  const d = await db()
  const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(pendingKey(kind, id)).first<{ value: string }>()
  if (!r) return null
  try {
    const p = JSON.parse(r.value) as Pending
    return nowSec() - p.at <= PENDING_LIFE ? p : null
  } catch {
    return null
  }
}
const dropPending = async (kind: 'join' | 'paypal', id: string) => void (await (await db()).prepare('DELETE FROM settings WHERE key = ?1').bind(pendingKey(kind, id)).run())

const short = (s: string) => {
  let h = 2166136261
  for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619)
  return (h >>> 0).toString(36).slice(0, 4)
}

// ---------- making an account ----------
const joinPrompt = async (): Promise<Message> =>
  embedMessage(
    embedCard({
      title: '✨ Make your account first',
      text: 'It takes about a minute and happens right here: we email you a 6 digit code to prove the address, and your Discord is linked to the account at the same moment.',
      notice: await launchNote(),
    }),
    [pbtn('Make my account', 'acct:join', 'green', '✨'), plink('Log in with Discord instead', '/login', '🔑')],
  )

function startJoin(i: Interaction, existing: Account | null): Reply | Promise<Reply> {
  if (existing) return send(embedMessage(embedCard({ title: '✅ You already have an account', text: 'Your Discord is linked to your logoless account. Link an account or add PayPal below.', bar: false }), [pbtn('Link an account', 'acct:link', 'green', '🔗'), pbtn('Add PayPal', 'pay:link', 'grey', '💸')]))
  void i
  return modal('modal:join', 'Make your logoless account', [{ id: 'email', label: 'Your email address', placeholder: 'you@example.com', min: 5, max: 254 }])
}

async function sendJoinCode(i: Interaction, raw: string): Promise<Reply> {
  const u = whoami(i)
  if ((await accountOf(u.id)) || (await userByDiscord(u.id))) return send(problem('This Discord is already linked to an account.'))
  // a Discord account made in the last few days cannot make a logoless account here (they are the easy way to make many)
  const made = Math.floor(Number(BigInt(u.id)) / 4194304) + 1420070400000 // a Discord id begins with the moment the account was made
  if (Date.now() - made < FOUR_DAYS) return send(problem('Your Discord account is very new. Come back in a few days, or make your account on logoless.io.'))
  const c = checkEmail(raw)
  if (!c.ok) return send(problem(c.problem || 'That does not look like an email address.', [pbtn('Try again', 'acct:join', 'green', '✨')]))
  if (c.suggestion) return send(problem(`Did you mean **${c.suggestion}**? Check the spelling and try again.`, [pbtn('Try again', 'acct:join', 'green', '✨')]))
  if ((await hit(`dj:${u.id}`, 3600)) > 5 || (await hit(`dje:${c.email}`, 3600)) > 3) return send(problem('Too many tries. Please wait a while and try again.'))
  if (!(await emailEnabled())) return send(problem('Email is not set up yet, so I cannot send the code. Please try again soon.'))
  try {
    const code = await issueCode(c.email, 'verify', `discord:${u.id}`)
    await sendEmail({ to: c.email, ...codeEmail(code, 'verify'), template: 'verify code' })
  } catch (e) {
    return send(problem(e instanceof HttpError ? e.message : 'I could not send the code. Please try again.'))
  }
  await putPending('join', u.id, c.email)
  return send(
    embedMessage(embedCard({ title: '📬 Check your inbox', text: `We sent a 6 digit code to **${maskEmail(c.email)}**. It works for 10 minutes. Press the button and type it in.`, bar: false }), [pbtn('Enter the code', 'join:code', 'green', '🔢'), pbtn('Wrong address', 'acct:join', 'grey', '✏️')]),
  )
}

async function finishJoin(i: Interaction, code: string): Promise<Reply> {
  const u = whoami(i)
  const p = await takePending('join', u.id)
  if (!p) return send(problem('That took too long. Start again.', [pbtn('Make my account', 'acct:join', 'green', '✨')]))
  const ok = await checkCode(p.email, 'verify', code.trim())
  if (!ok || ok.payload !== `discord:${u.id}`) return send(problem('That code is not right, or it has expired. Press the button to try again.', [pbtn('Enter the code', 'join:code', 'green', '🔢')]))
  try {
    const user = await findOrCreateUser(p.email, u.global_name ?? u.username, null, { fromDiscord: true })
    await linkDiscord(user.id, u.id)
    await markVerified(user.id)
    await ensureProfile(await userRow(user.id))
    await dropPending('join', u.id)
    await auditSafe({ id: user.id, email: user.email }, 'account.discord_join', user.id, user.isNew ? 'new account' : 'existing account')
    void syncRoles(user.id).catch(() => null)
  } catch (e) {
    return send(problem(e instanceof HttpError ? e.message : 'I could not finish that. Please try again.'))
  }
  return send(
    embedMessage(
      embedCard({ title: '🎉 You are in', text: 'Your account is made and this Discord is linked to it. Next: link your TikTok, YouTube or Instagram and add PayPal, so you are ready when we open.', notice: await launchNote() }),
      [pbtn('Link an account', 'acct:link', 'green', '🔗'), pbtn('Add PayPal', 'pay:link', 'grey', '💸')],
    ),
  )
}

// ---------- linking and proving accounts ----------
const platformButtons = () => PLATFORMS.map((p) => pbtn(labelOf(p), `acct:add:${p}`, 'grey', EMOJI[p]))

function codeCard(handle: string, platform: Platform, code: string): Message {
  const where = platform === 'youtube' ? 'channel description (About tab)' : 'bio'
  return embedMessage(
    embedCard({
      title: `🔐 Prove @${handle} is yours`,
      text: [`**1.** Put this code anywhere in your ${labelOf(platform)} ${where}:`, `\`\`\`${code}\`\`\``, '**2.** Save it, wait a minute, then press **Check my bio**.', '-# The code works for 7 days. You can take it out of your bio once it says verified.'].join('\n'),
      bar: false,
    }),
    [pbtn('Check my bio', `acct:check:${platform}`, 'green', '✅'), plink('Open my profile', profileUrlFor(platform, handle), '🔎'), ...(platform === 'instagram' ? [pbtn('Ask the team to check', `acct:ask:${platform}`, 'grey', '🧑‍💻')] : [])],
  )
}

async function addAccount(a: Account, platform: Platform, raw: string): Promise<Message> {
  const typed = raw.trim()
  const handle = /[/.]/.test(typed) && /^(https?:\/\/)?[^/]+\/./.test(typed) ? handleOf(platform, /^https?:\/\//.test(typed) ? typed : `https://${typed}`) : typed.replace(/^@/, '')
  if (!handle || !/^[A-Za-z0-9._-]{2,60}$/.test(handle)) return problem(`That does not look like a ${labelOf(platform)} username. Type just the name, like @yourname.`, [pbtn('Try again', `acct:add:${platform}`, 'green', EMOJI[platform])])
  try {
    const links = await linksOf(a.id)
    await saveProfile(await userRow(a.id), { links: [...links.filter((l) => l.platform !== platform), { platform, url: profileUrlFor(platform, handle) }] })
    const found = await lookup(a.id, platform)
    if (found.status === 'missing') {
      await saveProfile(await userRow(a.id), { links: links.filter((l) => l.platform !== platform) })
      return problem(found.message || `We could not find @${handle} on ${labelOf(platform)}. Check the spelling.`, [pbtn('Try again', `acct:add:${platform}`, 'green', EMOJI[platform])])
    }
    const r = await start(a.id, platform)
    if (!r.ok) return problem(r.error)
    return codeCard(handle, platform, r.state.code ?? '')
  } catch (e) {
    return problem(e instanceof HttpError ? e.message : 'I could not link that. Please try again.')
  }
}

async function checkAccount(a: Account, platform: Platform): Promise<Message> {
  const r = await check(a.id, a.email, platform)
  const states = await statesFor(a.id)
  const s = states.find((x) => x.platform === platform)
  if (r.status === 'verified') {
    return embedMessage(embedCard({ title: `✅ ${labelOf(platform)} verified`, text: `**@${s?.handle ?? ''}** is yours. Posts from it can be checked automatically. You can take the code out of your bio now.`, notice: await launchNote() }), [pbtn('Manage accounts', 'acct:manage', 'grey', '📋'), pbtn('Add PayPal', 'pay:link', 'green', '💸')])
  }
  if (r.status === 'unreadable') {
    return embedMessage(embedCard({ title: `🤔 I cannot read that profile`, text: `${r.message}\n\nA person on the team can check it by hand instead.`, bar: false }), [pbtn('Ask the team to check', `acct:ask:${platform}`, 'green', '🧑‍💻'), pbtn('Try again', `acct:check:${platform}`, 'grey', '🔁')])
  }
  return problem(r.message, [pbtn('Check again', `acct:check:${platform}`, 'green', '🔁')])
}

async function manageAccounts(a: Account): Promise<Message> {
  const states = await statesFor(a.id)
  if (!states.length) return embedMessage(embedCard({ title: '📋 Your accounts', text: 'You have not linked any account yet. Link the TikTok, YouTube or Instagram you post from, and prove it is yours.', bar: false }), [pbtn('Link an account', 'acct:link', 'green', '🔗')])
  const line = (s: (typeof states)[number]) =>
    s.status === 'verified'
      ? `✅ **${labelOf(s.platform)}** @${s.handle} · verified`
      : s.status === 'waiting'
        ? `⏳ **${labelOf(s.platform)}** @${s.handle} · waiting for the team to check`
        : s.status === 'code'
          ? `🟡 **${labelOf(s.platform)}** @${s.handle} · put \`${s.code}\` in your bio, then press Check`
          : `⚪ **${labelOf(s.platform)}** @${s.handle || '?'} · not verified yet`
  const checks = states.filter((s) => s.status !== 'verified' && s.status !== 'waiting' && s.handle).map((s) => pbtn(`Check ${labelOf(s.platform)}`, `acct:check:${s.platform}`, 'green', '✅'))
  const removes = states.map((s) => pbtn(`Remove ${labelOf(s.platform)}`, `acct:rm:${s.platform}`, 'red', '🗑️'))
  const m = embedMessage(embedCard({ title: '📋 Your accounts', text: states.map(line).join('\n'), notice: await launchNote() }), [pbtn('Link another', 'acct:link', 'grey', '🔗'), ...checks.slice(0, 3)])
  return { ...m, components: [...(m.components ?? []), { type: 1, components: removes.slice(0, 5) }] }
}

// ---------- PayPal ----------
async function startPaypal(a: Account): Promise<Reply> {
  const cur = await paypalEmails(a.id)
  if (cur.emails.length >= 5) return send(problem('You already have 5 PayPal emails. Remove one first.', [pbtn('Manage payment methods', 'pay:manage', 'grey', '📋')]))
  return modal('modal:paypal', 'Add a PayPal email', [
    { id: 'email', label: 'The email your PayPal account uses', placeholder: 'you@example.com', min: 5, max: 254 },
    { id: 'again', label: 'Type it again, to be sure', placeholder: 'you@example.com', min: 5, max: 254 },
  ])
}

async function sendPaypalCode(a: Account, first: string, again: string): Promise<Reply> {
  const c = checkEmail(first)
  if (!c.ok) return send(problem(c.problem || 'That does not look like an email address.', [pbtn('Try again', 'pay:link', 'green', '💸')]))
  if (c.email !== checkEmail(again).email) return send(problem('The two addresses are not the same. Type it carefully, twice.', [pbtn('Try again', 'pay:link', 'green', '💸')]))
  if (c.suggestion) return send(problem(`Did you mean **${c.suggestion}**? A payout sent to a mistyped address is lost, so check it and try again.`, [pbtn('Try again', 'pay:link', 'green', '💸')]))
  const cur = await paypalEmails(a.id)
  if (cur.emails.includes(c.email)) return send(problem('That email is already on your list.'))
  if ((await hit(`dp:${a.id}`, 900)) > 6) return send(problem('Too many tries. Please wait a few minutes and try again.'))
  if (!(await emailEnabled())) return send(problem('Email is not set up yet, so I cannot send the code. Please try again soon.'))
  const account = a.email.toLowerCase()
  try {
    const code = await issueCode(account, 'payout', c.email)
    await sendEmail({ to: account, ...codeEmail(code, 'payout'), template: 'payout code' })
  } catch (e) {
    return send(problem(e instanceof HttpError ? e.message : 'I could not send the code. Please try again.'))
  }
  await putPending('paypal', a.id, c.email)
  return send(embedMessage(embedCard({ title: '📬 Check your inbox', text: `To keep your money safe we sent a 6 digit code to your **account email** (${maskEmail(account)}). Enter it to add **${maskEmail(c.email)}**. It works for 10 minutes.`, bar: false }), [pbtn('Enter the code', 'pay:code', 'green', '🔢')]))
}

async function finishPaypal(a: Account, code: string): Promise<Reply> {
  const p = await takePending('paypal', a.id)
  if (!p) return send(problem('That took too long. Start again.', [pbtn('Add PayPal', 'pay:link', 'green', '💸')]))
  const account = a.email.toLowerCase()
  const ok = await checkCode(account, 'payout', code.trim())
  if (!ok || ok.payload !== p.email) return send(problem('That code is not right, or it has expired. Press the button to try again.', [pbtn('Enter the code', 'pay:code', 'green', '🔢')]))
  await addPaypalEmail(a.id, p.email, true)
  await dropPending('paypal', a.id)
  await notify(a.id, { kind: 'payout', title: 'PayPal email added', body: `${maskEmail(p.email)} can now be paid. If this was not you, change your password.`, href: '/dashboard/earnings', dedupe: `paypal-add:${p.email}:${Math.floor(Date.now() / 60000)}` })
  if (await emailEnabled()) {
    await sendEmail({ to: account, ...plainMessageEmail(a.name, 'A payout email was added', `${p.email} was added as a PayPal email for payouts on your logoless account, from Discord. If this was not you, change your password and tell us.`), template: 'payout email added' }).catch(() => null)
  }
  return send(embedMessage(embedCard({ title: '💸 PayPal added', text: `Payouts will go to **${maskEmail(p.email)}**. We cover PayPal's own fees.`, notice: await launchNote() }), [pbtn('Check balance', 'pay:balance', 'blurple', '💰'), pbtn('Manage payment methods', 'pay:manage', 'grey', '📋')]))
}

async function managePayments(a: Account): Promise<Message> {
  const cur = await paypalEmails(a.id)
  if (!cur.emails.length) return embedMessage(embedCard({ title: '💳 Your payment methods', text: 'No PayPal email yet. Add the one you want to be paid at.', bar: false }), [pbtn('Add PayPal', 'pay:link', 'green', '💸')])
  const m = embedMessage(embedCard({ title: '💳 Your payment methods', text: cur.emails.map((e) => `${e === cur.email ? '⭐' : '▫️'} **PayPal** · ${maskEmail(e)}${e === cur.email ? ' · default' : ''}`).join('\n'), bar: false }), [pbtn('Add another', 'pay:link', 'green', '💸'), pbtn('Check balance', 'pay:balance', 'blurple', '💰')])
  return { ...m, components: [...(m.components ?? []), { type: 1, components: cur.emails.slice(0, 5).map((e, n) => pbtn(`Remove ${maskEmail(e).slice(0, 12)}`, `pay:rm:${n}:${short(e)}`, 'red', '🗑️')) }] }
}

// ---------- the doors: commands, buttons and forms ----------
const need = async (i: Interaction): Promise<Account | Reply> => (await accountOf(whoami(i).id)) ?? send(await joinPrompt())
const isReply = (x: Account | Reply): x is Reply => 'type' in x

/** Slash commands: /join, /verify, /paypal, /accounts, /payments. */
export async function setupCommand(i: Interaction, name: string): Promise<Reply | null> {
  if (name === 'join') return startJoin(i, await accountOf(whoami(i).id))
  if (name === 'verify' || name === 'accounts' || name === 'paypal' || name === 'payments') {
    const a = await need(i)
    if (isReply(a)) return a
    if (name === 'verify') return send(embedMessage(embedCard({ title: '🔗 Link an account', text: 'Pick where you post. We look the account up, give you a short code, and you put it in your bio to prove it is yours.', notice: await launchNote(), bar: false }), platformButtons()))
    if (name === 'accounts') return send(await manageAccounts(a))
    if (name === 'paypal') return startPaypal(a)
    return send(await managePayments(a))
  }
  return null
}

/** Buttons. Returns null when the button is not one of these. */
export async function setupComponent(i: Interaction, id: string, env: Env): Promise<Reply | null> {
  if (id === 'acct:join') return startJoin(i, await accountOf(whoami(i).id))
  if (id === 'join:code') return modal('modal:joincode', 'Enter your code', [{ id: 'code', label: 'The 6 digit code from your email', placeholder: '123456', min: 6, max: 6 }])
  if (!/^(acct|pay):/.test(id)) return null
  const a = await need(i)
  if (isReply(a)) return a
  if (id === 'acct:link') return send(embedMessage(embedCard({ title: '🔗 Link an account', text: 'Pick where you post. We look the account up, give you a short code, and you put it in your bio to prove it is yours.', notice: await launchNote(), bar: false }), platformButtons()))
  if (id === 'acct:manage') return send(await manageAccounts(a))
  if (id.startsWith('acct:add:')) {
    const p = id.split(':')[2]
    return isPlatform(p) ? modal(`modal:acct:${p}`, `Link your ${labelOf(p)}`, [{ id: 'handle', label: `Your ${labelOf(p)} username`, placeholder: '@yourname', min: 2, max: 100 }]) : send(problem('That button is out of date.'))
  }
  if (id.startsWith('acct:check:')) {
    const p = id.split(':')[2]
    return isPlatform(p) ? env.defer(() => checkAccount(a, p)) : send(problem('That button is out of date.'))
  }
  if (id.startsWith('acct:ask:')) {
    const p = id.split(':')[2]
    if (!isPlatform(p)) return send(problem('That button is out of date.'))
    const r = await askTeam(a.id, a.email, p)
    return send(r.ok ? embedMessage(embedCard({ title: '🧑‍💻 The team will look', text: 'Someone on the team will check your bio by hand and you will get a message when it is done.', bar: false })) : problem(r.error))
  }
  if (id.startsWith('acct:rm:')) {
    const p = id.split(':')[2]
    if (!isPlatform(p)) return send(problem('That button is out of date.'))
    await saveProfile(await userRow(a.id), { links: (await linksOf(a.id)).filter((l) => l.platform !== p) })
    return send(embedMessage(embedCard({ title: '🗑️ Removed', text: `${labelOf(p)} is no longer linked. You can link it again any time.`, bar: false }), [pbtn('Manage accounts', 'acct:manage', 'grey', '📋')]))
  }
  if (id === 'pay:link') return startPaypal(a)
  if (id === 'pay:code') return modal('modal:paycode', 'Enter your code', [{ id: 'code', label: 'The 6 digit code from your email', placeholder: '123456', min: 6, max: 6 }])
  if (id === 'pay:manage') return send(await managePayments(a))
  if (id.startsWith('pay:rm:')) {
    const [, , n, tag] = id.split(':')
    const cur = await paypalEmails(a.id)
    const e = cur.emails[Number(n)]
    if (!e || short(e) !== tag) return send(problem('That list changed. Open it again.', [pbtn('Manage payment methods', 'pay:manage', 'grey', '📋')]))
    await removePaypalEmail(a.id, e)
    return send(embedMessage(embedCard({ title: '🗑️ Removed', text: `${maskEmail(e)} is no longer on your list.`, bar: false }), [pbtn('Manage payment methods', 'pay:manage', 'grey', '📋')]))
  }
  return null
}

/** Forms. Returns null when the form is not one of these. */
export async function setupModal(i: Interaction, id: string, value: (name: string) => string, env: Env): Promise<Reply | null> {
  if (id === 'modal:join') return sendJoinCode(i, value('email'))
  if (id === 'modal:joincode') return finishJoin(i, value('code'))
  if (!/^modal:(acct|paypal|paycode)/.test(id)) return null
  const a = await need(i)
  if (isReply(a)) return a
  if (id.startsWith('modal:acct:')) {
    const p = id.split(':')[2]
    return isPlatform(p) ? env.defer(() => addAccount(a, p, value('handle'))) : send(problem('That form is out of date.'))
  }
  if (id === 'modal:paypal') return sendPaypalCode(a, value('email'), value('again'))
  if (id === 'modal:paycode') return finishPaypal(a, value('code'))
  return null
}

