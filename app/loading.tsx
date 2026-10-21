import { PageLoader } from '@/components/ui/loader'

/** Shown the moment a public page is asked for, until it arrives, so a click always answers at once instead of the page seeming to freeze. */
export default function Loading() {
  return (
    <main className="pt-28">
      <PageLoader />
    </main>
  )
}
