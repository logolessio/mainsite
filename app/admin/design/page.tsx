import type { Metadata } from 'next'
import { ResetDesign } from '@/components/admin/reset-design'
import { Roundness } from '@/components/admin/roundness'
import { Switch } from '@/components/admin/switches'
import { Card, PageHeader } from '@/components/app/ui'
import { CoverTextDesigner, LayoutPicker } from '@/components/admin/design-choices'
import { FontPicker } from '@/components/dev/font-picker'
import { FontRoles } from '@/components/dev/font-roles'
import { parseChoices } from '@/lib/design-choices'
import { effectiveFont, fontById, ROLES, type Role } from '@/lib/fonts'
import { parseRoundness } from '@/lib/roundness'
import { allSettings } from '@/lib/settings'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Design | logoless', robots: { index: false } }

const EP = '/api/dev/settings'

const H2 = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <div className="mt-14 mb-4 first:mt-0">
    <h2 className="font-display text-3xl">{children}</h2>
    {sub && <p className="mt-1.5 max-w-2xl text-[15px] text-mute">{sub}</p>}
  </div>
)

/** How the whole site looks: how round it is, the typeface, and the looks that were taken out to keep it plain. Every change shows for everyone straight away. */
export default async function Page() {
  await pageAdmin()
  const s = await allSettings()
  const on = (k: keyof typeof s) => s[k] === '1'
  const { cover, layout } = parseChoices(s)
  return (
    <>
      <PageHeader title="Design" sub="How the whole site looks. Every change shows for everyone straight away." actions={<ResetDesign />} />

      <H2 sub="Buttons, fields, cards and pictures, all at once. The samples below follow the slider as you drag it.">Roundness</H2>
      <Roundness initial={parseRoundness(s.design_roundness)} />

      <H2 sub="One dial for each job. Turn a dial and the whole dashboard changes under it, so you can see it on real pages. Each stays as chosen until you press Use the preset.">Fonts by use</H2>
      <FontRoles
        initial={Object.fromEntries(ROLES.map((r) => [r.id, s[r.setting as keyof typeof s] ?? ''])) as Record<Role, string>}
        preset={{ body: fontById(effectiveFont(s.design_font, s.design_font_mono)).body, display: fontById(effectiveFont(s.design_font, s.design_font_mono)).display }}
      />

      <H2 sub="Gloock for headers and titles, Inter for everything else, unless you pick something else here. A preset sets every job at once; the dials above sit on top of it.">Presets</H2>
      <FontPicker current={effectiveFont(s.design_font, s.design_font_mono)} />

      <H2 sub="How the campaigns are arranged on the browse page.">Layout</H2>
      <LayoutPicker initial={layout} />

      <H2 sub="The name and the line under it on a campaign cover. Pick anything and the samples change, and it is saved for everyone.">Cover text</H2>
      <CoverTextDesigner initial={cover} />

      <H2 sub="Things that were taken out to keep the site clean. Switch any of them back on.">Everything else</H2>
      <div className="grid max-w-3xl gap-6">
        <Card title="Campaign covers">
          <ul className="divide-y divide-line">
            <Switch endpoint={EP} k="design_cover_border" label="Cover border" hint="A thin light edge around every cover." on={on('design_cover_border')} />
            <Switch endpoint={EP} k="design_cover_bar" label="Budget bar" hint="The line along the bottom of a cover showing how much of the budget is left." on={on('design_cover_bar')} />
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
