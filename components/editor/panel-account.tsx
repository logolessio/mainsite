'use client'

import { Check, Copy, ExternalLink, Loader2, LogOut, Upload, X } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { handleChars, handleHint } from '@/lib/profile-style'
import { uploadImage } from '@/lib/image-client'
import { cn } from '@/lib/utils'
import type { EditorApi } from './types'
import { Area, Btn, Group, Input, Row, Switch } from './ui'

type Avail = null | 'checking' | { ok: boolean; message?: string }

export function ProfilePanel({ api }: { api: EditorApi }) {
  const { profile, setProfile, toast } = api
  const file = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [avail, setAvail] = useState<Avail>(null)
  const [original] = useState(profile.handle)
  useEffect(() => {
    const h = profile.handle
    if (!h || h === original) return setAvail(null)
    setAvail('checking')
    const ctl = new AbortController()
    const t = window.setTimeout(() => {
      fetch(`/api/me/handle?h=${encodeURIComponent(h)}`, { signal: ctl.signal, cache: 'no-store' })
        .then((r) => r.json())
        .then((j: { available?: boolean; message?: string }) => setAvail({ ok: j.available === true, message: j.message }))
        .catch(() => undefined)
    }, 320)
    return () => {
      ctl.abort()
      window.clearTimeout(t)
    }
  }, [profile.handle, original])
  const upload = async (f: File | undefined) => {
    if (!f) return
    setBusy(true)
    try {
      const id = await uploadImage('avatar', f)
      setProfile({ newAvatar: id, hasAvatar: true, avatar: `/api/img/${id}` })
    } catch (e) {
      toast(e instanceof Error ? e.message : 'That did not upload.')
    }
    setBusy(false)
  }
  const shown = profile.newAvatar ? `/api/img/${profile.newAvatar}` : profile.hasAvatar ? profile.avatar : null
  return (
    <div>
      <Group title="Picture">
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void upload(e.target.files?.[0])} />
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--ed-line2)] bg-white/[0.05] text-xl">
            {shown ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shown} alt="" className="size-full object-cover" />
            ) : (
              <span>{(profile.name || '?').slice(0, 1).toUpperCase()}</span>
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => file.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload
            </Btn>
            {shown && (
              <Btn variant="quiet" onClick={() => setProfile({ newAvatar: null, hasAvatar: false, avatar: null })}>
                Remove
              </Btn>
            )}
          </div>
        </div>
      </Group>
      <Group title="You">
        <Row label="Name">
          <Input value={profile.name} maxLength={40} onChange={(e) => setProfile({ name: e.target.value })} />
        </Row>
        <Row label="Bio" value={`${profile.bio.length}/400`}>
          <Area value={profile.bio} maxLength={400} placeholder="Who you are and what you make." onChange={(e) => setProfile({ bio: e.target.value })} />
        </Row>
      </Group>
      <Group title="Your address" hint={handleHint(true)}>
        <div className="flex items-center overflow-hidden rounded-xl border border-[var(--ed-line)] bg-black focus-within:border-white/50">
          <span className="pl-3.5 text-[0.88rem] text-white/40">logoless.io/</span>
          <input value={profile.handle} onChange={(e) => setProfile({ handle: handleChars(e.target.value, true) })} spellCheck={false} autoCapitalize="off" autoComplete="off" aria-label="Your username" className="h-10 min-w-0 flex-1 bg-transparent pr-3 text-[0.88rem] text-white outline-none" />
          <span className="grid size-10 place-items-center">
            {avail === 'checking' ? <Loader2 className="size-4 animate-spin text-white/40" /> : avail ? avail.ok ? <Check className="size-4 text-white" /> : <X className="size-4 text-white/60" /> : null}
          </span>
        </div>
        {avail && avail !== 'checking' && !avail.ok && <p className="text-[0.76rem] text-white/60">{avail.message ?? 'That name is not available.'}</p>}
        <p className="text-[0.74rem] text-[var(--ed-mute)]">You can change it twice a week. Names can be one character.</p>
      </Group>
    </div>
  )
}

export function InsightsPanel({ api }: { api: EditorApi }) {
  const { stats, cfg } = api
  const max = Math.max(1, ...stats.days.map((d) => d.views))
  const links = cfg.blocks.filter((b) => b.t === 'link' || b.t === 'social' || b.t === 'video')
  const top = [...links].map((b) => ({ b, n: stats.links[b.id] ?? 0 })).sort((a, b) => b.n - a.n)
  return (
    <div>
      <Group title="Last 30 days">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--ed-line)] p-4">
            <p className="text-[0.74rem] text-[var(--ed-mute)]">Views</p>
            <p className="mt-1 text-3xl font-medium tracking-[-0.04em] tabular-nums">{stats.views.toLocaleString('en-US')}</p>
          </div>
          <div className="rounded-xl border border-[var(--ed-line)] p-4">
            <p className="text-[0.74rem] text-[var(--ed-mute)]">Clicks</p>
            <p className="mt-1 text-3xl font-medium tracking-[-0.04em] tabular-nums">{stats.clicks.toLocaleString('en-US')}</p>
          </div>
        </div>
        <div className="flex h-24 items-end gap-[3px]" role="img" aria-label="Views per day">
          {stats.days.map((d) => (
            <span key={d.day} title={`${d.day.slice(4, 6)}/${d.day.slice(6)}: ${d.views} views`} className="flex-1 rounded-sm bg-white/80 transition-all" style={{ height: `${Math.max(3, (d.views / max) * 100)}%`, opacity: d.views ? 1 : 0.18 }} />
          ))}
        </div>
      </Group>
      <Group title="Links">
        {top.length === 0 && <p className="text-[0.8rem] text-[var(--ed-mute)]">Nothing to count yet.</p>}
        {top.map(({ b, n }) => (
          <div key={b.id} className="flex items-center justify-between gap-3 text-[0.82rem]">
            <span className="min-w-0 truncate text-white/80">{b.t === 'link' || b.t === 'video' ? b.title || b.url : b.t === 'social' ? b.platform : ''}</span>
            <span className="tabular-nums text-[var(--ed-mute)]">{n.toLocaleString('en-US')}</span>
          </div>
        ))}
      </Group>
    </div>
  )
}

export function SettingsPanel({ api }: { api: EditorApi }) {
  const { cfg, up, profile } = api
  const url = `logoless.io/${profile.handle}`
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <Group title="Share">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate rounded-xl border border-[var(--ed-line)] px-3.5 py-2.5 text-[0.88rem]">{url}</span>
          <Btn
            onClick={() => {
              void navigator.clipboard?.writeText(`https://${url}`)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1400)
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? 'Copied' : 'Copy'}
          </Btn>
          <a href={`/${profile.handle}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--ed-line2)] px-4 text-[0.8rem] hover:bg-white/10">
            <ExternalLink className="size-4" /> Open
          </a>
        </div>
      </Group>
      <Group title="On the page">
        <Switch checked={cfg.meta.badges} onChange={(v) => up('meta', { badges: v })} label="Show your account number" hint="And OG or Founding, if you earned them." />
        <Switch checked={cfg.meta.views} onChange={(v) => up('meta', { views: v })} label="Show a view counter" />
        <Switch checked={cfg.meta.badge} onChange={(v) => up('meta', { badge: v })} label="Show “logoless” at the bottom" />
        <Row label="Where you are">
          <Input value={cfg.meta.location} maxLength={40} placeholder="London" onChange={(e) => up('meta', { location: e.target.value })} />
        </Row>
      </Group>
      <Group title="Search and sharing">
        <Row label="Title">
          <Input value={cfg.meta.title} maxLength={70} placeholder={profile.name} onChange={(e) => up('meta', { title: e.target.value })} />
        </Row>
        <Row label="Description">
          <Area value={cfg.meta.description} maxLength={200} placeholder="Shown when your link is shared." onChange={(e) => up('meta', { description: e.target.value })} />
        </Row>
        <Switch checked={cfg.meta.index} onChange={(v) => up('meta', { index: v })} label="Let search engines list your page" />
      </Group>
      <Group>
        <Btn variant="ghost" onClick={() => void signOut({ callbackUrl: '/' })} className={cn('w-full')}>
          <LogOut className="size-4" /> Log out
        </Btn>
      </Group>
    </div>
  )
}
