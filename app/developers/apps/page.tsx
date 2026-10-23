import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import { AppManager } from '@/components/developers/app-manager'
import { Breadcrumbs } from '@/components/marketing/breadcrumbs'
import { PageHero } from '@/components/marketing/page-hero'
import { featureOn } from '@/lib/features'
import { CONTAINER } from '@/lib/layout'
import { getSession } from '@/lib/session'

export const metadata: Metadata = { title: 'Your apps | logoless', robots: { index: false } }

export default async function Page() {
  await connection()
  if (!(await featureOn('developers'))) notFound()
  // with the developer tools on, apps live in the Developer section of the dashboard
  if (await featureOn('developer-tools')) redirect('/dashboard/developer')
  if (!(await getSession())?.user?.email) redirect('/login?next=/developers/apps')
  return (
    <main>
      <Breadcrumbs trail={[{ name: 'Developers', href: '/developers' }, { name: 'Your apps' }]} />
      <PageHero eyebrow="Developers" badges={{ solid: { href: '/developers', top: 'Read', bottom: 'The guide' }, outline: { href: '/developers/try', label: 'Try it' } }} title="Your apps" lede="Register an app to get a client id, then add Sign in with logoless to it. The guide is on the Developers page." />
      <div className={`${CONTAINER} pb-24`}>
        <AppManager />
      </div>
    </main>
  )
}
