import type { Metadata } from 'next'
import { Switch } from '@/components/admin/switches'
import { SectionTabs } from '@/components/app/section-tabs'
import { Card, PageHeader } from '@/components/app/ui'
import { allSettings } from '@/lib/settings'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Design | logoless', robots: { index: false } }

/** Looks that were switched off to keep the site plain. Each one can be brought back here, and the change shows up straight away. */
export default async function Page() {
  await pageAdmin()
  const s = await allSettings()
  return (
    <>
      <SectionTabs group="system" />
      <PageHeader title="Design" sub="Things that were taken out to keep the site clean. Switch any of them back on." />
      <div className="grid max-w-3xl gap-6">
        <Card title="Background">
          <ul className="divide-y divide-line">
            <Switch k="bg_dots" label="Dot landscape" hint="The rolling field of dots behind the site. Off by default: the moving gradient and faint grid are shown instead." on={s.bg_dots === '1'} />
          </ul>
        </Card>
        <Card title="Campaign covers">
          <ul className="divide-y divide-line">
            <Switch k="design_cover_effects" label="Tilt, shine and zoom" hint="Covers lean towards the cursor, catch a moving highlight and drift inside their frame. Off: one simple zoom on hover." on={s.design_cover_effects === '1'} />
            <Switch k="design_cover_border" label="Cover border" hint="A thin light edge around every cover." on={s.design_cover_border === '1'} />
          </ul>
        </Card>
      </div>
    </>
  )
}
