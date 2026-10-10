// Workaround for Next.js 16.4 on the OpenNext Cloudflare adapter (1.20.x).
//
// Next 16.4 reads `.next/server/preview-props.json` on every request, but the adapter's inlined manifest loader
// only knows a fixed list of files and throws "Unexpected loadManifest(...preview-props.json)" -> HTTP 500.
// This script runs right after the OpenNext build and teaches that loader about the file.
//
// It is safe to remove once @opennextjs/cloudflare handles this file itself. Run `pnpm cf:preview` without it
// to check: if pages load, delete this script and its call in package.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const handler = '.open-next/server-functions/default/handler.mjs'
const props = '.next/server/preview-props.json'

if (!existsSync(handler)) {
  console.error(`patch-open-next: ${handler} not found. Run the OpenNext build first.`)
  process.exit(1)
}
if (!existsSync(props)) {
  console.log('patch-open-next: no preview-props.json in this build, nothing to patch.')
  process.exit(0)
}

let code = readFileSync(handler, 'utf8')
if (code.includes('/* patched:preview-props */')) {
  console.log('patch-open-next: already patched.')
  process.exit(0)
}

const anchor = 'throw new Error(`Unexpected loadManifest(${path2}) call!`)'
if (!code.includes(anchor)) {
  console.log('patch-open-next: loader anchor not found. The adapter probably changed, so no patch is needed.')
  process.exit(0)
}

const json = JSON.stringify(JSON.parse(readFileSync(props, 'utf8')))
code = code.replace(anchor, `/* patched:preview-props */if(path2.endsWith("/server/preview-props.json"))return ${json};${anchor}`)
writeFileSync(handler, code)
console.log('patch-open-next: added preview-props.json to the manifest loader.')
