import type { Metadata } from 'next'
import { Switch } from '@/components/admin/switches'
import { Card, PageHeader } from '@/components/app/ui'
import { FontPicker } from '@/components/dev/font-picker'
import { effectiveFont } from '@/lib/fonts'
import { allSettings } from '@/lib/settings'
import { pageDev } from '@/lib/user'

export const metadata: Metadata = { title: 'Design | logoless', robots: { index: false } }

const EP = '/api/dev/settings'

/** Every look that was taken out to keep the site plain. Each one can be brought back here, and the change shows up straight away. */
export default async function Page() {
  await pageDev()
  const s = await allSettings()
  const on = (k: keyof typeof s) => s[k] === '1'
  return (
    <>
      <PageHeader title="Design" sub="Everything that was taken out to keep the site clean lives here. Switch any of it back on and it shows up for everyone straight away." />
      <h2 className="mb-4 font-display text-3xl tracking-[-0.03em]">Typeface</h2>
      <FontPicker current={effectiveFont(s.design_font, s.design_font_mono)} />

      <h2 className="mt-16 mb-4 font-display text-3xl tracking-[-0.03em]">Everything else</h2>
      <div className="grid max-w-3xl gap-6">
        <Card title="Campaign covers">
          <ul className="divide-y divide-line">
            <Switch endpoint={EP} k="design_cover_zoom" label="Zoom on hover" hint="The cover image grows inside its frame when you hover it. Off: the cover stays still and only tilts." on={on('design_cover_zoom')} />
            <Switch endpoint={EP} k="design_cover_border" label="Cover border" hint="A thin light edge around every cover." on={on('design_cover_border')} />
            <Switch endpoint={EP} k="design_cover_bar" label="Budget bar" hint="The line along the bottom of a cover showing how much of the budget is left." on={on('design_cover_bar')} />
            <Switch endpoint={EP} k="design_cover_info" label="Rate, creator and open cue" hint="Extra text on the cover. Off: only the campaign name and the play button." on={on('design_cover_info')} />
          </ul>
        </Card>
        <Card title="Motion">
          <ul className="divide-y divide-line">
            <Switch endpoint={EP} k="design_scroll_effects" label="Scroll effects" hint="Sections fade, slide and reveal word by word as you scroll. Off: everything is simply there." on={on('design_scroll_effects')} />
            <Switch endpoint={EP} k="design_liquid_loader" label="Liquid fill on the onboarding loader" hint="A white liquid rises behind the setting-up screen. Off: just the ring and the text." on={on('design_liquid_loader')} />
          </ul>
        </Card>
        <Card title="Background">
          <ul className="divide-y divide-line">
            <Switch endpoint={EP} k="bg_dots" label="Dot landscape" hint="The rolling field of dots behind the site. Off: the moving gradient and faint grid are shown instead." on={on('bg_dots')} />
          </ul>
        </Card>
      </div>
    </>
  )
}
