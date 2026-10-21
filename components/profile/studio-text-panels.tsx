'use client'

import { Download, ExternalLink, Link2, Loader2, Shield } from 'lucide-react'
import { ActionButton } from '@/components/app/ui'
import { useFeature } from '@/components/shell/features-provider'
import { Field, Input, Select, Textarea } from '@/components/ui/fields'
import { PROFILE_FONT_CLASS } from '@/lib/profile-fonts'
import { FONT_OPTIONS, NAME_EFFECTS, type ProfileView } from '@/lib/profile-style'
import { cn } from '@/lib/utils'
import { nameSpeed } from './profile-card'
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

/** Which numbers and accounts show is its own page; this opens it. */
export function PrivacyPanel() {
  return (
    <div className="grid gap-5">
      <p className="text-sm leading-relaxed text-mute">Choose who can see your page, which numbers show on it (submissions, views, earnings, campaigns), and which of your accounts are listed. Nothing there changes what the logoless team can see to run payouts and checks.</p>
      <a href="/dashboard/profile/privacy" className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85">
        <Shield aria-hidden="true" className="size-4" /> Open privacy settings <ExternalLink aria-hidden="true" className="size-3.5" />
      </a>
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
