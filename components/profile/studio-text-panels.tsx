'use client'

import { BadgeCheck, Download, ExternalLink, Link2, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ActionButton, Toggle } from '@/components/app/ui'
import { BrandIcon, type BrandName } from '@/components/brand-icon'
import { useFeature } from '@/components/shell/features-provider'
import { Field, Input, Select, Textarea } from '@/components/ui/fields'
import { PROFILE_FONT_CLASS } from '@/lib/profile-fonts'
import { PROFILE_VISIBILITY, type ProfileExtras } from '@/lib/profile-extras'
import { CLIPPING_PLATFORMS, DEFAULT_SHOW, FONT_OPTIONS, LINK_PLATFORMS, NAME_EFFECTS, SHOW_OPTIONS, type ProfileView, type ShowKey, type ShowMap } from '@/lib/profile-style'
import { cn } from '@/lib/utils'
import { nameSpeed } from './profile-card'
import { EXPLAIN, Row, VIS_ICON } from './privacy-settings'
import { Group, Slider, Tile } from './studio-controls'
import type { Studio } from './studio-panels'

/** Name effects that have a direction worth turning. */
const ANGLED = ['gradient', 'rainbow', 'chrome', 'shimmer']
/** Name effects that move, so a speed control means something. */
const MOVING = ['gradient', 'neon', 'glow', 'rainbow', 'chrome', 'glitch', 'shimmer']

const FIELD = 'h-11 rounded-tile'
const COUNTRIES = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'SG', 'NL', 'SE', 'BR', 'IN', 'NG', 'ZA', 'PH', 'ID', 'MX', 'JP', 'KR']

const set = <K extends keyof ProfileView>(s: Studio, k: K, v: ProfileView[K]) => s.setF((c) => (c ? { ...c, [k]: v } : c))

/** The name, as people see it: what it says, the font it is in and the effect on it. */
export function NamePanel({ s }: { s: Studio }) {
  const { f, ex } = s
  const nameVars = { ['--na' as string]: f.accent, ['--nb' as string]: f.accent2, ['--nx-i' as string]: String(f.extras.name.intensity / 50), ['--nx-sp' as string]: String(nameSpeed(f.extras.name.speed)), ['--nx-ang' as string]: `${f.extras.name.angle}deg` }
  return (
    <div className="grid gap-7">
      <Field label="Display name">
        <Input className={FIELD} value={f.displayName} maxLength={40} onChange={(e) => set(s, 'displayName', e.target.value)} />
      </Field>
      <Group title="Font">
        <div className="grid grid-cols-2 gap-2">
          {FONT_OPTIONS.map((o) => (
            <Tile key={o.id} on={f.font === o.id} onClick={() => set(s, 'font', o.id)} className="px-3 py-3 text-left">
              <span className={cn('block truncate pr-4 text-xl leading-tight text-paper', PROFILE_FONT_CLASS[o.id])}>{f.displayName || o.label}</span>
              <span className="mt-0.5 block text-[11px]">{o.label}</span>
            </Tile>
          ))}
        </div>
      </Group>
      <Group title="Effect">
        <div className="grid grid-cols-3 gap-2">
          {NAME_EFFECTS.map((o) => (
            <Tile key={o.id} on={f.nameEffect === o.id} onClick={() => set(s, 'nameEffect', o.id)} className="px-2 py-3 text-center">
              <span style={nameVars} className={cn('mx-auto block w-fit text-xl font-bold text-paper', `nx-${o.id}`)}>
                {f.displayName.trim().slice(0, 6) || 'Aa'}
              </span>
              <span className="mt-0.5 block text-[11px]">{o.label}</span>
            </Tile>
          ))}
        </div>
        {f.nameEffect !== 'solid' && (
          <div className="mt-4 grid gap-4 rounded-panel border border-line bg-ink/50 p-4">
            <Slider label="Intensity" hint="How strong it is" value={f.extras.name.intensity} onChange={(intensity) => ex('name', { intensity })} normal={50} />
            {MOVING.includes(f.nameEffect) && <Slider label="Speed" hint="How fast it moves" value={f.extras.name.speed} onChange={(speed) => ex('name', { speed })} normal={50} />}
            {ANGLED.includes(f.nameEffect) && <Slider label="Direction" value={f.extras.name.angle} min={0} max={360} step={5} unit="°" onChange={(angle) => ex('name', { angle })} normal={90} />}
            <p className="text-xs text-mute">The colours come from your card colours.</p>
          </div>
        )}
      </Group>
    </div>
  )
}

/** The words about you: username, pronouns, bio and country. */
export function AboutPanel({ s }: { s: Studio }) {
  const { f } = s
  const punctuation = useFeature('username-punctuation')
  return (
    <div className="grid gap-5">
      <Field label="Username" hint={`logoless.io/@${f.handle}`}>
        <Input className={FIELD} value={f.handle} maxLength={20} onChange={(e) => set(s, 'handle', e.target.value.toLowerCase().replace(punctuation ? /[^a-z0-9_.-]/g : /[^a-z0-9_]/g, ''))} />
      </Field>
      <Field label="Pronouns (optional)">
        <Input className={FIELD} value={f.pronouns} maxLength={30} placeholder="e.g. she/her" onChange={(e) => set(s, 'pronouns', e.target.value)} />
      </Field>
      <Field label="About me" hint={`${f.bio.length}/400`}>
        <Textarea className="min-h-32 rounded-tile" value={f.bio} maxLength={400} rows={5} onChange={(e) => set(s, 'bio', e.target.value)} />
      </Field>
      <Field label="Country (optional)">
        <Select className={FIELD} value={f.country ?? ''} onChange={(e) => set(s, 'country', e.target.value || null)}>
          <option value="">Prefer not to say</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  )
}

/**
 * Privacy, right inside the profile settings: who can see the page, then one switch for each detail and each account. It edits the same
 * profile as everything else here, so it saves with the rest.
 */
export function PrivacyPanel({ s }: { s: Studio }) {
  const { f } = s
  const [verified, setVerified] = useState<string[]>([])
  useEffect(() => {
    fetch('/api/me/accounts/verify', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { accounts?: { platform: string; status: string }[] } | null) => setVerified((j?.accounts ?? []).filter((a) => a.status === 'verified').map((a) => a.platform)))
      .catch(() => {})
  }, [])
  const setShow = (k: ShowKey, v: boolean) => s.setF((c) => (c ? { ...c, show: { ...c.show, [k]: v } } : c))
  const setPriv = (p: Partial<ProfileExtras['privacy']>) => s.ex('privacy', p)
  const preset = (kind: 'recommended' | 'open' | 'closed') => {
    s.setF((c) => (c ? { ...c, show: Object.fromEntries(SHOW_OPTIONS.map((o) => [o.key, kind === 'open' ? true : kind === 'closed' ? false : DEFAULT_SHOW[o.key]])) as ShowMap } : c))
    setPriv({ profile: kind === 'closed' ? 'private' : 'public', ...(kind === 'open' ? { hiddenLinks: [] } : {}) })
  }
  const accounts = f.links.filter((l) => CLIPPING_PLATFORMS.includes(l.platform))
  const hiddenPage = f.extras.privacy.profile === 'private'
  return (
    <div className="grid gap-8">
      <Group title="Who can see your page" hint={`logoless.io/@${f.handle}`}>
        <div role="radiogroup" aria-label="Who can see your page" className="grid gap-2">
          {PROFILE_VISIBILITY.map((v) => {
            const on = f.extras.privacy.profile === v.id
            const Icon = VIS_ICON[v.id]
            return (
              <button key={v.id} type="button" role="radio" aria-checked={on} onClick={() => setPriv({ profile: v.id })} className={cn('flex items-center gap-3 rounded-panel border p-3.5 text-left transition-colors', on ? 'border-paper bg-paper/[0.08]' : 'border-line hover:bg-white/[0.03]')}>
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-pill', on ? 'bg-paper text-ink' : 'bg-white/[0.06] text-mute')}>
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{v.label}</span>
                  <span className="block text-xs leading-snug text-mute">{v.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(
            [
              ['recommended', 'Recommended'],
              ['open', 'Show everything'],
              ['closed', 'Keep it private'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" onClick={() => preset(k)} className="h-8 rounded-pill border border-line-strong px-3.5 text-xs transition-colors hover:bg-white/10">
              {label}
            </button>
          ))}
        </div>
      </Group>

      <div className={cn('grid gap-8 transition-opacity', hiddenPage && 'opacity-50')}>
        {hiddenPage && <p className="-mb-3 text-sm text-mute">Your page is private, so none of this is shown to anyone but you. Your choices are kept for when you open it up again.</p>}
        {(
          [
            ['About you', ['status', 'joined', 'country', 'badges']],
            ['Your numbers', ['clips', 'views', 'earnings', 'campaigns', 'feed']],
          ] as const
        ).map(([title, keys]) => (
          <Group key={title} title={title}>
            <ul className="divide-y divide-line">
              {keys.map((k) => (
                <Row key={k} label={SHOW_OPTIONS.find((o) => o.key === k)!.label} body={EXPLAIN[k]} checked={f.show[k]} onChange={(v) => setShow(k, v)} />
              ))}
            </ul>
          </Group>
        ))}
        <Group title="Creator accounts">
          <ul className="divide-y divide-line">
            <Row label="Show creator accounts" body={EXPLAIN.links} checked={f.show.links} onChange={(v) => setShow('links', v)} />
          </ul>
          {accounts.length === 0 ? (
            <p className="mt-3 rounded-panel border border-dashed border-line p-4 text-sm text-mute">
              You have not linked any accounts yet. <a href="/dashboard/accounts" className="text-paper underline underline-offset-4">Link an account</a>
            </p>
          ) : (
            <ul className={cn('mt-2 grid gap-2 transition-opacity', !f.show.links && 'pointer-events-none opacity-40')}>
              {accounts.map((l) => {
                const shown = !f.extras.privacy.hiddenLinks.includes(l.platform)
                const label = LINK_PLATFORMS.find((p) => p.id === l.platform)?.label ?? l.platform
                return (
                  <li key={l.platform} className="flex items-center gap-3 rounded-panel border border-line px-3.5 py-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-pill border border-line">
                      <BrandIcon name={l.platform as BrandName} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm">
                        {label}
                        {verified.includes(l.platform) && <BadgeCheck aria-label="Verified" className="size-3.5 text-paper/70" />}
                      </span>
                      <span className="block truncate text-xs text-mute">{shown ? 'Public' : 'Private'}</span>
                    </span>
                    <Toggle label={`Show ${label} on my page`} checked={shown} onChange={(v) => setPriv({ hiddenLinks: v ? f.extras.privacy.hiddenLinks.filter((x) => x !== l.platform) : [...f.extras.privacy.hiddenLinks, l.platform] })} />
                  </li>
                )
              })}
            </ul>
          )}
          <ul className="mt-2 divide-y divide-line">
            <Row label="Show verified ticks" body="A small tick on accounts you proved are yours." checked={f.extras.privacy.verifiedTicks} onChange={(v) => setPriv({ verifiedTicks: v })} />
          </ul>
        </Group>
      </div>
      <p className="text-xs leading-relaxed text-mute">Nothing here changes what the logoless team can see to run payouts and checks.</p>
    </div>
  )
}

/** The TikTok, YouTube and Instagram accounts on the page are the ones added on the Accounts page. */
export function AccountsPanel() {
  return (
    <div className="grid gap-5">
      <p className="text-sm leading-relaxed text-mute">The accounts on your page are the ones you have added and proven on the Accounts page. Add one there, prove it with a code in its bio, and it shows here with a tick.</p>
      <a href="/dashboard/accounts" className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85">
        <Link2 aria-hidden="true" className="size-4" /> Open your accounts <ExternalLink aria-hidden="true" className="size-3.5" />
      </a>
    </div>
  )
}

/** Bring the picture, banner, colour and name across from Discord. */
export function ImportPanel({ available, linked, busy, onImport }: { available: boolean; linked: boolean; busy: boolean; onImport: () => void }) {
  return (
    <div className="grid gap-5">
      <p className="text-sm leading-relaxed text-mute">Bring your Discord picture, banner, colour and name across in one go. Check it over afterwards, then save. Discord does not share your About me or connections, so add those yourself.</p>
      {!available ? (
        <p className="text-sm text-mute">This is not switched on yet.</p>
      ) : !linked ? (
        <a href="/api/discord/connect?back=/dashboard/profile" className="inline-flex h-11 items-center justify-center rounded-pill bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85">
          Connect Discord first
        </a>
      ) : (
        <ActionButton onClick={onImport} disabled={busy} className="rounded-pill">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Import from my Discord
        </ActionButton>
      )}
    </div>
  )
}
