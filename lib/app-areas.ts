/** The working areas that keep their sidebar and bars in place while only the page changes. */
const AREAS = ['dashboard', 'brand', 'admin', 'owner', 'dev']

/** 'dashboard', 'owner' and so on for a path inside a working area, otherwise null. */
export function appArea(path: string): string | null {
  const first = path.split(/[?#]/)[0].split('/')[1] ?? ''
  return AREAS.includes(first) ? first : null
}
