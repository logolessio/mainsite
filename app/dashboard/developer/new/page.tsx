import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AppForm } from '@/components/developers/app-form'
import { requireDeveloperTools } from '@/lib/dev-dashboard'
import { appsOf } from '@/lib/oauth'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Register an app | logoless', robots: { index: false } }

export default async function Page() {
  await requireDeveloperTools()
  const user = await pageUser()
  if ((await appsOf(user.id)).length >= 10) redirect('/dashboard/developer')
  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-8">
        <a href="/dashboard/developer" className="text-sm text-mute hover:text-paper">
          ← Developer
        </a>
        <h1 className="mt-4 font-display text-4xl leading-[1] tracking-[-0.035em] md:text-[3.2rem]">Register an app</h1>
        <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-paper/55">Five short sections. You get a client id straight away, and a secret if your app has a server.</p>
      </header>
      <AppForm mode="create" />
    </div>
  )
}
