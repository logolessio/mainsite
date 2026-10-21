import { db } from '@/lib/db'
import { parseEnds } from '@/lib/ends'
import { featureOn } from '@/lib/features'
import { HttpError, route } from '@/lib/http'
import { SITE } from '@/lib/site'
import { requireUser } from '@/lib/user'

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const ymd = (t: number) => new Date(t * 1000).toISOString().slice(0, 10).replace(/-/g, '')

/** A calendar file with the end date of every campaign you saved, so the deadline is in your own calendar. */
export const GET = route(async () => {
  if (!(await featureOn('calendar-feed'))) throw new HttpError(404, 'Not found.')
  const user = await requireUser()
  const d = await db()
  const rows = (await d.prepare("SELECT c.id, c.title, c.creator, c.ends_on FROM favorites f JOIN campaigns c ON c.id = f.campaign_id WHERE f.user_id = ?1 AND c.status IN ('live','paused') ORDER BY c.created_at DESC").bind(user.id).all<{ id: string; title: string; creator: string; ends_on: string | null }>()).results
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  const events = rows
    .map((r) => ({ r, end: parseEnds(r.ends_on) }))
    .filter((x) => x.end !== null)
    .map(({ r, end }) => `BEGIN:VEVENT\r\nUID:${r.id}@logoless.io\r\nDTSTAMP:${stamp}\r\nDTSTART;VALUE=DATE:${ymd(end as number)}\r\nSUMMARY:${esc(`Ends: ${r.title} (${r.creator})`)}\r\nDESCRIPTION:${esc(`Post before it closes. ${SITE.url}/campaign/${r.id}`)}\r\nURL:${SITE.url}/campaign/${r.id}\r\nEND:VEVENT`)
  const body = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//logoless//saved campaigns//EN\r\nCALSCALE:GREGORIAN\r\nX-WR-CALNAME:logoless: saved campaigns\r\n${events.join('\r\n')}${events.length ? '\r\n' : ''}END:VCALENDAR\r\n`
  return new Response(body, { headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': 'attachment; filename="logoless-saved-campaigns.ics"', 'cache-control': 'no-store' } })
})
