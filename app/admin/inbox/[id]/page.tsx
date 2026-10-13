import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { InquiryThread } from '@/components/marketing/inquiry-thread'
import { SeenPing } from '@/components/admin/seen-ping'
import { getInquiry } from '@/lib/inquiries'
import { TOPIC_LABEL } from '@/lib/inquiry-topics'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Conversation | logoless', robots: { index: false } }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await pageAdmin()
  const { id } = await params
  const inq = await getInquiry(id)
  if (!inq) notFound()
  return (
    <>
      <p className="mb-6 text-sm text-mute">
        <Link href="/admin/inbox" className="underline underline-offset-4 hover:text-paper">
          Inbox
        </Link>{' '}
        / {TOPIC_LABEL[`${inq.kind}:${inq.topic}`] ?? inq.kind}
      </p>
      <div className="grid max-w-3xl gap-6">
        <p className="text-sm text-mute">
          From {inq.name}
          {inq.handle ? ` (@${inq.handle})` : ' (not signed in, they hold a private link)'}
          {inq.handle && (
            <>
              {' · '}
              <Link href={`/@${inq.handle}`} className="underline underline-offset-4 hover:text-paper">
                their profile
              </Link>
            </>
          )}
        </p>
        <InquiryThread id={inq.id} admin who={inq.name} subject={inq.subject} first={inq.message} firstAt={inq.at} target={inq.target} initial={inq.replies} status={inq.status} />
      </div>
      <SeenPing id={inq.id} seen={inq.adminSeen} />
    </>
  )
}
