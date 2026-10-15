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

/** Everything to run the Discord bot: what is missing, the address to give Discord, where it posts and which roles it hands out. */
export function DiscordPanel() {
  const [s, setS] = useState<Status | null>(null)
  const [cfg, setCfg] = useState<DiscordConfig | null>(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [panelChannel, setPanelChannel] = useState('')
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
  const ch = (k: keyof DiscordConfig['channels'], label: string, hint: string) => (
    <label key={k} className="grid gap-1.5">
      <span className="text-xs text-mute">{label}</span>
      <input className={input} inputMode="numeric" value={cfg.channels[k]} onChange={(e) => set({ channels: { ...cfg.channels, [k]: e.target.value.replace(/\D/g, '') } })} placeholder="Channel ID" />
      <span className="text-[11px] text-mute/70">{hint}</span>
    </label>
  )
  const role = (k: 'linked' | 'clipper' | 'brand' | 'team', label: string) => (
    <label key={k} className="grid gap-1.5">
      <span className="text-xs text-mute">{label}</span>
      <input className={input} inputMode="numeric" value={cfg.roles[k]} onChange={(e) => set({ roles: { ...cfg.roles, [k]: e.target.value.replace(/\D/g, '') } })} placeholder="Role ID" />
    </label>
  )

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
          <li><span className="text-paper">4.</span> Turn on Developer Mode in Discord (Settings, Advanced) so you can right-click a server, channel or role and copy its ID. Fill them in below and save.</li>
          <li><span className="text-paper">5.</span> Press <b>Register commands</b>. Then drag the bot&apos;s role above the roles it hands out, so it is allowed to give them.</li>
        </ol>
      </Card>

      <Card title="Server, channels and roles" sub="IDs only. Leave a box empty to turn that part off.">
        <div className="grid gap-5">
          <label className="grid gap-1.5">
            <span className="text-xs text-mute">Server ID</span>
            <input className={`${input} max-w-sm`} inputMode="numeric" value={cfg.guildId} onChange={(e) => set({ guildId: e.target.value.replace(/\D/g, '') })} placeholder="Server ID" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            {ch('announce', 'Announcements', 'New campaigns and /admin announce go here.')}
            {ch('clips', 'Clips and shout-outs', 'Big earnings are celebrated here, and /admin queue posts clips to review.')}
            {ch('leaderboard', 'Leaderboard', 'Reserved for leaderboard posts.')}
            {ch('logs', 'Team log', 'Messages, reports and admin actions.')}
            {ch('support', 'Support', 'Where the support panel lives.')}
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {role('linked', 'Linked members')}
            {role('clipper', 'Clippers')}
            {role('brand', 'Brands')}
            {role('team', 'Team')}
          </div>
          <div>
            <p className="mb-2 text-xs text-mute">Earnings roles: a member gets the highest one they have reached.</p>
            <ul className="grid gap-2">
              {cfg.roles.tiers.map((t, n) => (
                <li key={n} className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-mute">From $</span>
                  <input aria-label="Earned dollars" className={`${input} w-28`} inputMode="numeric" value={t.minUsd} onChange={(e) => set({ roles: { ...cfg.roles, tiers: cfg.roles.tiers.map((x, k) => (k === n ? { ...x, minUsd: Number(e.target.value.replace(/\D/g, '')) || 0 } : x)) } })} />
                  <input aria-label="Role ID" className={`${input} max-w-[16rem]`} inputMode="numeric" value={t.role} onChange={(e) => set({ roles: { ...cfg.roles, tiers: cfg.roles.tiers.map((x, k) => (k === n ? { ...x, role: e.target.value.replace(/\D/g, '') } : x)) } })} placeholder="Role ID" />
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
          <div>
            <button type="button" disabled={busy === 'save'} className={`${btn} bg-paper font-medium text-ink hover:bg-paper/85`} onClick={() => run('save', async () => (await call({ action: 'save', config: cfg }), 'Saved.'))}>
              {busy === 'save' && <Loader2 className="size-4 animate-spin" />} Save
            </button>
          </div>
        </div>
      </Card>

      <Card title="Make it work" sub={`${s.commands} commands: link, profile, stats, balance, clips, badges, campaigns, submit, leaderboard, earn, faq, support, report and more.`}>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={Boolean(busy)} className={`${btn} bg-paper font-medium text-ink hover:bg-paper/85`} onClick={() => run('register', async () => { const j = (await call({ action: 'register' })) as { count?: number; where?: string }; return `Registered ${j.count} commands in ${j.where}.` })}>
            {busy === 'register' && <Loader2 className="size-4 animate-spin" />} Register commands
          </button>
          <button type="button" disabled={Boolean(busy)} className={`${btn} border border-line-strong hover:bg-paper/10`} onClick={() => run('test', async () => (await call({ action: 'test' }), 'Posted a test message in the announcements channel.'))}>
            {busy === 'test' && <Loader2 className="size-4 animate-spin" />} Send a test message
          </button>
          <button type="button" disabled={Boolean(busy)} className={`${btn} border border-line-strong hover:bg-paper/10`} onClick={() => run('sync', async () => { const j = (await call({ action: 'sync' })) as { checked?: number; changed?: number }; return `Checked ${j.checked} members, ${j.changed} had roles changed.` })}>
            {busy === 'sync' && <Loader2 className="size-4 animate-spin" />} Refresh everyone&apos;s roles
          </button>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <input aria-label="Channel ID for the panel" className={`${input} max-w-[16rem]`} inputMode="numeric" value={panelChannel} onChange={(e) => setPanelChannel(e.target.value.replace(/\D/g, ''))} placeholder="Channel ID" />
          <button type="button" disabled={Boolean(busy) || panelChannel.length < 15} className={`${btn} border border-line-strong hover:bg-paper/10`} onClick={() => run('panel', async () => (await call({ action: 'panel', channel: panelChannel }), 'Posted the link panel there.'))}>
            {busy === 'panel' && <Loader2 className="size-4 animate-spin" />} Post the link panel
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
