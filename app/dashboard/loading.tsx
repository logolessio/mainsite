import { DashLoader } from '@/components/ui/loader'

/** Shown inside the dashboard (its sidebar and bars stay) the moment another page of it is asked for, until that page arrives. */
export default function Loading() {
  return <DashLoader />
}
