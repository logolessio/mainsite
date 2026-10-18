/**
 * Pages are not wrapped in anything that animates. A wrapper that starts at zero opacity is invisible in the server's HTML until
 * the page has woken up, which looks like a flicker. Page changes are cross-faded by the browser instead (see
 * components/shell/transition-provider.tsx), and every page is already fully visible when it arrives.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
