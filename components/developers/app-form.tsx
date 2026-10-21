'use client'

import { CheckCircle2, Loader2 } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { APP_KINDS, type AppDraft, type ClientType, LIMITS, USE_CASES, draftProblems, realLength } from '@/lib/dev-app-rules'
import { cn } from '@/lib/utils'
import { CopyButton } from './code-block'
import { RedirectChips } from './redirect-chips'

export type SavedApp = AppDraft & { id: string }
type Field = keyof AppDraft

export const EMPTY_DRAFT: AppDraft = { name: '', description: '', website: '', kind: '', type: 'confidential', useCases: [], useDescription: '', redirectUris: [], privacyUrl: '', termsUrl: '' }

const input = 'h-12 w-full rounded-2xl border bg-ink/80 px-4 text-[15px] outline-none transition-colors placeholder:text-mute/70 focus:border-paper'
const ORDER: Field[] = ['name', 'description', 'website', 'kind', 'useCases', 'useDescription', 'redirectUris', 'privacyUrl', 'termsUrl']

function Section({ n, title, help, children }: { n: number; title: string; help: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[calc(1.8rem*var(--round,1))] border border-line bg-black/40 p-5 sm:p-7 md:p-8">
      <header className="mb-6 flex gap-4">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-pill border border-line-strong font-mono text-xs text-mute">
          {n}
        </span>
        <div>
          <h2 className="text-xl tracking-[-0.01em]">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-mute">{help}</p>
        </div>
      </header>
      <div className="grid gap-6">{children}</div>
    </section>
  )
}

/** A label, a line of help, the control and its error, wired together for screen readers. */
function Row({ id, label, help, optional, error, counter, children }: { id: string; label: string; help?: React.ReactNode; optional?: boolean; error?: string; counter?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[15px] font-medium">
          {label} {optional ? <span className="font-normal text-mute">(optional)</span> : <span className="sr-only">(required)</span>}
        </label>
        {counter}
      </div>
      {help && (
        <p id={`${id}-help`} className="-mt-1 text-sm leading-relaxed text-mute">
          {help}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-signal">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Registering an app, and changing it later. Every field is checked as you go with the same rules the server uses, errors
 * show under the field once you have left it (or pressed the button), and the server's answer is shown in the same places.
 */
export function AppForm({ mode, appId, initial, onSaved, onCancel }: { mode: 'create' | 'edit'; appId?: string; initial?: AppDraft; onSaved?: (app: SavedApp) => void; onCancel?: () => void }) {
  const [d, setD] = useState<AppDraft>(initial ?? EMPTY_DRAFT)
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [tried, setTried] = useState(false)
  const [server, setServer] = useState<Partial<Record<Field, string>>>({})
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [made, setMade] = useState<{ id: string; secret: string | null; name: string } | null>(null)
  const uid = useId()
  const fid = (f: Field) => `${uid}-${f}`

  const problems = useMemo(() => draftProblems(d), [d])
  const err = (f: Field) => server[f] ?? (tried || touched[f] ? problems[f] : undefined)
  const set = <K extends Field>(k: K, v: AppDraft[K]) => {
    setD((p) => ({ ...p, [k]: v }))
    if (server[k]) setServer((s) => ({ ...s, [k]: undefined }))
  }
  const touch = (f: Field) => () => setTouched((t) => ({ ...t, [f]: true }))
  const aria = (f: Field, help = true) => ({ id: fid(f), 'aria-invalid': Boolean(err(f)) || undefined, 'aria-describedby': [help && `${fid(f)}-help`, err(f) && `${fid(f)}-error`].filter(Boolean).join(' ') || undefined })
  const border = (f: Field) => (err(f) ? 'border-signal/70' : 'border-line-strong')

  const chooseKind = (k: string) => {
    const kind = APP_KINDS.find((x) => x.id === k)
    setD((p) => ({ ...p, kind: k, type: mode === 'create' && kind ? kind.type : p.type }))
    setTouched((t) => ({ ...t, kind: true }))
  }

  const submit = async () => {
    setTried(true)
    setFormError('')
    const first = ORDER.find((f) => problems[f])
    if (first) {
      document.getElementById(fid(first))?.focus()
      setFormError('A few things need fixing. They are marked below.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(mode === 'create' ? '/api/developers/apps' : `/api/developers/apps/${appId}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(mode === 'create' ? d : { action: 'update', app: d }) })
      const j = (await res.json().catch(() => ({}))) as { error?: string; fields?: Partial<Record<Field, string>>; app?: { id: string; name: string }; secret?: string | null }
      if (!res.ok) {
        if (j.fields) {
          setServer(j.fields)
          const f = ORDER.find((x) => j.fields?.[x])
          if (f) document.getElementById(fid(f))?.focus()
        }
        setFormError(j.error ?? 'Could not save. Please try again.')
      } else if (mode === 'create' && j.app) {
        setMade({ id: j.app.id, secret: j.secret ?? null, name: j.app.name })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (j.app) onSaved?.({ ...d, id: j.app.id })
    } catch {
      setFormError('Could not reach logoless. Check your connection and try again.')
    }
    setBusy(false)
  }

  if (made) {
    return (
      <div className="rounded-[calc(1.8rem*var(--round,1))] border border-emerald-400/30 bg-emerald-400/[0.04] p-6 md:p-9">
        <p className="flex items-center gap-2.5 text-xl">
          <CheckCircle2 aria-hidden="true" className="size-6 text-emerald-300" /> {made.name} is registered
        </p>
        <div className="mt-6 grid gap-5">
          <div>
            <p className="text-sm text-mute">Client id (public: it goes in your sign-in address)</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded-xl bg-black/50 px-3 py-2 font-mono text-sm break-all">{made.id}</code>
              <CopyButton text={made.id} label="Copy client id" />
            </div>
          </div>
          {made.secret && (
            <div>
              <p className="text-sm text-mute">Client secret. Copy it now: it is shown once, and we only keep a fingerprint. Keep it on your server.</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="rounded-xl bg-black/50 px-3 py-2 font-mono text-sm break-all">{made.secret}</code>
                <CopyButton text={made.secret} label="Copy secret" />
              </div>
            </div>
          )}
          {!made.secret && <p className="text-sm text-mute">This app has no secret: every sign-in proves itself with PKCE instead.</p>}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={`/dashboard/developer/${made.id}`} className="inline-flex h-11 items-center rounded-pill bg-paper px-6 text-sm font-medium text-ink hover:bg-paper/85">
            {made.secret ? 'I saved the secret, open the app' : 'Open the app'}
          </a>
          <a href="/developers#code" className="inline-flex h-11 items-center rounded-pill border border-line-strong px-5 text-sm hover:bg-paper/10">
            Get the code for your stack
          </a>
        </div>
      </div>
    )
  }

  const useLen = realLength(d.useDescription)
  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <Section n={1} title="About your app" help="People see this on the screen where they agree to sign in.">
        <Row id={fid('name')} label="App name" help="The name people know your app by." error={err('name')} counter={<span className="text-xs text-mute tabular-nums">{d.name.trim().length}/{LIMITS.name[1]}</span>}>
          <input {...aria('name')} className={cn(input, border('name'))} value={d.name} maxLength={LIMITS.name[1]} autoComplete="off" onChange={(e) => set('name', e.target.value)} onBlur={touch('name')} placeholder="Clip Tracker" />
        </Row>
        <Row id={fid('description')} label="One line about it" help="What it does, in a sentence." error={err('description')} counter={<span className="text-xs text-mute tabular-nums">{d.description.trim().length}/{LIMITS.summary[1]}</span>}>
          <input {...aria('description')} className={cn(input, border('description'))} value={d.description} maxLength={LIMITS.summary[1]} onChange={(e) => set('description', e.target.value)} onBlur={touch('description')} placeholder="Track how your clips are doing across every campaign." />
        </Row>
        <Row id={fid('website')} label="Website" optional={!(d.kind === 'website' || d.kind === 'spa')} help="Its home page. Must start with https://" error={err('website')}>
          <input {...aria('website')} className={cn(input, border('website'))} value={d.website} inputMode="url" autoComplete="url" spellCheck={false} onChange={(e) => set('website', e.target.value)} onBlur={touch('website')} placeholder="https://example.com" />
        </Row>
      </Section>

      <Section n={2} title="What kind of app is it?" help="This sets up the right kind of sign-in for you. Pick the closest one.">
        <fieldset aria-describedby={err('kind') ? `${fid('kind')}-error` : undefined}>
          <legend className="sr-only">Kind of app</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {APP_KINDS.map((k, i) => (
              <label key={k.id} className={cn('flex cursor-pointer gap-3 rounded-2xl border p-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-paper/60', d.kind === k.id ? 'border-paper bg-white/[0.06]' : 'border-line-strong hover:border-paper/50')}>
                <input type="radio" name={`${uid}-kind`} id={i === 0 ? fid('kind') : undefined} value={k.id} checked={d.kind === k.id} onChange={() => chooseKind(k.id)} className="mt-1 size-4 shrink-0 accent-white" />
                <span>
                  <span className="block text-sm font-medium">{k.label}</span>
                  <span className="block text-xs leading-relaxed text-mute">{k.hint}</span>
                </span>
              </label>
            ))}
          </div>
          {err('kind') && (
            <p id={`${fid('kind')}-error`} role="alert" className="mt-2 text-sm text-signal">
              {err('kind')}
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend className="text-[15px] font-medium">Can it keep a secret?</legend>
          <p className="mt-1 mb-3 text-sm leading-relaxed text-mute">{mode === 'create' ? 'We picked the usual answer for this kind of app. This cannot be changed later.' : 'This was set when the app was made and cannot be changed.'}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['confidential', 'Yes, it has a server', 'Your code runs somewhere private, so it can keep a client secret.'],
                ['public', 'No, it runs on the device', 'Browser, phone, desktop or extension. Uses PKCE instead of a secret.'],
              ] as [ClientType, string, string][]
            ).map(([id, t, h]) => (
              <label key={id} className={cn('flex gap-3 rounded-2xl border p-3.5 transition-colors', d.type === id ? 'border-paper bg-white/[0.06]' : 'border-line-strong', mode === 'create' ? 'cursor-pointer hover:border-paper/50' : 'cursor-not-allowed opacity-60')}>
                <input type="radio" name={`${uid}-type`} value={id} checked={d.type === id} disabled={mode !== 'create'} onChange={() => set('type', id)} className="mt-1 size-4 shrink-0 accent-white" />
                <span>
                  <span className="block text-sm font-medium">{t}</span>
                  <span className="block text-xs leading-relaxed text-mute">{h}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section n={3} title="What is it for?" help="This helps people trust your app, and helps us check it.">
        <fieldset aria-describedby={err('useCases') ? `${fid('useCases')}-error` : undefined}>
          <legend className="text-[15px] font-medium">
            Pick what fits <span className="font-normal text-mute">(up to {LIMITS.useCases})</span>
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {USE_CASES.map((u, i) => {
              const on = d.useCases.includes(u.id)
              return (
                <button
                  key={u.id}
                  id={i === 0 ? fid('useCases') : undefined}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    set('useCases', on ? d.useCases.filter((x) => x !== u.id) : [...d.useCases, u.id])
                    setTouched((t) => ({ ...t, useCases: true }))
                  }}
                  className={cn('h-10 rounded-pill border px-4 text-sm transition-colors', on ? 'border-paper bg-paper text-ink' : 'border-line-strong hover:border-paper/60')}
                >
                  {u.label}
                </button>
              )
            })}
          </div>
          {err('useCases') && (
            <p id={`${fid('useCases')}-error`} role="alert" className="mt-2 text-sm text-signal">
              {err('useCases')}
            </p>
          )}
        </fieldset>
        <Row
          id={fid('useDescription')}
          label="How will your app use logoless sign-in?"
          help={`Who will sign in, what you will do with their details, and why. At least ${LIMITS.use[0]} characters of real sentences.`}
          error={err('useDescription')}
          counter={
            <span className={cn('text-xs tabular-nums', useLen >= LIMITS.use[0] && !problems.useDescription ? 'text-emerald-300' : 'text-mute')}>
              {useLen < LIMITS.use[0] ? `${useLen}/${LIMITS.use[0]} minimum` : `${d.useDescription.trim().length}/${LIMITS.use[1]}`}
            </span>
          }
        >
          <textarea
            {...aria('useDescription')}
            rows={5}
            maxLength={LIMITS.use[1]}
            className={cn(input, 'h-auto min-h-36 resize-y py-3 leading-relaxed', border('useDescription'))}
            value={d.useDescription}
            onChange={(e) => set('useDescription', e.target.value)}
            onBlur={touch('useDescription')}
            placeholder="For example: Our Discord bot gives a Verified Clipper role to members who sign in with logoless. We read their handle and verified views once, store only their logoless id, and never see their email."
          />
        </Row>
      </Section>

      <Section n={4} title="Return addresses" help="Where people are sent back after they sign in. Your code must send one of these exactly.">
        <Row
          id={fid('redirectUris')}
          label="Addresses"
          help={
            <>
              Press Enter after each one. Use https:// on your real domain. http://localhost works while you develop.{d.type === 'public' && <> Phone and desktop apps can also use a scheme named after a domain you own, like com.example.app:/callback.</>}
            </>
          }
          counter={<span className="text-xs text-mute tabular-nums">{d.redirectUris.length}/{LIMITS.redirects}</span>}
        >
          <RedirectChips inputId={fid('redirectUris')} describedBy={`${fid('redirectUris')}-help`} value={d.redirectUris} type={d.type} error={err('redirectUris')} onChange={(v) => set('redirectUris', v)} onBlur={touch('redirectUris')} />
        </Row>
      </Section>

      <Section n={5} title="Your policies" help="Linked from the consent screen when you add them. We will ask for these before we check your app.">
        <div className="grid gap-6 md:grid-cols-2">
          <Row id={fid('privacyUrl')} label="Privacy policy" optional error={err('privacyUrl')}>
            <input {...aria('privacyUrl', false)} className={cn(input, border('privacyUrl'))} value={d.privacyUrl} inputMode="url" spellCheck={false} onChange={(e) => set('privacyUrl', e.target.value)} onBlur={touch('privacyUrl')} placeholder="https://example.com/privacy" />
          </Row>
          <Row id={fid('termsUrl')} label="Terms of service" optional error={err('termsUrl')}>
            <input {...aria('termsUrl', false)} className={cn(input, border('termsUrl'))} value={d.termsUrl} inputMode="url" spellCheck={false} onChange={(e) => set('termsUrl', e.target.value)} onBlur={touch('termsUrl')} placeholder="https://example.com/terms" />
          </Row>
        </div>
      </Section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-mute sm:max-w-sm">By registering you agree to ask only for what you need and to keep people&apos;s details safe.</p>
        <div className="flex flex-wrap items-center gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="h-12 px-5 text-sm text-mute hover:text-paper">
              Cancel
            </button>
          )}
          <button type="submit" disabled={busy} className="inline-flex h-12 items-center gap-2 rounded-pill bg-paper px-7 text-[15px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40">
            {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} {mode === 'create' ? 'Register the app' : 'Save changes'}
          </button>
        </div>
      </div>
      {formError && (
        <p role="alert" className="text-right text-sm text-signal">
          {formError}
        </p>
      )}
    </form>
  )
}
