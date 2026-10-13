// UI placeholder data. Replace with your database (budgets, rates and dates are not real).
export type Platform = 'tiktok' | 'youtube' | 'instagram'

export type Campaign = {
  id: string
  title: string
  creator: string
  type: string
  cover: string
  /** 15-30s audio preview. Placeholder files in /public/previews, replace with real previews. */
  previewUrl: string
  platforms: Platform[]
  ratePer1k: number
  budget: number
  endsOn: string
  summary: string
  clipThis: string[]
  offLimits: string[]
}

export const campaigns: Campaign[] = [
  {
    id: 'red-room',
    title: 'Red Room',
    creator: 'KXNG VALE',
    type: 'Music · Single',
    cover: '/covers/01.jpg',
    previewUrl: '/previews/01.mp3',
    platforms: ['tiktok', 'instagram', 'youtube'],
    ratePer1k: 3,
    budget: 50000,
    endsOn: 'Oct 30',
    summary:
      'New single out Friday. We want the hook in front of as many people as possible: clip the performance video, the studio session, or use the track under your own edits.',
    clipThis: [
      'The chorus drop at 0:42 is the moment',
      'Studio session footage from the drive folder',
      'Your own edits using the official audio',
    ],
    offLimits: [
      'Re-uploads of the full music video',
      'Sped-up or pitched versions of the track',
      'Anything referencing other artists by name',
    ],
  },
  {
    id: 'mercury',
    title: 'Mercury',
    creator: 'Hollow Form',
    type: 'Music · Album',
    cover: '/covers/02.jpg',
    previewUrl: '/previews/02.mp3',
    platforms: ['tiktok', 'youtube'],
    ratePer1k: 2.5,
    budget: 30000,
    endsOn: 'Nov 12',
    summary:
      'A 10-track electronic album. Pick your favourite track and build a visual around it. Slow, heavy, cinematic edits perform best.',
    clipThis: [
      'Any track from the album, full or looped',
      'Visualizer footage supplied in the brief pack',
      'Reaction or first-listen formats',
    ],
    offLimits: ['Tracks under 5 seconds', 'Brand logos in frame', 'AI voice-overs'],
  },
  {
    id: 'late-shift',
    title: 'Late Shift',
    creator: 'Dex Marlow',
    type: 'Streamer · Highlights',
    cover: '/covers/03.jpg',
    previewUrl: '/previews/03.mp3',
    platforms: ['tiktok', 'youtube', 'instagram'],
    ratePer1k: 1.8,
    budget: 24000,
    endsOn: 'Oct 15',
    summary:
      'Dex streams five nights a week. Find the moments (rage quits, clutch plays, the chat going wild) and cut them tight.',
    clipThis: [
      'Clutch plays and fails from any VOD this month',
      'Funny chat interactions with captions',
      'Vertical crops with facecam on top',
    ],
    offLimits: [
      'Clips older than 30 days',
      'Sponsor segments',
      'Anything from private Discord calls',
    ],
  },
  {
    id: 'blur',
    title: 'Blur',
    creator: 'Noa Reyes',
    type: 'Music · Single',
    cover: '/covers/04.jpg',
    previewUrl: '/previews/04.mp3',
    platforms: ['tiktok', 'instagram'],
    ratePer1k: 3.5,
    budget: 40000,
    endsOn: 'Nov 20',
    summary:
      'An intimate vocal-led single. The bridge is the hook. Emotional, personal edits over the track are what we are after.',
    clipThis: [
      'Personal story edits using the bridge',
      'Lyric-on-screen formats',
      'Behind-the-scenes from the acoustic session',
    ],
    offLimits: ['Comedic or meme formats', 'Covers of the song', 'Paid promotion of other products'],
  },
  {
    id: 'concrete',
    title: 'Concrete',
    creator: 'Parkline Skate Co.',
    type: 'Brand · Launch',
    cover: '/covers/05.jpg',
    previewUrl: '/previews/05.mp3',
    platforms: ['tiktok', 'instagram', 'youtube'],
    ratePer1k: 2,
    budget: 20000,
    endsOn: 'Dec 01',
    summary:
      'Our new deck line drops this month. Clip the team edit, or film your own session with a Parkline deck in shot.',
    clipThis: [
      'Tricks from the official team edit',
      'Your own skate footage with the deck visible',
      'Slow-motion landings',
    ],
    offLimits: ['Competitor brands in frame', 'Unsafe street stunts', 'Music without a licence'],
  },
  {
    id: 'tail-lights',
    title: 'Tail Lights',
    creator: 'SLOWBURN',
    type: 'Music · EP',
    cover: '/covers/06.jpg',
    previewUrl: '/previews/06.mp3',
    platforms: ['tiktok', 'youtube'],
    ratePer1k: 2.8,
    budget: 35000,
    endsOn: 'Oct 22',
    summary:
      'Night-drive phonk EP. Car edits, city at night, speed. Keep it moody and keep the audio loud.',
    clipThis: ['Night driving edits', 'Car meet footage', 'The drop at 1:10 on track two'],
    offLimits: ['Illegal driving on public roads', 'Licence plates visible', 'Other phonk tracks'],
  },
  {
    id: 'off-mic',
    title: 'Off Mic',
    creator: 'The Nothing Pod',
    type: 'Podcast · Episodes',
    cover: '/covers/07.jpg',
    previewUrl: '/previews/07.mp3',
    platforms: ['tiktok', 'youtube', 'instagram'],
    ratePer1k: 1.5,
    budget: 15000,
    endsOn: 'Nov 05',
    summary:
      'Weekly conversation podcast. Pull the best 30–60 second takes, caption them well and let the argument carry it.',
    clipThis: [
      'Hot takes and heated moments',
      'Guest stories with a clear payoff',
      'Burned-in captions, always',
    ],
    offLimits: ['Out-of-context edits that change meaning', 'Clips over 90 seconds', 'Ad reads'],
  },
  {
    id: 'one-beam',
    title: 'One Beam',
    creator: 'Arca Fields',
    type: 'Music · Tour',
    cover: '/covers/08.jpg',
    previewUrl: '/previews/08.mp3',
    platforms: ['tiktok', 'instagram'],
    ratePer1k: 2.2,
    budget: 28000,
    endsOn: 'Nov 28',
    summary:
      'The tour is live. Clip crowd footage, fan-shot moments and the opening light cue. Make people wish they were there.',
    clipThis: ['Crowd shots from any date', 'The opening light cue', 'Fan reactions after the show'],
    offLimits: ['Full songs longer than 60s', 'Footage from the VIP area', 'Ticket resale links'],
  },
  {
    id: 'round-nine',
    title: 'Round Nine',
    creator: 'IRONWILL Fight Club',
    type: 'Sport · Fight Night',
    cover: '/covers/09.jpg',
    previewUrl: '/previews/09.mp3',
    platforms: ['tiktok', 'youtube', 'instagram'],
    ratePer1k: 2.4,
    budget: 45000,
    endsOn: 'Oct 10',
    summary:
      'Fight night hype. Training camp, face-offs and the walkouts. Build tension. The fight itself is off-limits until after the event.',
    clipThis: ['Training camp footage', 'Press conference face-offs', 'Walkout entrances'],
    offLimits: ['Fight footage before the event airs', 'Betting references', 'Injury close-ups'],
  },
  {
    id: 'wax',
    title: 'Wax',
    creator: 'Juno Park',
    type: 'Music · Album',
    cover: '/covers/10.jpg',
    previewUrl: '/previews/10.mp3',
    platforms: ['tiktok', 'youtube'],
    ratePer1k: 3.2,
    budget: 32000,
    endsOn: 'Dec 14',
    summary:
      'A warm, strange debut record. Art-school energy. Surreal visuals, textures and slow edits sit best with the sound.',
    clipThis: ['Any album track under your own visuals', 'Vinyl unboxing', 'Stop-motion or collage formats'],
    offLimits: ['Low-effort lyric slideshows', 'Stolen artwork', 'Sped-up audio'],
  },
]

export function getCampaign(id: string) {
  return campaigns.find((c) => c.id === id)
}

export const usd = (n: number, digits = 0) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })

export const compact = (n: number) =>
  n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })
