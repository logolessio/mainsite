import { redirect } from 'next/navigation'

// The overview is the front page of the brand dashboard now.
export default function Page() {
  redirect('/brand')
}
