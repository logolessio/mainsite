import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { TrySignIn } from '@/components/developers/try-sign-in'
import { Breadcrumbs } from '@/components/marketing/breadcrumbs'
import { PageHero } from '@/components/marketing/page-hero'
import { PLAYGROUND_PATH, playgroundApp, playgroundOrigin } from '@/lib/dev-playground'
import { featureOn } from '@/lib/features'
import { CONTAINER } from '@/lib/layout'

export const metadata: Metadata = { title: 'Try Sign in with logoless', description: 'Run a real Sign in with logoless and see every step: the code, the tokens and who signed in.', alternates: { canonical: PLAYGROUND_PATH } }

export default async function Page() {
  await connection()
  if (!(await featureOn('developers')) || !(await featureOn('developer-tools'))) notFound()
  const h = await headers()
  const origin = playgroundOrigin(h.get('x-forwarded-host') ?? h.get('host') ?? '', h.get('x-forwarded-proto') ?? '')
  const app = await playgroundApp(origin)
  return (
    <main>
      <Breadcrumbs trail={[{ name: 'Developers', href: '/developers' }, { name: 'Try it' }]} />
      <PageHero eyebrow="Developers" title="Try it with your own account" lede="Press the button to run a real sign-in with a test app. You will see each step your app goes through, and exactly what it gets back." />
      <section className={`${CONTAINER} pb-24`}>
        <div className="mx-auto max-w-3xl rounded-card border border-line-strong p-6 md:p-10">
          <TrySignIn clientId={app.id} redirectUri={`${origin}${PLAYGROUND_PATH}`} />
        </div>
      </section>
    </main>
  )
}
