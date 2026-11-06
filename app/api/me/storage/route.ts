import { json, route } from '@/lib/http'
import { USER_QUOTA_BYTES, storageUsed } from '@/lib/quota'
import { requireUser } from '@/lib/user'

/** How much of their 50 MB a person has used, and on what. */
export const GET = route(async () => {
  const user = await requireUser()
  const used = await storageUsed(user.id)
  const k = (...kinds: string[]) => kinds.reduce((a, x) => ({ n: a.n + (used.byKind[x]?.n ?? 0), bytes: a.bytes + (used.byKind[x]?.bytes ?? 0) }), { n: 0, bytes: 0 })
  return json({
    quotaBytes: USER_QUOTA_BYTES,
    usedBytes: used.bytes,
    parts: { files: k('file'), pictures: k('avatar', 'banner', 'background', 'cover'), videos: k('bgvideo'), cursors: k('cursor'), songs: k('audio') },
  })
})
