import type { Metadata } from 'next'
import '@/components/editor/editor.css'
import { NotFoundView } from '@/components/shell/not-found-view'

export const metadata: Metadata = { title: 'Page not found | logoless', robots: { index: false } }

export default function NotFound() {
  return <NotFoundView />
}
