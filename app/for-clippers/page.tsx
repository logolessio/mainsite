import { permanentRedirect } from 'next/navigation'

// The page is called "For creators" now. The old address keeps working.
export default function Page() {
  permanentRedirect('/for-creators')
}
