import type { Metadata } from 'next'
import { HelpView } from '@/components/site/help'
import { PageHead, SiteFrame } from '@/components/site/site-frame'

export const metadata: Metadata = { title: 'Help & guides | logoless', description: 'Guides for every part of the logoless editor: links, the look, music, lyrics, sharing and storage. Plus shortcuts and answers.' }

export default function Page() {
  return (
    <SiteFrame current="/help">
      <PageHead kicker="help" title="guides" lead="everything the editor can do, step by step. search it, or start at the top." />
      <HelpView />
    </SiteFrame>
  )
}
