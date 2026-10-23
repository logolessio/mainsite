import { BANNER, BAR, item, pbtn, plink, prow } from './look'
import { ic } from './ui'
import { container, gallery, section, sep, text, thumb, v2 } from './v2'

/**
 * The messages for someone who has just signed up (pure data: nothing here reads the database, so the dashboard's preview can use it too). The sending is in
 * prelaunch.ts.
 */
export type Who = { name: string; handle: string | null; discordId: string | null; n: number; founding: boolean }

/** The welcome that goes up in the welcome channel: the gradient banner, the person's Discord picture, who they are and their status. */
export function welcomeCard(w: Who & { avatar: string; at: number }) {
  const status = w.founding
    ? `${ic('founder')} **Founding member #${w.n}**\n-# Here before the doors opened.`
    : `${ic('verified')} **Verified member #${w.n}**\n-# Joined ${`<t:${w.at}:D>`}.`
  return v2(
    container(
      0x8647ff,
      gallery({ url: BANNER }),
      section([`## Welcome, ${w.name}`, `${w.discordId ? `<@${w.discordId}>` : ''}${w.handle ? ` · @${w.handle}` : ''}`.replace(/^ · /, ''), status], thumb(w.avatar, `${w.name}'s Discord picture`)),
      sep(),
      text(`-# Say hello in the chat, link your TikTok, YouTube or Instagram with /verify, and keep an eye on the announcements: campaigns start here first.`),
      gallery({ url: BAR }),
    ),
  )
}

/** The direct message: welcome, whether they are a founding member, and what to do next. `note` is the "not live yet" line while the site is shut. */
export function welcomeDmMessage(w: Who, url: string | null, note: string | null) {
  return v2(
    container(
      0x8647ff,
      gallery({ url: BANNER }),
      text(`# ${ic('hand')} Welcome to logoless, ${w.name}\n-# You are verified: the whole server is open to you.`),
      sep(),
      text(
        w.founding
          ? item('founder', `You are founding member #${w.n}`, 'You signed up before we opened, so you are one of the people who made this place. That status stays with your account for good, and you will be first in line when the first campaigns go live.')
          : item('verified', 'You are verified', 'Founding membership closed when the site opened, but you are a full member, with the same access to every campaign.'),
      ),
      sep(),
      text(item('link', 'Next: link your accounts', 'Prove your TikTok, YouTube or Instagram with a code in your bio (use /verify in the server). Verified creators are picked first for campaigns.')),
      ...(note ? [text(`> ${note}`)] : []),
      gallery({ url: BAR }),
      prow(...(url ? [plink('Open the server', url, 'door')] : []), pbtn('Link an account', 'acct:link', 'green', 'link')),
    ),
  )
}

/** The short, kind message for a sign-up the team turned down. */
export const rejectionMessage = () =>
  v2(container(0x8647ff, text('# We could not confirm your sign-up\n-# The rest of the server stays closed for now.'), sep(), text('If that is a mistake, open a ticket in #get-started or reply here and we will take another look.'), gallery({ url: BAR })))
