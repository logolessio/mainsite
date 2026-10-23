// The logo mark for Discord: two corner brackets with a short bar between them (the mark the owner supplied), a little thicker, filled with the logo's gradient.
//   node scripts/make-discord-logo.mjs
// Writes public/discord/server-icon.png (512 px: the server's icon and the bot's picture, the mark on near-black, drawn a little smaller so Discord's round crop never
// touches a corner) and public/discord/icons/logo.svg (the same mark as an icon source; `node scripts/make-discord-icons.mjs` turns it into the gradient icon).
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const pnpm = join(ROOT, 'node_modules', '.pnpm')
const sharp = require(join(pnpm, readdirSync(pnpm).find((d) => d.startsWith('sharp@')), 'node_modules', 'sharp'))

// the mark on a 32 unit square, measured off the supplied picture: its outer edges stay where they were, the strokes grow inwards
const T = 2.8 // stroke thickness; the supplied picture has 2
const rects = [
  { x: 4, y: 4, w: 19.5, h: T }, // top left bracket, across
  { x: 4, y: 4, w: T, h: 12 }, // top left bracket, down
  { x: 8.5, y: 28 - T, w: 19.5, h: T }, // bottom right bracket, along
  { x: 28 - T, y: 16, w: T, h: 12 }, // bottom right bracket, up
  { x: 16 - T / 2, y: 11, w: T, h: 10, r: 0.6 }, // the bar between them
]
const shapes = rects.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"${r.r ? ` rx="${r.r}"` : ''}/>`).join('')

const stops = [...readFileSync(join(ROOT, 'lib', 'logo-gradient.ts'), 'utf8').matchAll(/\[([\d.]+), '(#[0-9a-fA-F]{6})'\]/g)].map((m) => `<stop offset="${m[1]}" stop-color="${m[2]}"/>`).join('')

// 1) the icon source, on the 24 unit grid the other icons use (the mark fits inside, centred)
writeFileSync(
  join(ROOT, 'public', 'discord', 'icons', 'logo.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none"><g transform="translate(12 12) scale(0.75) translate(-16 -16)">${shapes}</g></svg>\n`,
)

// 2) the server icon and the bot's picture
const SCALE = 0.84
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 32 32"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="4" y1="4" x2="28" y2="28">${stops}</linearGradient></defs><rect width="32" height="32" fill="#08080b"/><g fill="url(#g)" transform="translate(16 16) scale(${SCALE}) translate(-16 -16)">${shapes}</g></svg>`
await sharp(Buffer.from(svg), { density: 96 }).resize(512, 512).png({ compressionLevel: 9 }).toFile(join(ROOT, 'public', 'discord', 'server-icon.png'))
console.log('server-icon.png and icons/logo.svg written')
