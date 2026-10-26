import data from './videos.json'

/*
 * yt.logoless.io: the plan for the Side Effects channel. The videos and the idea bank come from the production kit
 * (faceless-channel/, `python3 tools/channel.py site` writes videos.json); the strategy and the brand below are written here.
 */

export type Scene = { n: number; motion: string; shot: string; text: string; start: number | null }
export type Video = (typeof data.videos)[number]
export type Idea = (typeof data.ideas)[number]

export const STYLE_PREFIX = data.stylePrefix
export const VOICE = data.voice
export const VIDEOS: Video[] = data.videos
export const IDEAS: Idea[] = data.ideas

export const CHANNEL = {
  name: 'Side Effects.',
  handles: ['@sideeffects.films', '@sideeffectsanimated'],
  backups: ['The Catch.', 'Fine Print.', 'Hidden Cost.', 'What It Does To You.'],
  tagline: 'Animated short films about what everyday habits actually cost you.',
  description:
    'Animated short films about the side effects of everyday things: your phone, your habits, what you eat, drink and scroll. Honest, simple, no fearmongering. New film every 2 days.',
  goal: '$10k / month',
}

export const NEXT_STEPS = [
  { id: 'eleven-plan', title: 'Upgrade ElevenLabs to Starter or Creator', detail: 'The free plan has no commercial licence, and its 10,000 credits ran out before video 003. Creator ($22) covers about 15 videos a month.' },
  { id: 'eleven-key', title: 'Make a new ElevenLabs key and delete the old one', detail: 'The old key was pasted into a chat. Put the new one in faceless-channel/.env (it is git-ignored).' },
  { id: 'handles', title: 'Claim the name everywhere', detail: 'Check that “Side Effects.” is free on YouTube, TikTok and Instagram and take all three the same day.' },
  { id: 'milo', title: 'Generate Milo’s reference image', detail: 'Use the reference sheet prompt in Brand. Save the best one as brand/milo-reference.png. Every other image uses it.' },
  { id: 'images-001', title: 'Generate the 40 images for video 001', detail: 'Copy all prompts from the video card, save them as images/01.png to images/40.png.' },
  { id: 'music', title: 'Pick a music track', detail: 'YouTube Audio Library: something slow, piano or ambient, safe for monetization.' },
  { id: 'publish-001', title: 'Render, make the thumbnail and upload video 001', detail: 'render, then thumb, then upload with the title, description, tags and captions.srt from its card.' },
  { id: 'voice-003', title: 'Make the voiceover for video 003', detail: 'Once the plan is upgraded: python3 tools/channel.py voice videos/003-energy-drinks' },
  { id: 'fact-check', title: 'Tick every fact-check before you publish', detail: 'Each video card has its list. The vaping video needs the most care.' },
  { id: 'shorts', title: 'Cut one Short from every video', detail: 'Each card names the scenes to use. Same art, cropped to 9:16.' },
]

export const RPM_ROWS = [
  { rpm: 4, views: '2.5M', perVideo: '~167k' },
  { rpm: 6, views: '1.7M', perVideo: '~111k' },
  { rpm: 8, views: '1.25M', perVideo: '~83k' },
]

export const TIMELINE = [
  { when: 'Months 1–2', what: '15 to 30 videos, mostly hundreds to low thousands of views each. Normal: YouTube is still learning who the audience is.' },
  { when: 'Months 2–4', what: 'One video pops (50k to 1M) and pulls the channel up with it.' },
  { when: 'Monetization', what: '1,000 subscribers plus 4,000 watch hours in 12 months (or 10M Shorts views in 90 days).' },
  { when: '$10k / month', what: 'Usually comes from 2 to 4 videos doing big numbers, not every video doing well.' },
]

export const EXTRA_MONEY = [
  { title: 'Sponsors', text: 'Screen-time and quit-habit apps (Opal, one sec, Brick, Quit Genius, sleep apps) fit perfectly. One $1,500–5,000 integration can match all your ad revenue. Start around 20k subscribers.' },
  { title: 'Community or product', text: 'Day One links a Skool community. A “30-day reset” challenge fits this channel.' },
  { title: 'Shorts', text: 'Feed the long videos. They pay almost nothing directly.' },
]

export const POSTING = [
  { label: 'Long-form', text: 'One video every 2 days (~15 a month), 2:30 to 4:30 long. A missed day beats a sloppy video.' },
  { label: 'Shorts', text: 'The best 30–50 seconds of each long video, cropped to 9:16.' },
  { label: 'Upload time', text: 'Around 2–4 PM US Eastern, so it is warm by the US evening.' },
  { label: 'First 10', text: 'The ⭐ ideas: the most searchable, widest-audience, ad-safe topics.' },
]

export const RULES = [
  { title: 'Inauthentic content (July 2025)', text: 'YouTube demonetizes mass-produced, templated AI content. Safe: original stories, one consistent original character, varied structure, a human checking every script, image and cut.' },
  { title: 'AI voice is allowed', text: 'Cartoon animation does not need the “altered or synthetic content” label. Tick it only if a video shows realistic people or events.' },
  { title: 'Commercial licence', text: 'ElevenLabs must be on a paid plan (Starter or above) before the videos earn anything.' },
  { title: 'Health claims must be true', text: 'YouTube’s medical misinformation policy applies. Every video ships with a fact-check list: tick it before publishing.' },
  { title: 'Don’t clone Day One Films', text: 'Milo, the orange hoodie, the colours and the thumbnail font are your own. Copying their character gets you reported.' },
  { title: 'Topics that limit ads', text: 'Porn and sex, drugs beyond vaping and alcohol, self-harm, graphic content. They get “limited ads”: keep them rare (🟡 in the idea bank).' },
]

export const TOOLS = [
  { job: 'Voice', tool: 'ElevenLabs, voice “Adam” (already wired into the kit)', cost: '$5–22/mo' },
  { job: 'Images', tool: 'Midjourney (best consistency with --oref) or ChatGPT image generation with Milo attached', cost: '$10–30/mo' },
  { job: 'Motion (optional)', tool: 'Kling, Hailuo or Runway image-to-video for 2–4 hero shots per video', cost: '$10–30/mo' },
  { job: 'Animation', tool: 'tools/channel.py render: camera moves, timing to the word, music', cost: 'Free' },
  { job: 'Thumbnails', tool: 'tools/channel.py thumb', cost: 'Free' },
  { job: 'Music', tool: 'YouTube Audio Library', cost: 'Free' },
  { job: 'Touch-ups', tool: 'CapCut (sound effects, shake hits)', cost: 'Free' },
]

export const WORKFLOW = [
  { title: 'Script', text: 'Pick an idea. Claude writes script.md and package.md (title, description, tags, thumbnail, fact-checks).', cmd: null },
  { title: 'Voiceover', text: 'Adam reads it. You get voiceover.mp3, the exact time of every scene and captions.srt.', cmd: 'python3 tools/channel.py voice videos/<id>' },
  { title: 'Image prompts', text: 'One prompt per scene, with the Milo style already in it.', cmd: 'python3 tools/channel.py prompts videos/<id>' },
  { title: 'Images', text: 'Generate each one and save it as images/01.png, 02.png and so on. Missing ones fall back to storyboard frames.', cmd: null },
  { title: 'Render', text: 'Every image gets its camera move and lands on its word. Add --draft for a quick 720p preview.', cmd: 'python3 tools/channel.py render videos/<id> --music track.mp3' },
  { title: 'Thumbnail', text: 'Generate thumb-bg.png from the card’s prompt, then add the words.', cmd: 'python3 tools/channel.py thumb videos/<id>' },
  { title: 'Upload', text: 'Paste the title, description and tags, upload captions.srt, add an end screen, pin the comment.', cmd: null },
  { title: 'Update this page', text: 'Copies every video, its status, thumbnail and voiceover here.', cmd: 'python3 tools/channel.py site' },
]

export const MOTIONS = ['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'pan_up', 'pan_down', 'shake', 'static']

export const BRAND = {
  milo: [
    'Small cartoon guy, big round pale head, one curly strand of hair on top',
    'Huge expressive eyes, often with tired dark eye bags',
    'Oversized burnt-orange hoodie: the brand colour, in every shot',
    'Thick black outlines, soft shading, simple body, stubby hands',
    'Exaggerated emotions: sweat drops, red tired eyes, a tiny smile when things get better',
  ],
  referencePrompt:
    'Character reference sheet of an original cartoon character named Milo: a small simple guy with a big round pale head, one single curly strand of hair on top, large expressive eyes with slightly tired dark eye bags, small mouth, wearing an oversized burnt-orange hoodie with the hood down, stubby hands, thick clean black outlines, soft cel shading. Front view, three-quarter view, side view, plus 4 facial expressions (worried, exhausted, determined, small calm smile). Plain dark charcoal background, consistent proportions, 2D animated short film style.',
  colors: [
    { name: 'Charcoal', hex: '#121216', use: 'Backgrounds' },
    { name: 'Deep navy', hex: '#0E1626', use: 'Backgrounds' },
    { name: 'Burnt orange', hex: '#E8752A', use: 'Milo’s hoodie, the accent' },
    { name: 'Warning red', hex: '#E23B3B', use: 'Danger moments' },
    { name: 'White', hex: '#FFFFFF', use: 'Text, with a thick black outline' },
  ],
  mood: 'The bad-habit half of a video is dark, cold and phone-lit. The after half turns warmer, with sunrise light. That shift is the story.',
  thumbnail: [
    '2 to 3 words, 4 at most, ending in a full stop or question mark: NO TIKTOK. · HOW BAD? · DAY 7.',
    'Words across the top, white with a thick black outline, slightly tilted. One word can be orange.',
    'Milo’s face big, one strong emotion: exhausted, shocked and guilty work best.',
    'One prop that says the topic at a glance: phone, vape, can, bottle, clock.',
    'Dark background so the white words and orange hoodie pop.',
    'The words add to the title, never repeat it.',
  ],
  titles: [
    'What 7 Days Without ___ Does to Your Brain',
    'Actually, How Bad Is ___?',
    'What ___ Is Really Doing to Your Body',
    '___ Is Quietly Ruining Your ___.',
    'Why You Can’t Stop ___.',
  ],
}

export const SERIES = [
  { name: '7 Days Without ___', items: 'TikTok, sugar, caffeine, YouTube, complaining, music in headphones' },
  { name: 'Actually, How Bad Is ___?', items: 'vaping, weed, alcohol, energy drinks, fast food, betting' },
  { name: 'What ___ Is Doing to Your Brain', items: 'doomscrolling, overthinking, gaming, porn, comparison' },
]

/** Everything the page shows, handed to it by the server only once the password is in (see lib/yt/gate.ts). */
export const PLAN = { STYLE_PREFIX, VOICE, VIDEOS, IDEAS, CHANNEL, NEXT_STEPS, RPM_ROWS, TIMELINE, EXTRA_MONEY, POSTING, RULES, TOOLS, WORKFLOW, MOTIONS, BRAND, SERIES }
export type Plan = typeof PLAN
