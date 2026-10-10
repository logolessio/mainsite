import type { Metadata } from 'next'

import { ActionLink } from '@/components/app/action-link'
import { SubmissionsTable } from '@/components/app/submissions-table'
import { PageHeader } from '@/components/app/ui'
import { EmptyState } from '@/components/app/table'

export const metadata: Metadata = { title: 'My clips — logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <PageHeader title="My clips" sub="Every clip you have submitted and where it stands." actions={<ActionLink href="/">Submit a clip</ActionLink>} />
      <SubmissionsTable
        // TODO(backend): load the signed-in clipper's submissions.
        rows={[]}
        empty={<EmptyState icon="Clapperboard" title="Nothing submitted" body="Clips you submit to campaigns will appear here with their review status." />}
      />
    </>
  )
}
