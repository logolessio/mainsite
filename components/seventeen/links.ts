import { SITE } from '@/lib/site'

/** Where 17 points outside itself: the Discord (requests, and every download that has no link yet), logoless itself and the socials. */
export const SEVENTEEN_LINKS = {
  discord: SITE.social.discord,
  main: SITE.url,
  clip: `${SITE.url}/for-clippers`,
  youtube: SITE.social.youtube,
  instagram: SITE.social.instagram,
  tiktok: SITE.social.tiktok,
  terms: `${SITE.url}/legal`,
}
