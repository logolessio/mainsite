// Workaround for Next.js 16.4 on the OpenNext Cloudflare adapter (1.20.x).
//
// Next 16.4 reads `.next/server/preview-props.json` on every request, but the adapter's inlined manifest loader
// only knows a fixed list of files and throws "Unexpected loadManifest(...preview-props.json)" -> HTTP 500.
// This script runs right after the OpenNext build and teaches that loader about the file.
//
// It is safe to remove once @opennextjs/cloudflare handles this file itself. Run `pnpm cf:preview` without it
// to check: if pages load, delete this script and its call in package.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'


// ---------- the scheduled job (runs first: the patch below may end the script early) ----------
// OpenNext's worker only answers web requests. This adds a `scheduled` handler to it, so the cron in wrangler.jsonc can start the
// two-hourly look at submission views. It asks the site itself (through the self-reference binding) to run the check, with a code
// made from the site's secret and the current hour, so /api/cron/views cannot be started by anyone else.
function addScheduled() {
  const worker = '.open-next/worker.js'
  if (!existsSync(worker)) return
  let w = readFileSync(worker, 'utf8')
  if (w.includes('/* patched:scheduled */')) {
    console.log('patch-open-next: scheduled handler already added.')
  } else if (!w.includes('export default {\n    async fetch(')) {
    console.log('patch-open-next: worker entry not recognised, no scheduled handler added.')
  } else {
    const handler = `export default {
    /* patched:scheduled */
    async scheduled(event, env, ctx) {
        ctx.waitUntil((async () => {
            try {
                const enc = new TextEncoder();
                const key = await crypto.subtle.importKey("raw", enc.encode(String(env.AUTH_SECRET ?? "")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
                const sig = await crypto.subtle.sign("HMAC", key, enc.encode("cron:" + Math.floor(Date.now() / 3600000)));
                const code = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
                const req = new Request("https://logoless.io/api/cron/views", { method: "POST", headers: { "x-cron-key": code } });
                if (env.WORKER_SELF_REFERENCE) await env.WORKER_SELF_REFERENCE.fetch(req);
            } catch (e) {
                console.error("scheduled view check failed", e && e.message);
            }
        })());
    },
    async fetch(`
    w = w.replace('export default {\n    async fetch(', handler)
    writeFileSync(worker, w)
    console.log('patch-open-next: added the scheduled handler for the view check.')
  }
}
addScheduled()


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

