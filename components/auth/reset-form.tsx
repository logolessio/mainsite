'use client'

import { useState } from 'react'
import { TransitionLink } from '@/components/shell/transition-link'
import { Field, Input, PrimaryButton } from '@/components/ui/fields'
import { resetPassword } from '@/lib/auth'

export function ResetForm() {
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  return (
    <div className="w-full max-w-[440px] border border-line bg-surface/80 p-7 md:p-9 rounded-2xl">
      <h1 className="font-display text-5xl leading-none">new password</h1>
      {done ? (
        <div role="status" className="mt-8 text-sm text-mute">
          <p>Your password has been updated.</p>
          <TransitionLink href="/login" className="mt-4 inline-block text-paper underline underline-offset-4">
            Log in
          </TransitionLink>
        </div>
      ) : (
        <form
          className="mt-8 grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            if (f.get('password') !== f.get('confirm')) return setError('Passwords do not match.')
            const token = new URLSearchParams(window.location.search).get('token') ?? ''
            await resetPassword(token, String(f.get('password')))
            setDone(true)
          }}
        >
          <Field label="New password" hint="At least 8 characters.">
            <Input required minLength={8} type="password" name="password" autoComplete="new-password" />
          </Field>
          <Field label="Confirm password">
            <Input required minLength={8} type="password" name="confirm" autoComplete="new-password" />
          </Field>
          <PrimaryButton type="submit">Update password</PrimaryButton>
          <p role="alert" className="min-h-5 text-xs text-signal">
            {error}
          </p>
        </form>
      )}
    </div>
  )
}
