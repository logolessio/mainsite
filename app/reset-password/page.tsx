import type { Metadata } from 'next'
import { ResetForm } from '@/components/auth/reset-form'

export const metadata: Metadata = { title: 'Choose a new password — logoless' }

export default function Page() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 pt-28 pb-16">
      <ResetForm />
    </main>
  )
}
