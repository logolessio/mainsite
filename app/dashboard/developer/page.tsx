import type { Metadata } from 'next'
import { ActionLink } from '@/components/app/action-link'
import { EmptyState } from '@/components/app/table'
import { PageHeader } from '@/components/app/ui'
import { AppList } from '@/components/developers/dashboard'
import { requireDeveloperTools } from '@/lib/dev-dashboard'
import { appPublic, appsOf, appUsage } from '@/lib/oauth'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Developer | logoless', robots: { index: false } }

export default async function Page() {
  await requireDeveloperTools()
  const user = await pageUser()
  const apps = await Promise.all((await appsOf(user.id)).map(async (a) => ({ ...appPublic(a), usage: await appUsage(a.id) })))
  return (
    <>
      <PageHeader
        title="Developer"
        sub="Your apps that use Sign in with logoless: client ids, secrets, return addresses and how much they are used."
        actions={
          <>
            <ActionLink href="/developers" variant="ghost">
              Guide
            </ActionLink>
            {apps.length > 0 && apps.length < 10 && <ActionLink href="/dashboard/developer/new">New app</ActionLink>}
          </>
        }
      />
      {apps.length === 0 ? (
        <EmptyState icon="Code2" title="No apps yet" body="Register an app to get a client id, then add a Sign in with logoless button to your site. It takes about two minutes." action={<ActionLink href="/dashboard/developer/new">Register an app</ActionLink>} />
      ) : (
        <AppList apps={apps} />
      )}
    </>
  )
}
