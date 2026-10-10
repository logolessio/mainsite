'use client'

import { Camera, Check, Loader2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Field, Input, Select, Textarea } from '@/components/ui/fields'
import { COUNTRIES, checkHandleAvailable } from '@/lib/onboarding'
import { cn } from '@/lib/utils'
import type { StepProps } from '../types'
import { StepTitle } from '../ui'

const HANDLE_RE = /^[a-z0-9._]{3,24}$/

export function ProfileStep({ data, update }: StepProps) {
  const file = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle')

  useEffect(() => {
    const h = data.handle
    if (!h) return setState('idle')
    if (!HANDLE_RE.test(h)) return setState('invalid')
    setState('checking')
    let live = true
    const t = setTimeout(async () => {
      const ok = await checkHandleAvailable(h)
      if (live) setState(ok ? 'ok' : 'taken')
    }, 400)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [data.handle])

  const onFile = (f?: File | null) => {
    if (!f) return
    if (!f.type.startsWith('image/')) return
    if (data.avatar) URL.revokeObjectURL(data.avatar)
    // TODO(backend): upload the file and store the returned URL instead of this local preview
    update({ avatar: URL.createObjectURL(f) })
  }

  const initials = (data.name || data.handle || '?').trim().slice(0, 2).toUpperCase()

  return (
    <div>
      <StepTitle title="Make it yours" sub="This is what brands and other clippers see." />

      <div className="mt-7 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => file.current?.click()}
          aria-label="Upload a profile photo"
          className="group relative grid size-24 place-items-center overflow-hidden rounded-full border border-line-strong bg-white/[0.05]"
        >
          {data.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.avatar} alt="" className="size-full object-cover" />
          ) : (
            <span className="font-display text-3xl text-mute">{initials}</span>
          )}
          <span className="absolute inset-0 grid place-items-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-5" />
          </span>
        </button>
        <input ref={file} type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        <div className="flex items-center gap-3 text-xs text-mute">
          <button type="button" onClick={() => file.current?.click()} className="underline underline-offset-4 hover:text-paper">
            {data.avatar ? 'Change photo' : 'Add a photo'}
          </button>
          {data.avatar && (
            <button type="button" onClick={() => update({ avatar: null })} className="hover:text-paper">
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <Field label="Display name">
          <Input value={data.name} onChange={(e) => update({ name: e.target.value })} autoComplete="name" placeholder="Your name or alias" maxLength={40} />
        </Field>

        <Field label="Username" hint="Lowercase letters, numbers, dots and underscores. 3 to 24 characters.">
          <span className="relative block">
            <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center text-mute">@</span>
            <Input
              value={data.handle}
              onChange={(e) => update({ handle: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '') })}
              autoComplete="off"
              spellCheck={false}
              placeholder="yourhandle"
              maxLength={24}
              className={cn('pr-12 pl-8', state === 'taken' || state === 'invalid' ? 'border-signal/70' : '')}
            />
            <span className="absolute inset-y-0 right-4 grid place-items-center">
              {state === 'checking' && <Loader2 className="size-4 animate-spin text-mute" />}
              {state === 'ok' && <Check className="size-4 text-emerald-300" />}
              {(state === 'taken' || state === 'invalid') && <X className="size-4 text-signal" />}
            </span>
          </span>
          {state === 'taken' && <span className="mt-1 block text-xs text-signal">That username is taken.</span>}
        </Field>

        <Field label="Bio" hint={`${data.bio.length}/160`}>
          <Textarea value={data.bio} onChange={(e) => update({ bio: e.target.value.slice(0, 160) })} rows={3} placeholder="What do you clip? Anything brands should know." />
        </Field>

        <Field label="Country" hint="Used to set up payouts and tax details.">
          <Select value={data.country} onChange={(e) => update({ country: e.target.value })}>
            <option value="" disabled>
              Select a country
            </option>
            {COUNTRIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  )
}

export const profileValid = (d: { name: string; handle: string; country: string }) =>
  d.name.trim().length >= 2 && HANDLE_RE.test(d.handle) && d.country !== ''
