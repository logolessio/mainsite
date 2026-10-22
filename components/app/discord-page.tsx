'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, ExternalLink, EyeOff, Loader2, Lock, RefreshCw, Unlink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Icon } from '@/components/icons'
import { useFeature } from '@/components/shell/features-provider'
import { KindMatrix, SaveNote, Switch, useNotifyPrefs } from '@/components/shell/notify/notify-settings'
import type { DiscordOverview } from '@/lib/discord/overview'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { ActionButton, Card, PanelSkeleton } from './ui'

async function act(data: object) {
  const res = await fetch('/api/me/discord', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
  const j = (await res.json().catch(() => ({}))) as { error?: string; note?: string; ok?: boolean; added?: string[]; removed?: string[] }
  if (!res.ok) throw new Error(j.error ?? 'Something went wrong.')
  return j
}

const RETURN: Record<string, string> = {
  joined: 'Linked. You are in the server now.',
  linked: 'Linked.',
  taken: 'That Discord account is already linked to a different logoless account.',
  cancelled: 'You did not approve it on Discord, so nothing was linked.',
  setup: 'Linking is not switched on yet. Try again soon.',
  error: 'That did not work. Please try again.',
}
const CONNECT = '/api/discord/connect?back=/dashboard/discord'

/** The Discord page in the creator dashboard: link, roles, the server, messages, unlink. */
export function DiscordPage() {
  const router = useRouter()
  const center = useFeature('notification-center')
  const [o, setO] = useState<DiscordOverview | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [sure, setSure] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(() => {
    fetch('/api/me/discord/overview', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: DiscordOverview) => setO(j))
      .catch(() => setFailed(true))
  }, [])
  useEffect(load, [load])
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('discord')
    if (r && RETURN[r]) setMsg(RETURN[r])
  }, [])

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    setMsg('')
    try {
      await fn()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Something went wrong.')
    }
    setBusy('')
  }
  const hide = () =>
    run('hide', async () => {
      const res = await fetch('/api/me/sidebar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ page: 'discord', shown: false }) })
      if (!res.ok) throw new Error('Could not change your sidebar.')
      router.push('/dashboard/settings#sidebar')
      router.refresh()
    })

  if (failed) return <p className="text-mute">Could not load your Discord details. Refresh to try again.</p>
  if (!o) return <PanelSkeleton heights={[220, 260, 180]} />

  const removeBtn = (
    <button type="button" onClick={hide} disabled={Boolean(busy)} className="inline-flex h-9 items-center gap-2 rounded-pill border border-line px-4 text-[13px] text-paper/55 transition-colors hover:text-paper disabled:opacity-40">
      {busy === 'hide' ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> : <EyeOff aria-hidden="true" className="size-3.5" />} Remove from sidebar
    </button>
  )

  return (
    <div className="grid max-w-3xl gap-6">
      <AnimatePresence>
        {msg && (
          <motion.p key={msg} role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE_OUT }} className="rounded-2xl border border-line bg-white/[0.03] px-5 py-3.5 text-sm text-paper/75">
            {msg}
          </motion.p>
        )}
      </AnimatePresence>

      {!o.linked ? (
        <section className="relative overflow-hidden rounded-card border border-line bg-black/45 p-7 md:p-10">
                    <span className="relative grid size-14 place-items-center rounded-2xl border border-white/15 bg-white/[0.06] text-paper">
            <Icon name="Discord" aria-hidden="true" className="size-7" />
          </span>
          <h2 className="relative mt-6 font-display text-3xl leading-[1.05] tracking-[-0.03em] md:text-4xl">Link your Discord</h2>
          <ul className="relative mt-5 grid gap-2.5 text-[15px] text-paper/65">
            {['Get your roles in the logoless server, and earn more as you go.', 'Get your notifications as Discord messages, if you want them.', 'Use the bot to check your numbers and send content.'].map((t) => (
              <li key={t} className="flex gap-3">
                <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-paper/45" /> {t}
              </li>
            ))}
          </ul>
          <div className="relative mt-8 flex flex-wrap gap-2">
            <a href={CONNECT} className="inline-flex h-11 items-center gap-2 rounded-pill bg-paper px-6 text-[15px] font-medium text-ink transition-colors hover:bg-paper/90">
              <Icon name="Discord" aria-hidden="true" className="size-4" /> Link Discord
            </a>
            <a href={o.invite} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-pill bg-white/[0.06] px-5 text-[15px] transition-colors hover:bg-white/[0.11]">
              Join the server <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          </div>
          <p className="relative mt-4 text-[13px] text-paper/40">You approve it on Discord&apos;s own page. We never see your Discord password.</p>
        </section>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-pill border border-white/15 bg-white/[0.06] text-paper">
              {o.account?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.account.avatar} alt="" className="size-full object-cover" />
              ) : (
                <Icon name="Discord" aria-hidden="true" className="size-6" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-lg">{o.account?.name ?? 'Discord linked'}</span>
              <span className="flex flex-wrap items-center gap-2 text-sm text-paper/50">
                {o.account && <span>@{o.account.username}</span>}
                <span className={cn('inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-[12px]', o.inServer ? 'bg-white/[0.1] text-paper' : 'bg-white/[0.06] text-paper/55')}>
                  <span aria-hidden="true" className={cn('size-1.5 rounded-pill', o.inServer ? 'bg-paper' : 'bg-paper/40')} />
                  {o.inServer ? 'In the server' : o.inServer === false ? 'Not in the server yet' : 'Linked'}
                </span>
              </span>
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {o.inServer === false && (
              <a href={CONNECT} className="inline-flex h-10 items-center gap-2 rounded-pill bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/90">
                Join the server
              </a>
            )}
            <ActionButton
              variant="ghost"
              disabled={Boolean(busy) || !o.serverConfigured}
              onClick={() =>
                run('sync', async () => {
                  const j = await act({ action: 'sync' })
                  setMsg(j.note ?? (j.added?.length || j.removed?.length ? `Roles updated: ${j.added?.length ?? 0} added, ${j.removed?.length ?? 0} removed.` : 'Your roles are up to date.'))
                  load()
                })
              }
            >
              {busy === 'sync' ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="size-4" />} Refresh my roles
            </ActionButton>
            <ActionButton
              variant={sure ? 'danger' : 'ghost'}
              disabled={Boolean(busy)}
              onBlur={() => setSure(false)}
              onClick={() =>
                sure
                  ? run('unlink', async () => {
                      await act({ action: 'unlink' })
                      setSure(false)
                      setMsg('Unlinked. You can link again any time.')
                      load()
                    })
                  : setSure(true)
              }
            >
              {busy === 'unlink' ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Unlink aria-hidden="true" className="size-4" />} {sure ? 'Press again to unlink' : 'Unlink'}
            </ActionButton>
          </div>
        </Card>
      )}

      {o.linked && (
        <Card title="Your roles" sub="Roles in the logoless server come from what you do here. They update by themselves; refresh if one is missing.">
          {o.roles.length === 0 ? (
            <p className="text-sm text-paper/50">{o.serverConfigured ? 'No roles are set up yet.' : 'The server is not set up yet.'}</p>
          ) : (
            <ul className="divide-y divide-line">
              {o.roles.map((r) => (
                <li key={r.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                  <span aria-hidden="true" className="size-3 shrink-0 rounded-pill" style={{ background: 'var(--paper)', opacity: r.have ? 0.9 : 0.25 }} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-[15px]', !r.have && 'text-paper/55')}>{r.name}</span>
                    <span className="block text-[13px] text-paper/40">{r.how}</span>
                  </span>
                  {r.have ? (
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-emerald-300">
                      <Check aria-hidden="true" className="size-4" /> You have it
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-paper/40">
                      <Lock aria-hidden="true" className="size-3.5" /> Not yet
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {o.linked && <Messages o={o} setO={setO} center={center} run={run} />}

      <Card title="The server" sub="News, new campaigns, help from the team and other creators.">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-11 min-w-0 flex-1 items-center truncate rounded-pill border border-line bg-white/[0.03] px-4 font-mono text-[13px] text-paper/65">{o.invite.replace(/^https?:\/\//, '')}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(o.invite).then(() => {
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1600)
              })
            }}
            aria-label="Copy the invite link"
            className="grid size-11 place-items-center rounded-pill border border-line text-paper/60 transition-colors hover:text-paper"
          >
            {copied ? <Check aria-hidden="true" className="size-4 text-emerald-300" /> : <Copy aria-hidden="true" className="size-4" />}
          </button>
          <a href={o.invite} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-pill bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85">
            Open <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <p className="text-[13px] text-paper/45">Do not use Discord? Take this page out of your sidebar. You can put it back in Settings.</p>
        {removeBtn}
      </div>
    </div>
  )
}

/** Which notifications come as Discord messages: one main switch and, with the notification centre, one per kind. */
function Messages({ o, setO, center, run }: { o: DiscordOverview; setO: (o: DiscordOverview) => void; center: boolean; run: (key: string, fn: () => Promise<void>) => Promise<void> }) {
  const prefs = useNotifyPrefs(center)
  const [dm, setDm] = useState(o.dm)
  const flip = (on: boolean) =>
    run('dm', async () => {
      setDm(on)
      await act({ action: 'dm', on })
      setO({ ...o, dm: on })
    })
  return (
    <Card title="Messages on Discord" sub={o.botReady ? 'The logoless bot sends you a direct message when something happens.' : 'The logoless bot is not set up yet, so no messages are sent for now.'} action={<Switch checked={dm} onChange={flip} label="Discord messages" />}>
      {center && prefs.data ? (
        <div className={cn('transition-opacity', !dm && 'pointer-events-none opacity-40')}>
          <div className="-mt-1 mb-2 flex justify-end">
            <SaveNote state={prefs.save} />
          </div>
          <KindMatrix data={{ ...prefs.data, channels: { ...prefs.data.channels, discord: { ...prefs.data.channels.discord, dm: true, linked: true } } }} change={prefs.change} only="discord" />
        </div>
      ) : (
        <p className="text-sm text-paper/50">{dm ? 'On: submission decisions, earnings, payouts and account news.' : 'Off.'}</p>
      )}
    </Card>
  )
}
