'use client'

import { BadgeCheck, Globe, Loader2, Lock, Undo2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ActionButton, Toggle } from '@/components/app/ui'
import { BrandIcon, type BrandName } from '@/components/brand-icon'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { PROFILE_VISIBILITY, type ProfileExtras, type ProfileVisibility } from '@/lib/profile-extras'
import { CLIPPING_PLATFORMS, DEFAULT_SHOW, LINK_PLATFORMS, SHOW_OPTIONS, usernameOf, type ProfileView, type ShowKey, type ShowMap } from '@/lib/profile-style'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type Privacy = ProfileExtras['privacy']
type State = { show: ShowMap; privacy: Privacy }

const VIS_ICON: Record<ProfileVisibility, typeof Globe> = { public: Globe, members: Users, private: Lock }

/** Plain words for each switch: what turning it on shows, and to whom. */
const EXPLAIN: Record<ShowKey, string> = {
  status: 'A green dot on your picture while you are using logoless.',
  joined: 'The month and year you joined.',
  country: 'A two-letter country code, only if you chose a country.',
  badges: 'The badges you picked to show (up to five).',
  clips: 'How many pieces of content you have submitted.',
  views: 'The total views your submissions have earned. Also puts you on the leaderboard.',
  earnings: 'How much you have earned in total, in dollars.',
  campaigns: 'How many campaigns you have taken part in.',
  links: 'Your TikTok, YouTube and Instagram, as buttons on your page.',
  feed: 'Your approved clips on the public Submissions page, with your name and a link to your profile.',
}

const SECTIONS: { title: string; sub: string; keys: ShowKey[] }[] = [
  { title: 'About you', sub: 'Small details on your card.', keys: ['status', 'joined', 'country', 'badges'] },
  { title: 'Your numbers', sub: 'Each one stays hidden until you switch it on.', keys: ['clips', 'views', 'earnings', 'campaigns', 'feed'] },
]

/**
 * The privacy page: who can see the profile at all, then one switch per detail, grouped and explained in plain
 * words, and a public or private choice for each creator account.
 */
export function PrivacySettings() {
  const [saved, setSaved] = useState<State | null>(null)
  const [st, setSt] = useState<State | null>(null)
  const [profile, setProfile] = useState<ProfileView | null>(null)
  const [verified, setVerified] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/me/profile', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: { profile?: ProfileView; error?: string }) => {
        if (!j.profile) return setError(j.error ?? 'Could not load your settings.')
        const s = { show: j.profile.show, privacy: j.profile.extras.privacy }
        setProfile(j.profile)
        setSaved(s)
        setSt(s)
      })
      .catch(() => setError('Could not load your settings.'))
    fetch('/api/me/accounts/verify', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { accounts?: { platform: string; status: string }[] } | null) => setVerified((j?.accounts ?? []).filter((a) => a.status === 'verified').map((a) => a.platform)))
      .catch(() => {})
  }, [])

  const dirty = Boolean(st && saved && JSON.stringify(st) !== JSON.stringify(saved))

  const save = async () => {
    if (!st) return false
    setSaving(true)
    try {
      const res = await fetch('/api/me/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ show: st.show, extras: { privacy: st.privacy } }) })
      const j = (await res.json().catch(() => ({}))) as { profile?: ProfileView; error?: string }
      if (!res.ok || !j.profile) throw new Error(j.error ?? 'Could not save.')
      const s = { show: j.profile.show, privacy: j.profile.extras.privacy }
      setSaved(s)
      setSt(s)
      toast.ok('Privacy saved')
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save.')
      return false
    } finally {
      setSaving(false)
    }
  }
  useUnsavedGuard(dirty, { onSave: save })

  if (!st || !profile) return error ? <p className="text-mute">{error}</p> : <div role="status" aria-busy="true" className="sk h-[560px] rounded-[2rem] border border-line bg-white/[0.03]" />

  const setShow = (k: ShowKey, v: boolean) => setSt((c) => (c ? { ...c, show: { ...c.show, [k]: v } } : c))
  const setPriv = (p: Partial<Privacy>) => setSt((c) => (c ? { ...c, privacy: { ...c.privacy, ...p } } : c))
  const preset = (kind: 'recommended' | 'open' | 'closed') =>
    setSt((c) =>
      c
        ? {
            show: Object.fromEntries(SHOW_OPTIONS.map((o) => [o.key, kind === 'open' ? true : kind === 'closed' ? false : DEFAULT_SHOW[o.key]])) as ShowMap,
            privacy: { ...c.privacy, profile: kind === 'closed' ? 'private' : 'public', hiddenLinks: kind === 'open' ? [] : c.privacy.hiddenLinks },
          }
        : c,
    )
  const accounts = profile.links.filter((l) => CLIPPING_PLATFORMS.includes(l.platform))
  const hiddenPage = st.privacy.profile === 'private'

  return (
    <div className="grid max-w-3xl gap-6 pb-6">
      {/* ---------- who can see the page ---------- */}
      <Section title="Who can see your page" sub={`logoless.io/@${profile.handle}`}>
        <div role="radiogroup" aria-label="Who can see your page" className="grid gap-2 sm:grid-cols-3">
          {PROFILE_VISIBILITY.map((v) => {
            const on = st.privacy.profile === v.id
            const Icon = VIS_ICON[v.id]
            return (
              <button key={v.id} type="button" role="radio" aria-checked={on} onClick={() => setPriv({ profile: v.id })} className={cn('flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors', on ? 'border-paper bg-paper/[0.08]' : 'border-line hover:bg-white/[0.03]')}>
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-pill', on ? 'bg-paper text-ink' : 'bg-white/[0.06] text-mute')}>
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{v.label}</span>
                  <span className="block text-xs leading-snug text-mute">{v.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <span className="mr-1 text-xs text-mute">Quick choices:</span>
          <Chip onClick={() => preset('recommended')}>Recommended</Chip>
          <Chip onClick={() => preset('open')}>Show everything</Chip>
          <Chip onClick={() => preset('closed')}>Keep it private</Chip>
        </div>
      </Section>

      <div className={cn('grid gap-6 transition-opacity', hiddenPage && 'opacity-50')}>
        {hiddenPage && <p className="-mb-2 text-sm text-mute">Your page is private, so none of the below is shown to anyone but you. Your choices are kept for when you open it up again.</p>}
        {SECTIONS.map((sec) => (
          <Section key={sec.title} title={sec.title} sub={sec.sub}>
            <ul className="divide-y divide-line">
              {sec.keys.map((k) => {
                const o = SHOW_OPTIONS.find((x) => x.key === k)!
                return <Row key={k} label={o.label} body={EXPLAIN[k]} checked={st.show[k]} onChange={(v) => setShow(k, v)} />
              })}
            </ul>
          </Section>
        ))}

        <Section title="Creator accounts" sub="The accounts you post from.">
          <ul className="divide-y divide-line">
            <Row label="Show creator accounts" body={EXPLAIN.links} checked={st.show.links} onChange={(v) => setShow('links', v)} />
          </ul>
          {accounts.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-line p-4 text-sm text-mute">
              You have not linked any accounts yet. <a href="/dashboard/accounts" className="text-paper underline underline-offset-4">Link an account</a>
            </p>
          ) : (
            <ul className={cn('mt-2 grid gap-2 transition-opacity', !st.show.links && 'pointer-events-none opacity-40')} aria-disabled={!st.show.links}>
              {accounts.map((l) => {
                const shown = !st.privacy.hiddenLinks.includes(l.platform)
                const label = LINK_PLATFORMS.find((p) => p.id === l.platform)?.label ?? l.platform
                return (
                  <li key={l.platform} className="flex items-center gap-3 rounded-2xl border border-line px-3.5 py-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-pill border border-line">
                      <BrandIcon name={l.platform as BrandName} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm">
                        {label}
                        {verified.includes(l.platform) && <BadgeCheck className="size-3.5 text-emerald-300" aria-label="Verified" />}
                      </span>
                      <span className="block truncate text-xs text-mute">@{usernameOf(l.platform, l.url).replace(/^https?:\/\/[^/]+\/@?/, '')} · {shown ? 'Public' : 'Private'}</span>
                    </span>
                    <Toggle label={`Show ${label} on my page`} checked={shown} onChange={(v) => setPriv({ hiddenLinks: v ? st.privacy.hiddenLinks.filter((x) => x !== l.platform) : [...st.privacy.hiddenLinks, l.platform] })} />
                  </li>
                )
              })}
            </ul>
          )}
          <ul className="mt-2 divide-y divide-line">
            <Row label="Show verified ticks" body="A small tick on accounts you proved are yours. Turn it off to show the accounts without it." checked={st.privacy.verifiedTicks} onChange={(v) => setPriv({ verifiedTicks: v })} />
          </ul>
        </Section>
      </div>

      <p className="text-xs leading-relaxed text-mute">Your username, display name, picture and banner are part of your page, so anyone who can see the page sees them. Nothing here changes what the logoless team can see to run payouts and checks.</p>

      <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 md:bottom-4 rounded-3xl border border-line-strong bg-surface/95 p-2.5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-1.5">
          <ActionButton data-hotkey-save onClick={() => void save()} disabled={saving || !dirty} className="rounded-pill">
            {saving && <Loader2 className="size-4 animate-spin" />} Save privacy
          </ActionButton>
          {dirty && (
            <button type="button" onClick={() => setSt(saved)} className="inline-flex h-10 items-center gap-1.5 rounded-pill px-3 text-sm text-mute hover:text-paper">
              <Undo2 className="size-4" /> Discard
            </button>
          )}
          <span className="flex items-center gap-2 text-xs text-mute">
            <span className={cn('size-2 rounded-pill', dirty ? 'bg-amber-300' : 'bg-emerald-400')} />
            {dirty ? 'Unsaved changes' : 'All saved'}
          </span>
          <a href={`/@${profile.handle}`} className="ml-auto pr-2 text-sm text-mute hover:text-paper">
            View public page
          </a>
        </div>
      </div>
    </div>
  )
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[calc(1.75rem*var(--round,1))] border border-line bg-[#0a0a0b] p-5 sm:p-6">
      <h2 className="text-[17px] font-medium">{title}</h2>
      {sub && <p className="mt-0.5 mb-4 text-sm text-mute">{sub}</p>}
      {children}
    </section>
  )
}

function Row({ label, body, checked, onChange }: { label: string; body: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <li className="flex items-center gap-4 py-3.5 first:pt-1 last:pb-1">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px]">{label}</span>
        <span className="block text-sm leading-snug text-mute">{body}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2.5">
        <span className={cn('hidden w-12 text-right text-xs sm:block', checked ? 'text-paper' : 'text-mute')}>{checked ? 'Shown' : 'Hidden'}</span>
        <Toggle label={label} checked={checked} onChange={onChange} />
      </span>
    </li>
  )
}

function Chip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="h-8 rounded-pill border border-line-strong px-3.5 text-xs transition-colors hover:bg-white/10">
      {children}
    </button>
  )
}
