'use client'

import { CheckCircle2, Copy, ExternalLink, Loader2, Plus, X, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { DiscordConfig } from '@/lib/discord/config'
import { Card } from '@/components/app/ui'

type Status = {
  has: { token: boolean; appId: boolean; key: boolean }
  ready: boolean
  bot: string | null
  cfg: DiscordConfig
  linked: number
  commands: number
  endpoint: string
  invite: string | null
}

const input = 'h-10 w-full rounded-xl border border-line-strong bg-ink/80 px-3 font-mono text-xs outline-none focus:border-paper'
const btn = 'inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm transition-colors disabled:opacity-40'
const ghost = `${btn} border border-line-strong hover:bg-paper/10`
const solid = `${btn} bg-paper font-medium text-ink hover:bg-paper/85`

async function call(data: object) {
  const res = await fetch('/api/admin/discord', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
  const j = (await res.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>
  if (!res.ok) throw new Error(j.error ?? 'That did not work.')
  return j
}

const Tick = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
  <li className="flex items-center gap-2 py-1.5 text-sm">
    {ok ? <CheckCircle2 className="size-4 text-emerald-300" /> : <XCircle className="size-4 text-mute" />}
    <span className={ok ? '' : 'text-mute'}>{children}</span>
  </li>
)

type ChannelKey = keyof DiscordConfig['channels']
const CHANNELS: { key: ChannelKey; label: string; hint: string; post?: 'getStarted' | 'rules' | 'site' | 'support' | 'status' }[] = [
  { key: 'getStarted', label: '#get-started', hint: 'The walkthrough new members see first.', post: 'getStarted' },
  { key: 'rules', label: '#rules', hint: 'The rules, with buttons to the important pages and channels.', post: 'rules' },
  { key: 'site', label: '#site', hint: 'The site card.', post: 'site' },
  { key: 'support', label: '#support', hint: 'The Open a ticket panel.', post: 'support' },
  { key: 'status', label: '#status', hint: 'A live status card that keeps itself up to date.', post: 'status' },
  { key: 'newCampaigns', label: '#new-campaigns', hint: 'Every campaign that goes live is announced here, with a Join campaign button.' },
  { key: 'news', label: '#news', hint: 'Announcements you send from Broadcast.' },
  { key: 'system', label: '#system', hint: 'A welcome card for every new member, the moment they finish making their account.' },
  { key: 'updates', label: '#updates', hint: 'Product updates, including features you push live.' },
  { key: 'clips', label: 'Proof', hint: 'Big earnings are celebrated here, as proof that people get paid. Clips are never reviewed in Discord: that is done on the dashboard.' },
  { key: 'logs', label: 'Team log', hint: 'Tickets, reports and admin actions.' },
]

/** Everything to run the Discord bot: what is missing, the address to give Discord, where each thing is posted and which roles it hands out. */
export function DiscordPanel() {
  const [s, setS] = useState<Status | null>(null)
  const [cfg, setCfg] = useState<DiscordConfig | null>(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/discord', { cache: 'no-store' })
    if (!res.ok) return
    const j = (await res.json()) as Status
    setS(j)
    setCfg(j.cfg)
  }, [])
  useEffect(() => void load(), [load])

  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key)
    setMsg(null)
    try {
      setMsg({ ok: true, text: await fn() })
      await load()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'That did not work.' })
    }
    setBusy('')
  }

  if (!s || !cfg) return <p className="text-sm text-mute">Loading…</p>
  const set = (patch: Partial<DiscordConfig>) => setCfg({ ...cfg, ...patch })
  const digits = (v: string) => v.replace(/\D/g, '')

  return (
    <div className="grid max-w-4xl gap-6">
      <Card title="Is it set up?">
        <ul className="divide-y divide-line">
          <Tick ok={s.has.appId}>DISCORD_APP_ID is set in Cloudflare</Tick>
          <Tick ok={s.has.key}>DISCORD_PUBLIC_KEY is set in Cloudflare</Tick>
          <Tick ok={s.has.token}>DISCORD_BOT_TOKEN is set in Cloudflare{s.bot ? ` (the bot is ${s.bot})` : ''}</Tick>
          <Tick ok={Boolean(cfg.guildId)}>Your server ID is saved below</Tick>
          <Tick ok={s.linked > 0}>{s.linked} {s.linked === 1 ? 'member has' : 'members have'} linked Discord</Tick>
        </ul>
        <ol className="mt-5 grid gap-2 text-sm text-mute">
          <li><span className="text-paper">1.</span> In the Discord developer portal, create an application and a bot. Copy the <b>Application ID</b>, the <b>Public Key</b> and the bot <b>Token</b> into Cloudflare as DISCORD_APP_ID, DISCORD_PUBLIC_KEY and DISCORD_BOT_TOKEN.</li>
          <li>
            <span className="text-paper">2.</span> Set the <b>Interactions Endpoint URL</b> to:
            <span className="mt-1.5 flex items-center gap-2">
              <code className="rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs text-paper">{s.endpoint}</code>
              <button type="button" aria-label="Copy" className="grid size-8 place-items-center rounded-full border border-line-strong hover:bg-paper/10" onClick={() => navigator.clipboard.writeText(s.endpoint).then(() => (setCopied(true), setTimeout(() => setCopied(false), 1500)))}>
                {copied ? <CheckCircle2 className="size-4 text-emerald-300" /> : <Copy className="size-4" />}
              </button>
            </span>
          </li>
          <li>
            <span className="text-paper">3.</span> Add the bot to your server:{' '}
            {s.invite ? (
              <a href={s.invite} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-paper underline underline-offset-4">
                Invite link <ExternalLink className="size-3.5" />
              </a>
            ) : (
              'save your application ID in Cloudflare first.'
            )}
          </li>
          <li><span className="text-paper">4.</span> Turn on Developer Mode in Discord (Settings, Advanced), then right-click a server, channel, category or role and copy its ID into the boxes below. Save.</li>
          <li><span className="text-paper">5.</span> Press <b>Register commands</b>, then <b>Post it</b> next to each channel. Drag the bot&apos;s role above the roles it hands out.</li>
          <li><span className="text-paper">6.</span> Visibility: make <b>Welcome</b> the only category @everyone can see, and give the <b>Linked members</b> role access to the rest. People get that role the moment they link, which is how the other channels appear for them.</li>
        </ol>
      </Card>

      <Card title="Server and channels" sub="IDs only. Leave a box empty to turn that part off. “Post it” puts the message in that channel (it is posted again each time you press it).">
        <div className="grid gap-5">
          <label className="grid gap-1.5">
            <span className="text-xs text-mute">Server ID</span>
            <input className={`${input} max-w-sm`} inputMode="numeric" value={cfg.guildId} onChange={(e) => set({ guildId: digits(e.target.value) })} placeholder="Server ID" />
          </label>
          <ul className="grid gap-4">
            {CHANNELS.map((c) => (
              <li key={c.key} className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-3">
                <label className="grid gap-1.5">
                  <span className="text-xs text-mute">{c.label}</span>
                  <input className={input} inputMode="numeric" value={cfg.channels[c.key]} onChange={(e) => set({ channels: { ...cfg.channels, [c.key]: digits(e.target.value) } })} placeholder="Channel ID" />
                  <span className="text-[11px] text-mute/70">{c.hint}</span>
                </label>
                {c.post && (
                  <button type="button" disabled={Boolean(busy) || !cfg.channels[c.key]} className={ghost} onClick={() => run(`post-${c.post}`, async () => (await call({ action: 'post', what: c.post }), `Posted in ${c.label}. Save first if you just changed the ID.`))}>
                    {busy === `post-${c.post}` && <Loader2 className="size-4 animate-spin" />} Post it
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs text-mute">Artists category</span>
              <input className={input} inputMode="numeric" value={cfg.artistsCategory} onChange={(e) => set({ artistsCategory: digits(e.target.value) })} placeholder="Category ID" />
              <span className="text-[11px] text-mute/70">New artist channels are made here, and come back here when the artist has a live campaign.</span>
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs text-mute">Inactive category</span>
              <input className={input} inputMode="numeric" value={cfg.inactiveCategory} onChange={(e) => set({ inactiveCategory: digits(e.target.value) })} placeholder="Category ID" />
              <span className="text-[11px] text-mute/70">An artist with no live campaign has their channel moved here.</span>
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-xs text-mute">Tickets category</span>
            <input className={`${input} max-w-sm`} inputMode="numeric" value={cfg.ticketCategory} onChange={(e) => set({ ticketCategory: digits(e.target.value) })} placeholder="Category ID" />
            <span className="text-[11px] text-mute/70">Each ticket becomes a private channel under this category. The bot needs Manage Channels.</span>
          </label>
        </div>
      </Card>

      <Card title="Artist channels" sub="Campaigns for an artist are announced in that artist's channel. Anything without one goes to #news.">
        <ul className="grid gap-2">
          {cfg.artists.map((a, n) => (
            <li key={n} className="flex flex-wrap items-center gap-2">
              <input aria-label="Artist name" className={`${input} max-w-[14rem] font-sans`} value={a.name} onChange={(e) => set({ artists: cfg.artists.map((x, k) => (k === n ? { ...x, name: e.target.value } : x)) })} placeholder="Artist name" />
              <input aria-label="Channel ID" className={`${input} max-w-[16rem]`} inputMode="numeric" value={a.channel} onChange={(e) => set({ artists: cfg.artists.map((x, k) => (k === n ? { ...x, channel: digits(e.target.value) } : x)) })} placeholder="Channel ID" />
              <button type="button" aria-label="Remove" className="grid size-8 place-items-center rounded-full text-mute hover:bg-white/[0.07] hover:text-paper" onClick={() => set({ artists: cfg.artists.filter((_, k) => k !== n) })}>
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-4 text-xs hover:bg-paper/10" onClick={() => set({ artists: [...cfg.artists, { name: '', channel: '' }] })}>
          <Plus className="size-3.5" /> Add an artist
        </button>
      </Card>

      <Card title="Roles" sub="IDs only. The bot gives and takes these as people link and earn.">
        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {(['linked', 'clipper', 'brand', 'team', 'staff'] as const).map((k) => (
              <label key={k} className="grid gap-1.5">
                <span className="text-xs text-mute">{{ linked: 'Linked members', clipper: 'Clippers', brand: 'Brands', team: 'Team', staff: 'Staff (can see tickets)' }[k]}</span>
                <input className={input} inputMode="numeric" value={cfg.roles[k]} onChange={(e) => set({ roles: { ...cfg.roles, [k]: digits(e.target.value) } })} placeholder="Role ID" />
              </label>
            ))}
          </div>
          <div>
            <p className="mb-2 text-xs text-mute">Earnings roles: a member gets the highest one they have reached.</p>
            <ul className="grid gap-2">
              {cfg.roles.tiers.map((t, n) => (
                <li key={n} className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-mute">From $</span>
                  <input aria-label="Earned dollars" className={`${input} w-28`} inputMode="numeric" value={t.minUsd} onChange={(e) => set({ roles: { ...cfg.roles, tiers: cfg.roles.tiers.map((x, k) => (k === n ? { ...x, minUsd: Number(digits(e.target.value)) || 0 } : x)) } })} />
                  <input aria-label="Role ID" className={`${input} max-w-[16rem]`} inputMode="numeric" value={t.role} onChange={(e) => set({ roles: { ...cfg.roles, tiers: cfg.roles.tiers.map((x, k) => (k === n ? { ...x, role: digits(e.target.value) } : x)) } })} placeholder="Role ID" />
                  <button type="button" aria-label="Remove" className="grid size-8 place-items-center rounded-full text-mute hover:bg-white/[0.07] hover:text-paper" onClick={() => set({ roles: { ...cfg.roles, tiers: cfg.roles.tiers.filter((_, k) => k !== n) } })}>
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-4 text-xs hover:bg-paper/10" onClick={() => set({ roles: { ...cfg.roles, tiers: [...cfg.roles.tiers, { minUsd: 100, role: '' }] } })}>
              <Plus className="size-3.5" /> Add an earnings role
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-mute">
            <input type="checkbox" className="size-4 accent-white" checked={cfg.dm} onChange={(e) => set({ dm: e.target.checked })} /> Send linked members their notifications as direct messages
          </label>
        </div>
      </Card>

      <Card title="Make it work" sub={`${s.commands} commands: rules, site, status, support, link, profile, stats, balance, clips, badges, campaigns, submit, leaderboard, earn, faq, report and more.`}>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy === 'save'} className={solid} onClick={() => run('save', async () => (await call({ action: 'save', config: cfg }), 'Saved.'))}>
            {busy === 'save' && <Loader2 className="size-4 animate-spin" />} Save
          </button>
          <button type="button" disabled={Boolean(busy)} className={ghost} onClick={() => run('register', async () => { const j = (await call({ action: 'register' })) as { count?: number; where?: string }; return `Registered ${j.count} commands in ${j.where}.` })}>
            {busy === 'register' && <Loader2 className="size-4 animate-spin" />} Register commands
          </button>
          <button type="button" disabled={Boolean(busy)} className={ghost} onClick={() => run('test', async () => (await call({ action: 'test' }), 'Posted a test message.'))}>
            {busy === 'test' && <Loader2 className="size-4 animate-spin" />} Send a test message
          </button>
          <button type="button" disabled={Boolean(busy)} className={ghost} onClick={() => run('cards', async () => { const j = (await call({ action: 'cards' })) as { live?: number; done?: number }; return `Made or refreshed ${j.done} of ${j.live} live campaign cards.` })}>
            {busy === 'cards' && <Loader2 className="size-4 animate-spin" />} Make artist channels and cards
          </button>
          <button type="button" disabled={Boolean(busy)} className={ghost} onClick={() => run('artists', async () => { const j = (await call({ action: 'artists' })) as { artists?: number; checked?: number }; return `Checked ${j.artists} artists, ${j.checked} channels filed in the right category.` })}>
            {busy === 'artists' && <Loader2 className="size-4 animate-spin" />} Sort artist channels
          </button>
          <button type="button" disabled={Boolean(busy)} className={ghost} onClick={() => run('sync', async () => { const j = (await call({ action: 'sync' })) as { checked?: number; changed?: number }; return `Checked ${j.checked} members, ${j.changed} had roles changed.` })}>
            {busy === 'sync' && <Loader2 className="size-4 animate-spin" />} Refresh everyone&apos;s roles
          </button>
        </div>
        {msg && (
          <p role={msg.ok ? 'status' : 'alert'} className={`mt-4 text-sm ${msg.ok ? 'text-emerald-300' : 'text-signal'}`}>
            {msg.text}
          </p>
        )}
      </Card>
    </div>
  )
}
