# Client links on their own address (name.logoless.io)

Every artist or client link (Owner dashboard > Run > Artist links) already works at `logoless.io/<name>`. With the
**Client links** feature switched on, the same link also works at `<name>.logoless.io`, and the client gets the full package:
their page, how to reach them, adding funds, a step-by-step first campaign, then a tour of their dashboard.

The code is ready (see `middleware.ts` and `lib/client-host.ts`). Cloudflare needs two things before the pretty address answers.
**`wrangler.jsonc` was deliberately not changed**: read step 2 before deploying.

## 1. A wildcard DNS record

Cloudflare dashboard > the **logoless.io** zone > **DNS** > **Records** > **Add record**:

| Field | Value |
| --- | --- |
| Type | `AAAA` |
| Name | `*` |
| IPv6 address | `100::` |
| Proxy status | **Proxied** (orange cloud) |

`100::` is Cloudflare's "nothing behind this, a Worker answers it" address. Records you already have (`dev`, `owner`, `admin`,
`scroll`, `verify` and its mail records, and so on) keep working: a wildcard only answers names that have no record of their own.
Before you add it, look down the DNS list for any other proxied name that points somewhere else: the route in step 2 would send
those to the site too.

Universal SSL already covers `*.logoless.io` (one level deep), so no certificate work is needed.

## 2. A Worker route for the wildcard

Custom domains (what `wrangler.jsonc` uses today) cannot be wildcards, so this one is a **route**.

**Important:** `wrangler deploy` treats the `routes` list in `wrangler.jsonc` as the complete set. A route added only in the
dashboard is removed by the next deploy, and leaving an address out of that list is what took logoless.io down before. So add
the route in `wrangler.jsonc`, **next to** the existing lines, never instead of them. The list should end up exactly like this:

```jsonc
  "routes": [
    { "pattern": "logoless.io", "custom_domain": true },
    { "pattern": "dev.logoless.io", "custom_domain": true },
    { "pattern": "admin.logoless.io", "custom_domain": true },
    { "pattern": "owner.logoless.io", "custom_domain": true },
    { "pattern": "scroll.logoless.io", "custom_domain": true },
    { "pattern": "*.logoless.io/*", "zone_name": "logoless.io" }
  ]
```

Only the last line is new. The five custom domains keep priority over the wildcard route, so dev, owner, admin and scroll (which only forwards to the main site) are
untouched. Deploy as usual, then check:

1. `https://logoless.io` still loads (the live site).
2. `https://dev.logoless.io` and `https://owner.logoless.io` still load.
3. Make a test link in Artist links, open `https://<that-name>.logoless.io`: it shows the client's welcome page.

(If you prefer the dashboard: Workers & Pages > **mainsite** > Settings > **Domains & Routes** > Add > **Route**, pattern
`*.logoless.io/*`, zone `logoless.io`. But it disappears on the next deploy unless the line above is also in `wrangler.jsonc`.)

## 3. Switch it on

The Features page (`owner.logoless.io/dev/features`) > push **Client links (name.logoless.io)**. Until it is pushed, `name.logoless.io` sends
visitors to `logoless.io/name`, and links behave exactly as before.

## On the dev site

`name.dev.logoless.io` needs a certificate two levels deep (Cloudflare's Advanced Certificate Manager, a paid add-on), so on the
dev site use `dev.logoless.io/<name>` instead: it runs the same client package. On a computer, `name.localhost:3000` works like
`name.logoless.io`.

## How it behaves

- `name.logoless.io/` shows that client's private page. The page itself decides what they see (welcome, sign-in, their set-up).
- The site's API answers on the client address too, so the set-up saves as they go. The sign-in cookie is shared across
  `*.logoless.io`, so being signed in on logoless.io counts there too.
- Every other page (sign-in, the dashboard, PayPal's return) opens on logoless.io, because Google and Discord only send people
  back to the main address. After signing in or paying they land back on their link at `logoless.io/<name>`.
- Names the site uses itself (www, dev, owner, admin, scroll, api, mail, verify, status and the reserved page names) are never
  treated as a client.
