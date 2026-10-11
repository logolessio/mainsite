import { z } from 'zod'
import { verifyAudit, verifyContent } from '@/lib/chain'
import { captchaConfigured } from '@/lib/human'
import { db, setting } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { stripe } from '@/lib/stripe'
import { requireAdmin } from '@/lib/user'
import { stripeBalance } from '@/lib/admin-stats'

const schema = z.object({ check: z.enum(['stripe', 'webhook', 'database', 'ledger', 'chains', 'captcha', 'auth', 'connect', 'email']) })

type Result = { ok: boolean; title: string; lines: string[] }

/** Tests that change nothing: they only read, so they are safe to run at any time. Key values are never returned. */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-diag', max: 30, windowSec: 300, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 1024))
  if (!parsed.success) throw new HttpError(400, 'Unknown test.')
  const d = await db()
  const out: Result = { ok: true, title: '', lines: [] }

  switch (parsed.data.check) {
    case 'stripe': {
      out.title = 'Stripe connection'
      const b = await stripeBalance()
      if ('error' in b) return json({ ...out, ok: false, lines: [`Stripe refused: ${b.error}`] })
      out.lines = [`Connected in ${b.live ? 'LIVE' : 'TEST'} mode.`, `Available: $${(b.available / 100).toFixed(2)}`, `Pending: $${(b.pending / 100).toFixed(2)}`]
      break
    }
    case 'connect': {
      out.title = 'Stripe Connect (clipper payouts)'
      try {
        const s = await stripe()
        const list = await s.accounts.list({ limit: 3 })
        out.lines = [`Connect is enabled. ${list.data.length} connected account${list.data.length === 1 ? '' : 's'} found (showing up to 3).`]
      } catch (e) {
        return json({ ...out, ok: false, lines: [e instanceof Error ? e.message.slice(0, 200) : 'Connect is not enabled on this Stripe account.'] })
      }
      break
    }
    case 'webhook': {
      out.title = 'Stripe webhook'
      const has = Boolean(await setting('STRIPE_WEBHOOK_SECRET'))
      const last = await d.prepare('SELECT type, received_at FROM stripe_events ORDER BY received_at DESC LIMIT 1').first<{ type: string; received_at: number }>()
      const total = await d.prepare('SELECT COUNT(*) AS n FROM stripe_events').first<{ n: number }>()
      out.ok = has && Boolean(last)
      out.lines = [
        has ? 'Signing secret is set.' : 'Signing secret is NOT set: Stripe events will be rejected.',
        last ? `Last event: ${last.type}, ${new Date(last.received_at * 1000).toLocaleString('en-US')}. ${total?.n ?? 0} received in total.` : 'No event has arrived yet. In Stripe, send a test event to /api/stripe/webhook to prove it works.',
      ]
      break
    }
    case 'database': {
      out.title = 'Database'
      const t0 = Date.now()
      const c = await d
        .prepare('SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM ledger) AS ledger, (SELECT COUNT(*) FROM campaigns) AS campaigns, (SELECT COUNT(*) FROM audit_log) AS audit')
        .first<Record<string, number>>()
      out.lines = [`Reachable. Answered in ${Date.now() - t0} ms.`, `${c?.users} users, ${c?.campaigns} campaigns, ${c?.ledger} ledger rows, ${c?.audit} audit entries.`]
      break
    }
    case 'ledger': {
      out.title = 'Money check'
      const r = await d
        .prepare(
          `SELECT
             (SELECT COUNT(*) FROM (SELECT campaign_id FROM ledger WHERE account = 'campaign' GROUP BY campaign_id HAVING SUM(amount_cents) < 0)) AS negPools,
             (SELECT COUNT(*) FROM (SELECT user_id FROM ledger WHERE account = 'clipper' GROUP BY user_id HAVING SUM(amount_cents) < 0)) AS negClippers,
             (SELECT COUNT(*) FROM (SELECT user_id FROM ledger WHERE account = 'brand' GROUP BY user_id HAVING SUM(amount_cents) < 0)) AS negBrands,
             (SELECT COALESCE(SUM(net_cents),0) FROM earnings) AS earnedNet,
             (SELECT COALESCE(SUM(amount_cents),0) FROM ledger WHERE account = 'clipper' AND kind = 'earning') AS ledgerEarned,
             (SELECT COALESCE(SUM(fee_cents + net_cents),0) FROM earnings) AS gross,
             (SELECT COALESCE(-SUM(amount_cents),0) FROM ledger WHERE account = 'campaign' AND kind = 'spend') AS spent,
             (SELECT COUNT(*) FROM payouts p WHERE p.status = 'sent' AND p.stripe_transfer_id IS NULL) AS sentNoTransfer`,
        )
        .first<Record<string, number>>()
      const bad: string[] = []
      if (r!.negPools) bad.push(`${r!.negPools} campaign pool(s) below zero`)
      if (r!.negClippers) bad.push(`${r!.negClippers} clipper balance(s) below zero`)
      if (r!.negBrands) bad.push(`${r!.negBrands} brand balance(s) below zero`)
      if (r!.earnedNet !== r!.ledgerEarned) bad.push(`earnings table (${r!.earnedNet}) and ledger (${r!.ledgerEarned}) disagree`)
      if (r!.gross !== r!.spent) bad.push(`campaign spend (${r!.spent}) does not equal fee + net paid (${r!.gross})`)
      if (r!.sentNoTransfer) bad.push(`${r!.sentNoTransfer} payout(s) marked sent without a Stripe transfer`)
      out.ok = bad.length === 0
      out.lines = bad.length ? bad : ['Every pool and balance is at or above zero.', 'Earnings, fees and campaign spending add up exactly.', 'Every sent payout has a Stripe transfer id.']
      break
    }
    case 'chains': {
      out.title = 'Tamper check on the logs'
      const [a, v] = await Promise.all([verifyAudit(), verifyContent()])
      out.ok = a.ok && v.ok
      out.lines = [a.ok ? `Admin action log intact (${a.rows} entries).` : `ADMIN LOG BROKEN at entry #${a.brokenAt}.`, v.ok ? `Text change log intact (${v.rows} entries).` : `TEXT LOG BROKEN at entry #${v.brokenAt}.`]
      break
    }
    case 'captcha': {
      out.title = 'Human check (Turnstile)'
      const secret = await setting('TURNSTILE_SECRET_KEY')
      if (!secret || !(await captchaConfigured())) return json({ ...out, ok: false, lines: ['Not set up. Add TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY, then run this again.'] })
      // A fake answer: a valid secret replies "invalid-input-response", a wrong secret replies "invalid-input-secret".
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret, response: 'logoless-test' }) })
      const j = (await res.json().catch(() => ({}))) as { 'error-codes'?: string[] }
      const codes = j['error-codes'] ?? []
      out.ok = !codes.includes('invalid-input-secret')
      out.lines = [out.ok ? 'The secret key is accepted by Cloudflare.' : 'Cloudflare says the secret key is wrong.', 'Both keys are set. Sign-in asks for the check.']
      break
    }
    case 'email': {
      out.title = 'Email (Resend)'
      const key = await setting('RESEND_API_KEY')
      if (!key) return json({ ...out, ok: false, lines: ['RESEND_API_KEY is not set, so email sign-up and password reset are switched off.'] })
      const from = (await setting('RESEND_FROM')) ?? 'logoless <login@verify.logoless.io>'
      const domain = (/@([^>\s]+)/.exec(from)?.[1] ?? '').toLowerCase()
      const res = await fetch('https://api.resend.com/domains', { headers: { authorization: `Bearer ${key}` } })
      if (res.status === 401 || res.status === 403) return json({ ...out, ok: false, lines: ['Resend refused the key. Create a new one in Resend > API Keys, with permission to send.'] })
      if (!res.ok) return json({ ...out, ok: false, lines: [`Resend answered ${res.status}.`] })
      const list = ((await res.json().catch(() => ({}))) as { data?: { name: string; status: string }[] }).data ?? []
      const d = list.find((x) => x.name.toLowerCase() === domain)
      out.ok = d?.status === 'verified'
      out.lines = [
        'The key works.',
        d ? `${d.name} is ${d.status}.${d.status === 'verified' ? '' : ' Add the DNS records Resend shows, then press Verify in Resend.'}` : `${domain} is not in this Resend account. Add it under Domains.`,
        `Emails are sent from: ${from}`,
      ]
      break
    }
    case 'auth': {
      out.title = 'Sign-in'
      const secret = (await setting('AUTH_SECRET')) ?? ''
      const bad: string[] = []
      if (secret.length < 32) bad.push('AUTH_SECRET should be 32 or more characters.')
      if (!(await setting('AUTH_GOOGLE_ID')) || !(await setting('AUTH_GOOGLE_SECRET'))) bad.push('Google sign-in keys are missing.')
      if (!((await setting('ADMIN_EMAILS')) ?? '').trim()) bad.push('ADMIN_EMAILS is empty.')
      out.ok = bad.length === 0
      out.lines = bad.length ? bad : ['Sign-in secret is long enough.', 'Google sign-in is configured.', 'Admin emails are set.']
      break
    }
  }
  return json(out)
})
