import type { Metadata } from 'next'
import { LinksEditor } from '@/components/admin/links-editor'
import { PageHeader } from '@/components/app/ui'
import { getLinks } from '@/lib/socials-db'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Socials and links | logoless', robots: { index: false } }

export default async function Page() {
  await pageAdmin()
  return (
    <>
      <PageHeader title="Socials and links" sub="Change every social account on the site in one place: the footer icons and the logoless.io/links page. Changes show straight away." />
      <LinksEditor initial={await getLinks()} />
    </>
  )
}
