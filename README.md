# logoless

The link in bio for editors. Every person gets `logoless.io/<name>` (one character and up, punctuation anywhere): a full-screen page in black, white and grey with ten layouts, shader backgrounds, music, custom cursors and an enter screen, built in an editor at `/editor`.

Next.js 16 + Tailwind 4 + Framer Motion on Cloudflare Workers (OpenNext) with D1. Sign in with Google, Discord or email.

    pnpm install && pnpm dev

## Where things are
- `app/page.tsx`, `components/home/`: the parallax home page
- `app/[slug]/page.tsx`, `components/bio/`: a person's page (layouts, shaders, music, cursors)
- `app/editor`, `components/editor/`: the editor
- `lib/bio.ts` (the page format), `lib/bio-store.ts` (pages and counters, kept in the `settings` table: no migration)
- `auth.ts`, `components/auth/`: sign-in and sign-up
- `lib/discord/`, `app/api/discord/`: the Discord bot (links accounts, gives roles) and its sign-in flow; `DISCORD_SERVER_SETUP.md`
- `middleware.ts`: every other `*.logoless.io` address forwards to `logoless.io`
- `lib/legal.ts`: the legal text. Have counsel review and rewrite it for this product.

## Deploying
Pushes to `main` are built and deployed by Cloudflare Workers Builds. `pnpm run cf:build` runs the same build locally. `wrangler.jsonc` lists the addresses attached to the worker: `logoless.io` must stay in it.
