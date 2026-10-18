import { redirect } from 'next/navigation'

/** Design is part of Site now (the owner dashboard's Site, Design). */
export default function Page() {
  redirect('/admin/design')
}
