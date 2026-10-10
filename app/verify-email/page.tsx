import type { Metadata } from 'next'
import { Mail } from 'lucide-react'
import { PillLink } from '@/components/motion/cta'

export const metadata: Metadata = { title: 'Verify your email — logoless' }

export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string; role?: string }> }) {
  const { email, role } = await searchParams
  return (
    <main className="grid min-h-dvh place-items-center px-5 pt-28 pb-16">
      <div className="w-full max-w-[440px] border border-line bg-surface/80 p-9 text-center rounded-2xl">
        <Mail aria-hidden="true" className="mx-auto size-8 text-mute" />
        <h1 className="mt-6 font-display text-5xl leading-none">check your inbox</h1>
        <p className="mt-4 text-sm leading-relaxed text-mute">
          We sent a confirmation link{email ? ` to ${email}` : ''}. Open it to finish creating your account.
        </p>
        <div className="mt-8 flex justify-center">
          {/* Preview shortcut. TODO(backend): remove; this page should be reached only until the email is verified. */}
          <PillLink href={role === 'brand' ? '/brand' : '/onboarding'} variant="ghost">
            Continue to setup
          </PillLink>
        </div>
      </div>
    </main>
  )
}
