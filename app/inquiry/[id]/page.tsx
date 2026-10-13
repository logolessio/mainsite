import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Breadcrumbs } from '@/components/marketing/breadcrumbs'
import { InquiryThread } from '@/components/marketing/inquiry-thread'
import { db } from '@/lib/db'
import { getInquiry, mayView } from '@/lib/inquiries'
import { CONTAINER } from '@/lib/layout'
import { getSession } from '@/lib/session'

export const metadata: Metadata = { title: 'Your conversation | logoless', robots: { index: false, follow: false } }

/** One message or report and its replies. Open to the person who sent it (signed in, or with the private link) and to admins. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  await connection()
  const { id } = await params
  const { t } = await searchParams
  const inq = await getInquiry(id)
  if (!inq) notFound()
  const session = await getSession()
  let userId: string | null = null
  if (session?.user?.email) {
    const d = await db()
    userId = (await d.prepare('SELECT id FROM users WHERE email = ?1').bind(session.user.email.toLowerCase()).first<{ id: string }>())?.id ?? null
  }
  if (!mayView(inq, { userId, admin: session?.user?.role === 'admin' }, t)) notFound()
  return (
    <main>
      <Breadcrumbs trail={[{ name: inq.kind === 'report' ? 'Report' : 'Contact', href: inq.kind === 'report' ? '/report' : '/contact' }, { name: 'Conversation' }]} />
      <section className={`${CONTAINER} max-w-3xl pt-8 pb-28 md:pt-14`}>
        <InquiryThread id={inq.id} token={t} subject={inq.subject} first={inq.message} firstAt={inq.at} target={inq.target} initial={inq.replies} status={inq.status} />
        {!userId && <p className="mt-10 text-sm leading-relaxed text-mute">You are not signed in, so this page is only reachable with the link you were given. Keep it somewhere safe.</p>}
      </section>
    </main>
  )
}
